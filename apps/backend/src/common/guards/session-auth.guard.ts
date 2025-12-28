import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.session?.userId;
    const isAdmin = request.session?.isAdmin;

    // Explicit validation: userId must be a non-empty string and isAdmin must be true
    // This prevents empty string bypass attacks (e.g., userId = '')
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || !isAdmin) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    return true;
  }
}
