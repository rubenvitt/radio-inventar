import { Injectable, Logger, UnauthorizedException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangeCredentialsResponseDto } from './dto/change-credentials-response.dto';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';

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

  async createSessionFromPocketId(request: Request, user: { id: string; username: string }): Promise<void> {
    await wrapSessionCallback(
      (cb) => request.session.regenerate(cb),
      this.logger,
      'Session konnte nicht erstellt werden',
    );

    request.session.userId = user.id;
    request.session.username = user.username;
    request.session.isAdmin = true;
    delete request.session.pocketIdState;
    delete request.session.postLoginRedirect;

    await wrapSessionCallback(
      (cb) => request.session.save(cb),
      this.logger,
      'Session konnte nicht gespeichert werden',
    );
  }

  async saveSession(request: Request): Promise<void> {
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
    _currentPassword: string,
    _newUsername?: string,
    _newPassword?: string,
  ): Promise<ChangeCredentialsResponseDto> {
    if (!request.session?.userId) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    throw new BadRequestException('Zugangsdaten werden über Pocket ID verwaltet.');
  }
}
