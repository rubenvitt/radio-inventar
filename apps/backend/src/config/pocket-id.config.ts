import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PocketIdOpenIdConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

@Injectable()
export class PocketIdConfigService {
  constructor(private readonly configService: ConfigService) {}

  get issuerUrl(): string {
    return this.configService.get<string>('POCKET_ID_ISSUER_URL', 'http://localhost:1411');
  }

  get clientId(): string {
    return this.configService.get<string>('POCKET_ID_CLIENT_ID', 'radio-inventar');
  }

  get clientSecret(): string {
    return this.configService.get<string>('POCKET_ID_CLIENT_SECRET', 'change-me');
  }

  get callbackUrl(): string {
    return this.configService.get<string>('POCKET_ID_CALLBACK_URL', 'http://localhost:3000/api/admin/auth/pocketid/callback');
  }

  get scope(): string {
    return this.configService.get<string>('POCKET_ID_SCOPE', 'openid profile email');
  }

  get publicAppUrl(): string {
    return this.configService.get<string>('PUBLIC_APP_URL', 'http://localhost:5173');
  }

  buildFrontendRedirect(returnTo: string): string {
    const safePath = returnTo.startsWith('/') ? returnTo : '/admin';
    return new URL(safePath, this.publicAppUrl).toString();
  }

  async getOpenIdConfiguration(): Promise<PocketIdOpenIdConfiguration> {
    const response = await fetch(`${this.issuerUrl}/.well-known/openid-configuration`);
    if (!response.ok) {
      throw new Error('Pocket ID OpenID-Konfiguration konnte nicht geladen werden');
    }

    const config = await response.json() as Partial<PocketIdOpenIdConfiguration>;

    if (!config.authorization_endpoint || !config.token_endpoint || !config.userinfo_endpoint) {
      throw new Error('Pocket ID OpenID-Konfiguration ist unvollständig');
    }

    return {
      authorization_endpoint: config.authorization_endpoint,
      token_endpoint: config.token_endpoint,
      userinfo_endpoint: config.userinfo_endpoint,
    };
  }
}
