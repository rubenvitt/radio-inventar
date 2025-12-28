import { Controller, Post, Get, Body, Req, Res, Logger, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, ApiBody } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { Public } from '../../../common/decorators';
import { AUTH_ERROR_MESSAGES, AUTH_CONFIG } from '@radio-inventar/shared';
import { getSessionCookieOptions } from '../../../config/session.config';

/**
 * FIX M10: Helper function to check if running in test environment
 * Encapsulates the NODE_ENV check for better testability and cleaner code
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

@ApiTags('admin/auth')
// FIX M9: Include LoginDto in @ApiExtraModels for proper Swagger documentation
@ApiExtraModels(SessionResponseDto, LoginDto)
@Controller('admin/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  // Review #2: Use AUTH_CONFIG constants for testability
  // Note: ConfigService cannot be used in @Throttle decorator (compile-time vs runtime)
  // FIX M10: Extract environment check to helper function for cleaner code
  //
  // M3 SECURITY NOTE: Current rate-limiting is IP-based only
  // POST-MVP ENHANCEMENT: Add account-level lockout to prevent credential stuffing
  // Recommended implementation:
  //   - Track failed attempts per username in Redis/DB
  //   - Lock account after N failed attempts (e.g., 5-10)
  //   - Implement exponential backoff or CAPTCHA requirement
  //   - Add account unlock mechanism (time-based or admin intervention)
  // DECISION: Defer to Post-MVP - IP-based limiting is sufficient for single-admin MVP
  @Throttle({ default: { limit: isTestEnvironment() ? AUTH_CONFIG.RATE_LIMIT_TEST_ATTEMPTS : AUTH_CONFIG.RATE_LIMIT_ATTEMPTS, ttl: AUTH_CONFIG.RATE_LIMIT_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-Login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login erfolgreich', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Ungültige Zugangsdaten' })
  @ApiResponse({ status: 429, description: 'Zu viele Login-Versuche' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<SessionResponseDto> {
    this.logger.log('POST /api/admin/auth/login');

    const user = await this.authService.validateCredentials(dto.username, dto.password);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    await this.authService.createSession(req, user);

    return {
      username: user.username,
      isValid: true,
    };
  }

  @Post('logout')
  @SkipThrottle() // No rate limiting for logout - session-based, no brute-force risk
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-Logout' })
  @ApiResponse({ status: 200, description: 'Logout erfolgreich' })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    this.logger.log('POST /api/admin/auth/logout');

    await this.authService.destroySession(req);

    // Review #2 fix: clearCookie must use same options as cookie was set with
    res.clearCookie(AUTH_CONFIG.SESSION_COOKIE_NAME, getSessionCookieOptions());

    return { message: 'Logout erfolgreich' };
  }

  @Get('session')
  @SkipThrottle() // No rate limiting for session check - called frequently during navigation
  @ApiOperation({ summary: 'Session-Status prüfen' })
  @ApiResponse({ status: 200, description: 'Session gültig', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Session ungültig oder abgelaufen' })
  getSession(@Req() req: Request): SessionResponseDto {
    this.logger.log('GET /api/admin/auth/session');
    return this.authService.getSessionInfo(req);
  }
}
