import { Controller, Post, Put, Get, Body, Req, Res, Logger, UnauthorizedException, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels, ApiBody } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthService } from './auth.service';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangeCredentialsDto } from './dto/change-credentials.dto';
import { ChangeCredentialsResponseDto } from './dto/change-credentials-response.dto';
import { Public } from '../../../common/decorators';
import { AUTH_ERROR_MESSAGES, AUTH_CONFIG } from '@radio-inventar/shared';
import { getSessionCookieOptions } from '../../../config/session.config';
import { PocketIdConfigService } from '../../../config/pocket-id.config';

@ApiTags('admin/auth')
@ApiExtraModels(SessionResponseDto, ChangeCredentialsDto, ChangeCredentialsResponseDto)
@Controller('admin/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly pocketIdConfig: PocketIdConfigService,
  ) {}

  private sanitizeReturnTo(returnTo?: string): string {
    if (!returnTo) {
      return '/admin';
    }

    return returnTo.startsWith('/') ? returnTo : '/admin';
  }

  @Get('pocketid/login')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Weiterleitung zu Pocket ID Login' })
  @ApiResponse({ status: 302, description: 'Weiterleitung zu Pocket ID' })
  async pocketIdLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Query('returnTo') returnTo?: string,
  ): Promise<void> {
    this.logger.log('GET /api/admin/auth/pocketid/login');

    const oidcConfig = await this.pocketIdConfig.getOpenIdConfiguration();
    const state = randomUUID();

    req.session.pocketIdState = state;
    req.session.postLoginRedirect = this.sanitizeReturnTo(returnTo);
    await this.authService.saveSession(req);

    const authUrl = new URL(oidcConfig.authorization_endpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.pocketIdConfig.clientId);
    authUrl.searchParams.set('redirect_uri', this.pocketIdConfig.callbackUrl);
    authUrl.searchParams.set('scope', this.pocketIdConfig.scope);
    authUrl.searchParams.set('state', state);

    res.redirect(authUrl.toString());
  }

  @Get('pocketid/callback')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Pocket ID Callback' })
  @ApiResponse({ status: 302, description: 'Login abgeschlossen, Weiterleitung zurück ins Frontend' })
  async pocketIdCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ): Promise<void> {
    this.logger.log('GET /api/admin/auth/pocketid/callback');

    if (!code || !state || state !== req.session.pocketIdState) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const returnTo = this.sanitizeReturnTo(req.session.postLoginRedirect);

    const oidcConfig = await this.pocketIdConfig.getOpenIdConfiguration();

    const tokenResponse = await fetch(oidcConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.pocketIdConfig.callbackUrl,
        client_id: this.pocketIdConfig.clientId,
        client_secret: this.pocketIdConfig.clientSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const userInfoResponse = await fetch(oidcConfig.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const userInfo = await userInfoResponse.json() as {
      sub?: string;
      preferred_username?: string;
      name?: string;
      email?: string;
    };

    const userId = userInfo.sub;
    const username = userInfo.preferred_username || userInfo.name || userInfo.email || userInfo.sub;
    if (!userId || !username) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    await this.authService.createSessionFromPocketId(req, { id: userId, username });

    res.redirect(this.pocketIdConfig.buildFrontendRedirect(returnTo));
  }

  @Post('logout')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-Logout' })
  @ApiResponse({ status: 200, description: 'Logout erfolgreich' })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    this.logger.log('POST /api/admin/auth/logout');

    await this.authService.destroySession(req);
    res.clearCookie(AUTH_CONFIG.SESSION_COOKIE_NAME, getSessionCookieOptions());

    return { message: 'Logout erfolgreich' };
  }

  @Get('session')
  @SkipThrottle()
  @ApiOperation({ summary: 'Session-Status prüfen' })
  @ApiResponse({ status: 200, description: 'Session gültig', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Session ungültig oder abgelaufen' })
  getSession(@Req() req: Request): SessionResponseDto {
    this.logger.log('GET /api/admin/auth/session');
    return this.authService.getSessionInfo(req);
  }

  @Put('credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-Zugangsdaten ändern' })
  @ApiBody({ type: ChangeCredentialsDto })
  @ApiResponse({ status: 200, description: 'Zugangsdaten erfolgreich geändert', type: ChangeCredentialsResponseDto })
  async changeCredentials(@Body() dto: ChangeCredentialsDto, @Req() req: Request): Promise<ChangeCredentialsResponseDto> {
    this.logger.log('PUT /api/admin/auth/credentials');
    return this.authService.changeCredentials(req, dto.currentPassword, dto.newUsername, dto.newPassword);
  }
}
