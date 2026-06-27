import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  RadioAdminLoanDeviceListSchema,
  type RadioAdminLoanDevice,
} from '@radio-inventar/shared';
import type { EnvConfig } from '../../config/env.config';

const DiscoverySchema = z.object({ token_endpoint: z.string().url() });
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

/** Refresh the access token this many ms before its stated expiry. */
const TOKEN_REFRESH_SKEW_MS = 60_000;
/** Default token lifetime assumed when the provider omits expires_in. */
const DEFAULT_TOKEN_TTL_SECONDS = 3600;
/**
 * After the device cache goes stale we still serve it for this long if
 * radio-admin is unreachable — loans/return/history stay operational on a brief
 * outage instead of hard-failing.
 */
const STALE_GRACE_MS = 5 * 60_000;

/**
 * Read-only client for radio-admin's loan API. Obtains a Pocket ID
 * client_credentials access token and fetches the loanable device list, with a
 * short in-memory TTL cache (+ stale-grace fallback). radio-admin is the master
 * for device data; radio-inventar never writes back.
 *
 * Mirrors the outbound-HTTP pattern of PocketIdService: native fetch, cached
 * discovery, Zod-validated responses, in-flight de-duplication.
 */
@Injectable()
export class RadioAdminService {
  private readonly logger = new Logger(RadioAdminService.name);

  private tokenEndpointPromise: Promise<string> | null = null;
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private tokenPromise: Promise<string> | null = null;
  private deviceCache: { devices: RadioAdminLoanDevice[]; fetchedAt: number } | null = null;
  private devicePromise: Promise<RadioAdminLoanDevice[]> | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  /** True when all radio-admin connection settings are configured. */
  isEnabled(): boolean {
    return Boolean(
      this.configService.get('RADIO_ADMIN_URL') &&
        this.configService.get('RADIO_ADMIN_ISSUER_URL') &&
        this.configService.get('RADIO_ADMIN_CLIENT_ID') &&
        this.configService.get('RADIO_ADMIN_CLIENT_SECRET'),
    );
  }

  /**
   * The current loanable devices from radio-admin. Served from cache within the
   * configured TTL; on a refresh failure a not-too-old cache is served (stale
   * grace) and only a missing/too-old cache surfaces a 503.
   */
  async fetchLoanableDevices(): Promise<RadioAdminLoanDevice[]> {
    // radio-admin is the only device source; without configuration there is
    // nothing to serve. Fail fast and clearly instead of attempting OIDC
    // discovery against an empty issuer URL.
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('radio-admin integration is not configured');
    }

    const ttl = this.configService.get('RADIO_ADMIN_CACHE_TTL_MS');
    const now = Date.now();

    if (this.deviceCache && now - this.deviceCache.fetchedAt < ttl) {
      return this.deviceCache.devices;
    }

    if (!this.devicePromise) {
      this.devicePromise = this.refreshDevices().finally(() => {
        this.devicePromise = null;
      });
    }

    try {
      return await this.devicePromise;
    } catch (error) {
      if (this.deviceCache && now - this.deviceCache.fetchedAt < ttl + STALE_GRACE_MS) {
        this.logger.warn('radio-admin unreachable; serving stale loan-device cache');
        return this.deviceCache.devices;
      }
      this.logger.error(
        'Failed to fetch loanable devices from radio-admin:',
        error instanceof Error ? error.message : error,
      );
      throw error instanceof ServiceUnavailableException
        ? error
        : new ServiceUnavailableException('radio-admin ist nicht erreichbar');
    }
  }

  /** Look up a single loanable device by its radio-admin id. */
  async getDeviceById(id: string): Promise<RadioAdminLoanDevice | null> {
    const devices = await this.fetchLoanableDevices();
    return devices.find((device) => device.id === id) ?? null;
  }

  private async refreshDevices(): Promise<RadioAdminLoanDevice[]> {
    const token = await this.getAccessToken();
    const base = this.configService.get('RADIO_ADMIN_URL');
    const url = new URL('api/v1/loan-devices', base.endsWith('/') ? base : `${base}/`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`radio-admin loan API returned ${response.status}`);
    }

    const parsed = RadioAdminLoanDeviceListSchema.safeParse(await response.json());
    if (!parsed.success) {
      this.logger.error('radio-admin loan API payload failed validation');
      throw new ServiceUnavailableException('radio-admin loan API payload is invalid');
    }

    this.deviceCache = { devices: parsed.data, fetchedAt: Date.now() };
    return parsed.data;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt - TOKEN_REFRESH_SKEW_MS > now) {
      return this.tokenCache.token;
    }
    if (!this.tokenPromise) {
      this.tokenPromise = this.requestToken().finally(() => {
        this.tokenPromise = null;
      });
    }
    return this.tokenPromise;
  }

  private async requestToken(): Promise<string> {
    const tokenEndpoint = await this.getTokenEndpoint();
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.configService.get('RADIO_ADMIN_CLIENT_ID'),
      client_secret: this.configService.get('RADIO_ADMIN_CLIENT_SECRET'),
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`token request failed with ${response.status}`);
    }

    const parsed = TokenResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ServiceUnavailableException('token response is invalid');
    }

    const ttlSeconds = parsed.data.expires_in ?? DEFAULT_TOKEN_TTL_SECONDS;
    this.tokenCache = {
      token: parsed.data.access_token,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    return parsed.data.access_token;
  }

  private getTokenEndpoint(): Promise<string> {
    if (!this.tokenEndpointPromise) {
      this.tokenEndpointPromise = this.discoverTokenEndpoint().catch((error: unknown) => {
        this.tokenEndpointPromise = null;
        throw error;
      });
    }
    return this.tokenEndpointPromise;
  }

  private async discoverTokenEndpoint(): Promise<string> {
    const issuer = this.configService.get('RADIO_ADMIN_ISSUER_URL');
    const discoveryUrl = new URL(
      '.well-known/openid-configuration',
      issuer.endsWith('/') ? issuer : `${issuer}/`,
    );

    const response = await fetch(discoveryUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new ServiceUnavailableException(`OIDC discovery failed with ${response.status}`);
    }

    const parsed = DiscoverySchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ServiceUnavailableException('OIDC discovery payload is invalid');
    }
    return parsed.data.token_endpoint;
  }
}
