import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { AuthRepository } from './auth.repository';
import { SessionResponseDto } from './dto/session-response.dto';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';

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
    this.logger.log('Creating session for user: ' + user.username);

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

    this.logger.log('Session regenerated, setting data...');

    // Only set session data after successful regeneration
    // This ensures session state is consistent - either fully created or error thrown
    request.session.userId = user.id;
    request.session.username = user.username;
    request.session.isAdmin = true;

    this.logger.log('Session data set, saving...');

    // Explicitly save session to ensure cookie is set in response
    await wrapSessionCallback(
      (cb) => request.session.save(cb),
      this.logger,
      'Session konnte nicht gespeichert werden',
    );

    this.logger.log('Session saved successfully');
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
}
