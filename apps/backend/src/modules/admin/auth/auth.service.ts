import { Injectable, Logger, UnauthorizedException, InternalServerErrorException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { AuthRepository } from './auth.repository';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangeCredentialsResponseDto } from './dto/change-credentials-response.dto';
import { AUTH_ERROR_MESSAGES, AUTH_CONFIG } from '@radio-inventar/shared';

// Dummy hash for timing-attack prevention when user not found
// Generated with bcrypt.hash('dummy', 12) - same cost factor as real passwords
//
// M2 SECURITY NOTE: Static DUMMY_HASH is acceptable for MVP single-admin scenario
// RISK: Static hash is theoretically fingerprint-able across deployments
// MITIGATION: Low risk in single-admin context with rate-limiting
// POST-MVP ENHANCEMENT: Generate DUMMY_HASH dynamically at startup:
//   - Use bcrypt.hash() in module initialization
//   - Store in class property or global variable
//   - Prevents cross-deployment fingerprinting
// DECISION: Defer to Post-MVP due to minimal risk in current threat model
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X7AOamcZ6aMZqZ7YS';

/**
 * Helper to wrap session callback operations in Promise with typed exceptions (Review #2).
 * Converts raw errors to NestJS InternalServerErrorException for consistent HTTP responses.
 *
 * FIX H2: Improved type safety with function overloads
 * - When callback expects a result (T), returns Promise<T>
 * - When callback has no result (void), returns Promise<void>
 * This prevents the ambiguous Promise<T | void> type.
 *
 * Edge case documentation: The void overload handles session.regenerate() and session.destroy()
 * which don't return values but only signal completion via callback.
 */
function wrapSessionCallback<T>(
  operation: (callback: (err?: Error | null, result?: T) => void) => void,
  logger: Logger,
  errorMessage: string,
): Promise<T>;
function wrapSessionCallback(
  operation: (callback: (err?: Error | null) => void) => void,
  logger: Logger,
  errorMessage: string,
): Promise<void>;
function wrapSessionCallback<T>(
  operation: (callback: (err?: Error | null, result?: T) => void) => void,
  logger: Logger,
  errorMessage: string,
): Promise<T | void> {
  return new Promise((resolve, reject) => {
    operation((err, result) => {
      if (err) {
        logger.error(errorMessage, err);
        reject(new InternalServerErrorException(errorMessage));
      } else {
        resolve(result);
      }
    });
  });
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authRepository: AuthRepository) {}

  async validateCredentials(username: string, password: string): Promise<{ id: string; username: string } | null> {
    const admin = await this.authRepository.findByUsername(username);

    // Timing-attack prevention: always perform bcrypt.compare even if user not found
    // This ensures consistent response time regardless of whether username exists
    const hashToCompare = admin?.passwordHash ?? DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    // Only return user if both exist AND password is valid
    if (!admin || !isValid) {
      return null;
    }

    return { id: admin.id, username: admin.username };
  }

  async createSession(request: Request, user: { id: string; username: string }): Promise<void> {
    // Session fixation prevention: regenerate session ID after login
    // This prevents attackers from using a pre-set session ID
    // FIX H3: Explicit error handling for session regeneration
    // If regenerate() fails, wrapSessionCallback throws InternalServerErrorException
    // which prevents session data from being set on a potentially corrupted session.
    // The error is logged via wrapSessionCallback and propagated to controller.
    await wrapSessionCallback(
      (cb) => request.session.regenerate(cb),
      this.logger,
      'Session konnte nicht erstellt werden',
    );

    // Only set session data after successful regeneration
    // This ensures session state is consistent - either fully created or error thrown
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

  async destroySession(request: Request): Promise<void> {
    await wrapSessionCallback(
      (cb) => request.session.destroy(cb),
      this.logger,
      'Session konnte nicht beendet werden',
    );
  }

  getSessionInfo(request: Request): SessionResponseDto {
    if (!request.session?.userId || !request.session?.isAdmin) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    return {
      username: request.session.username || '',
      isValid: true,
    };
  }

  async changeCredentials(
    request: Request,
    currentPassword: string,
    newUsername?: string,
    newPassword?: string,
  ): Promise<ChangeCredentialsResponseDto> {
    const userId = request.session?.userId;
    if (!userId) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    // Validate that at least one change is requested
    if (!newUsername && !newPassword) {
      throw new BadRequestException(AUTH_ERROR_MESSAGES.NO_CHANGES);
    }

    // Fetch current admin user
    const admin = await this.authRepository.findById(userId);
    if (!admin) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.CURRENT_PASSWORD_WRONG);
    }

    // Check if new username is already taken (if username is being changed)
    if (newUsername && newUsername !== admin.username) {
      const isTaken = await this.authRepository.isUsernameTaken(newUsername, userId);
      if (isTaken) {
        throw new ConflictException(AUTH_ERROR_MESSAGES.USERNAME_TAKEN);
      }
    }

    // Prepare update data
    const updateData: { username?: string; passwordHash?: string } = {};

    if (newUsername && newUsername !== admin.username) {
      updateData.username = newUsername;
    }

    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, AUTH_CONFIG.BCRYPT_ROUNDS);
    }

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return {
        message: AUTH_ERROR_MESSAGES.CREDENTIALS_UPDATED,
        username: admin.username,
      };
    }

    // Update credentials
    const updatedAdmin = await this.authRepository.updateCredentials(userId, updateData);

    // Update session with new username if it changed
    if (updateData.username) {
      request.session.username = updatedAdmin.username;
      await wrapSessionCallback(
        (cb) => request.session.save(cb),
        this.logger,
        'Session konnte nicht gespeichert werden',
      );
    }

    this.logger.log(`Admin credentials updated for user ${updatedAdmin.username}`);

    return {
      message: AUTH_ERROR_MESSAGES.CREDENTIALS_UPDATED,
      username: updatedAdmin.username,
    };
  }
}
