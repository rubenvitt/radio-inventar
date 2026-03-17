import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Req,
  Res,
  Query,
  Logger,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, ApiBody } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangeCredentialsDto } from './dto/change-credentials.dto';
import { ChangeCredentialsResponseDto } from './dto/change-credentials-response.dto';
import { AuthConfigResponseDto } from './dto/auth-config-response.dto';
import { Public, BypassApiToken } from '../../../common/decorators';
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
@ApiExtraModels(SessionResponseDto, LoginDto, ChangeCredentialsDto, ChangeCredentialsResponseDto, AuthConfigResponseDto)
@Controller('admin/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('config')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Admin-Authentifizierungsmodus abrufen' })
  @ApiResponse({ status: 200, description: 'Authentifizierungskonfiguration', type: AuthConfigResponseDto })
  getAuthConfig(): AuthConfigResponseDto {
    this.logger.log('GET /api/admin/auth/config');
    return this.authService.getAuthConfig();
  }

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
    this.authService.assertLocalAuthEnabled();

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

  @Get('pocket-id')
  @Public()
  @BypassApiToken()
  @SkipThrottle()
  @ApiOperation({ summary: 'Pocket-ID-Login starten' })
  @ApiResponse({ status: 302, description: 'Weiterleitung zu Pocket ID' })
  async startPocketIdLogin(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log('GET /api/admin/auth/pocket-id');
    const authorizationUrl = await this.authService.getPocketIdAuthorizationUrl(req);
    res.redirect(authorizationUrl);
  }

  @Get('callback')
  @Public()
  @BypassApiToken()
  @SkipThrottle()
  @ApiOperation({ summary: 'Pocket-ID-Callback verarbeiten' })
  @ApiResponse({ status: 302, description: 'Weiterleitung zurück zur Anwendung' })
  async handlePocketIdCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('GET /api/admin/auth/callback');

    try {
      await this.authService.completePocketIdLogin(req, { code, state, error });
      res.redirect(this.authService.getPocketIdSuccessRedirectUrl());
    } catch (callbackError) {
      this.logger.warn('Pocket ID callback failed');
      res.redirect(this.authService.getPocketIdFailureRedirectUrl(callbackError));
    }
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

  @Put('credentials')
  // Rate limit credential changes to prevent brute force attacks
  @Throttle({ default: { limit: isTestEnvironment() ? AUTH_CONFIG.RATE_LIMIT_TEST_ATTEMPTS : AUTH_CONFIG.RATE_LIMIT_ATTEMPTS, ttl: AUTH_CONFIG.RATE_LIMIT_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-Zugangsdaten ändern' })
  @ApiBody({ type: ChangeCredentialsDto })
  @ApiResponse({ status: 200, description: 'Zugangsdaten erfolgreich geändert', type: ChangeCredentialsResponseDto })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  @ApiResponse({ status: 401, description: 'Aktuelles Passwort falsch oder nicht authentifiziert' })
  @ApiResponse({ status: 409, description: 'Benutzername bereits vergeben' })
  @ApiResponse({ status: 429, description: 'Zu viele Versuche' })
  async changeCredentials(@Body() dto: ChangeCredentialsDto, @Req() req: Request): Promise<ChangeCredentialsResponseDto> {
    this.logger.log('PUT /api/admin/auth/credentials');
    this.authService.assertLocalAuthEnabled();
    return this.authService.changeCredentials(
      req,
      dto.currentPassword,
      dto.newUsername,
      dto.newPassword,
    );
  }
}
