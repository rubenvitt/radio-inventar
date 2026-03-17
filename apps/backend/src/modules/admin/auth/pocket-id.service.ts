import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { z } from 'zod';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import type { EnvConfig } from '../../../config/env.config';

const PocketIdDiscoverySchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  userinfo_endpoint: z.string().url(),
});

const PocketIdTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
});

const PocketIdUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().min(1).optional(),
  preferred_username: z.string().min(1).optional(),
});

type PocketIdDiscovery = z.infer<typeof PocketIdDiscoverySchema>;
type PocketIdUserInfo = z.infer<typeof PocketIdUserInfoSchema>;

interface PocketIdCallbackParams {
  code: string | undefined;
  state: string | undefined;
  error: string | undefined;
}

function wrapSessionCallback(
  operation: (callback: (err?: Error | null) => void) => void,
  logger: Logger,
  errorMessage: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    operation((err) => {
      if (err) {
        logger.error(errorMessage, err);
        reject(new ServiceUnavailableException(errorMessage));
      } else {
        resolve();
      }
    });
  });
}

function createRandomToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

function createPkceChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

@Injectable()
export class PocketIdService {
  private readonly logger = new Logger(PocketIdService.name);
  private discoveryPromise: Promise<PocketIdDiscovery> | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  isEnabled(): boolean {
    return Boolean(
      this.configService.get('POCKET_ID_ISSUER_URL') &&
      this.configService.get('POCKET_ID_CLIENT_ID') &&
      this.configService.get('POCKET_ID_CLIENT_SECRET') &&
      this.configService.get('POCKET_ID_REDIRECT_URI'),
    );
  }

  async createAuthorizationUrl(request: Request): Promise<string> {
    this.ensureEnabled();

    const discovery = await this.getDiscovery();
    const state = createRandomToken(24);
    const codeVerifier = createRandomToken(48);

    request.session.oauthState = state;
    request.session.oauthCodeVerifier = codeVerifier;
    await this.saveSession(request);

    const authorizationUrl = new URL(discovery.authorization_endpoint);
    authorizationUrl.searchParams.set('client_id', this.configService.get('POCKET_ID_CLIENT_ID'));
    authorizationUrl.searchParams.set('redirect_uri', this.configService.get('POCKET_ID_REDIRECT_URI'));
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid profile email');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', createPkceChallenge(codeVerifier));
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return authorizationUrl.toString();
  }

  async authenticateCallback(
    request: Request,
    params: PocketIdCallbackParams,
  ): Promise<{ id: string; username: string }> {
    this.ensureEnabled();

    const expectedState = request.session?.oauthState;
    const codeVerifier = request.session?.oauthCodeVerifier;

    await this.clearPendingLoginState(request);

    if (
      params.error ||
      !params.code ||
      !params.state ||
      !expectedState ||
      !codeVerifier ||
      params.state !== expectedState
    ) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.POCKET_ID_LOGIN_FAILED);
    }

    const discovery = await this.getDiscovery();
    const tokens = await this.exchangeCodeForToken(discovery, params.code, codeVerifier);
    const userInfo = await this.fetchUserInfo(discovery, tokens.access_token);

    return {
      id: `pocketid:${userInfo.sub}`,
      username: this.getDisplayName(userInfo),
    };
  }

  private async getDiscovery(): Promise<PocketIdDiscovery> {
    if (!this.discoveryPromise) {
      this.discoveryPromise = this.fetchDiscovery().catch((error) => {
        this.discoveryPromise = null;
        throw error;
      });
    }

    return this.discoveryPromise;
  }

  private async fetchDiscovery(): Promise<PocketIdDiscovery> {
    const issuerUrl = this.configService.get('POCKET_ID_ISSUER_URL');
    const discoveryUrl = new URL('.well-known/openid-configuration', this.ensureTrailingSlash(issuerUrl));

    const response = await fetch(discoveryUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      this.logger.error(`Pocket ID discovery failed with status ${response.status}`);
      throw new ServiceUnavailableException(AUTH_ERROR_MESSAGES.POCKET_ID_NOT_CONFIGURED);
    }

    const discovery = PocketIdDiscoverySchema.safeParse(await response.json());
    if (!discovery.success) {
      this.logger.error('Pocket ID discovery payload is invalid');
      throw new ServiceUnavailableException(AUTH_ERROR_MESSAGES.POCKET_ID_NOT_CONFIGURED);
    }

    return discovery.data;
  }

  private async exchangeCodeForToken(
    discovery: PocketIdDiscovery,
    code: string,
    codeVerifier: string,
  ): Promise<z.infer<typeof PocketIdTokenResponseSchema>> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.configService.get('POCKET_ID_CLIENT_ID'),
      client_secret: this.configService.get('POCKET_ID_CLIENT_SECRET'),
      redirect_uri: this.configService.get('POCKET_ID_REDIRECT_URI'),
      code,
      code_verifier: codeVerifier,
    });

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      this.logger.warn(`Pocket ID token exchange failed with status ${response.status}`);
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.POCKET_ID_LOGIN_FAILED);
    }

    const tokenResponse = PocketIdTokenResponseSchema.safeParse(await response.json());
    if (!tokenResponse.success) {
      this.logger.error('Pocket ID token response is invalid');
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.POCKET_ID_LOGIN_FAILED);
    }

    return tokenResponse.data;
  }

  private async fetchUserInfo(
    discovery: PocketIdDiscovery,
    accessToken: string,
  ): Promise<PocketIdUserInfo> {
    const response = await fetch(discovery.userinfo_endpoint, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.warn(`Pocket ID userinfo request failed with status ${response.status}`);
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.POCKET_ID_LOGIN_FAILED);
    }

    const userInfo = PocketIdUserInfoSchema.safeParse(await response.json());
    if (!userInfo.success) {
      this.logger.error('Pocket ID userinfo payload is invalid');
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.POCKET_ID_LOGIN_FAILED);
    }

    return userInfo.data;
  }

  private getDisplayName(userInfo: PocketIdUserInfo): string {
    return (
      userInfo.preferred_username?.trim() ||
      userInfo.email?.trim() ||
      userInfo.name?.trim() ||
      userInfo.sub
    );
  }

  private ensureEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(AUTH_ERROR_MESSAGES.POCKET_ID_NOT_CONFIGURED);
    }
  }

  private ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private async saveSession(request: Request): Promise<void> {
    await wrapSessionCallback(
      (cb) => request.session.save(cb),
      this.logger,
      'OAuth-Loginzustand konnte nicht gespeichert werden',
    );
  }

  private async clearPendingLoginState(request: Request): Promise<void> {
    if (!request.session) {
      return;
    }

    delete request.session.oauthState;
    delete request.session.oauthCodeVerifier;
    await this.saveSession(request);
  }
}
