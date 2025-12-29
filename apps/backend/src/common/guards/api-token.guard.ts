import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BYPASS_API_TOKEN_KEY } from '../decorators/bypass-api-token.decorator';
import { API_TOKEN_ERROR_MESSAGES } from '@radio-inventar/shared';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  private readonly apiToken: string;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.apiToken = this.configService.get<string>('API_TOKEN')!;
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route bypasses API token validation
    const bypassApiToken = this.reflector.getAllAndOverride<boolean>(
      BYPASS_API_TOKEN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (bypassApiToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(API_TOKEN_ERROR_MESSAGES.MISSING_TOKEN);
    }

    // Support "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Constant-time comparison to prevent timing attacks
    if (!this.constantTimeCompare(token, this.apiToken)) {
      throw new UnauthorizedException(API_TOKEN_ERROR_MESSAGES.INVALID_TOKEN);
    }

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
