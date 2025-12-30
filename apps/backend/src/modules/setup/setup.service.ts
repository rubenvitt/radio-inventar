import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { SetupRepository } from './setup.repository';
import { AUTH_CONFIG, SETUP_ERROR_MESSAGES } from '@radio-inventar/shared';

/**
 * Helper to wrap session callback operations in Promise with typed exceptions.
 * Converts raw errors to NestJS InternalServerErrorException for consistent HTTP responses.
 */
function wrapSessionCallback(
  operation: (callback: (err?: Error | null) => void) => void,
  logger: Logger,
  errorMessage: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    operation((err) => {
      if (err) {
        logger.error(errorMessage, err);
        reject(new InternalServerErrorException(errorMessage));
      } else {
        resolve();
      }
    });
  });
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  /**
   * In-memory cache for setup completion status.
   * Null means not yet checked, boolean is the cached result.
   * This is reset on server restart, which is acceptable behavior.
   */
  private setupCompleteCache: boolean | null = null;

  constructor(private readonly setupRepository: SetupRepository) {}

  /**
   * Check if the first-time setup has been completed (admin exists).
   * Uses in-memory caching for performance.
   */
  async isSetupComplete(): Promise<boolean> {
    // Return cached value if available
    if (this.setupCompleteCache !== null) {
      return this.setupCompleteCache;
    }

    // Query database and cache result
    const exists = await this.setupRepository.adminExists();
    this.setupCompleteCache = exists;
    return exists;
  }

  /**
   * Create the first admin user.
   * Throws ConflictException if admin already exists.
   * Automatically creates session (auto-login) after creation.
   */
  async createFirstAdmin(
    username: string,
    password: string,
    request: Request,
  ): Promise<{ id: string; username: string }> {
    // Double-check that no admin exists (race condition prevention)
    const exists = await this.setupRepository.adminExists();
    if (exists) {
      throw new ConflictException(SETUP_ERROR_MESSAGES.ADMIN_EXISTS);
    }

    // Hash password with same cost factor as regular auth
    const passwordHash = await bcrypt.hash(password, AUTH_CONFIG.BCRYPT_ROUNDS);

    // Create admin in database
    const admin = await this.setupRepository.createAdmin(username, passwordHash);

    // Invalidate cache - setup is now complete
    this.setupCompleteCache = true;

    // Create session (auto-login) using same pattern as AuthService
    await this.createSession(request, { id: admin.id, username: admin.username });

    this.logger.log(`First admin user created: ${admin.username}`);

    return { id: admin.id, username: admin.username };
  }

  /**
   * Create session for the newly created admin (auto-login).
   * Follows same pattern as AuthService.createSession().
   */
  private async createSession(
    request: Request,
    user: { id: string; username: string },
  ): Promise<void> {
    // Session fixation prevention: regenerate session ID
    await wrapSessionCallback(
      (cb) => request.session.regenerate(cb),
      this.logger,
      'Session konnte nicht erstellt werden',
    );

    // Set session data
    request.session.userId = user.id;
    request.session.username = user.username;
    request.session.isAdmin = true;

    // Explicitly save session to ensure cookie is set in response
    await wrapSessionCallback(
      (cb) => request.session.save(cb),
      this.logger,
      'Session konnte nicht gespeichert werden',
    );
  }

  /**
   * Invalidate the setup cache (for testing purposes)
   */
  invalidateCache(): void {
    this.setupCompleteCache = null;
  }
}
