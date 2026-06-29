import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  RadioAdminLoanDeviceListSchema,
  RadioAdminActiveLoanListSchema,
  RadioAdminLoanRecordSchema,
  RadioAdminLoanHistorySchema,
  RadioAdminBorrowerSuggestionListSchema,
  type RadioAdminLoanDevice,
  type RadioAdminActiveLoan,
  type RadioAdminLoanRecord,
  type RadioAdminLoanHistory,
  type RadioAdminBorrowerSuggestion,
} from '@radio-inventar/shared';
import type { EnvConfig } from '../../config/env.config';

/**
 * A non-2xx response from a radio-admin loan endpoint, carrying the
 * machine-readable `{error}` code + HTTP status so the calling repository can
 * map it to the right NestJS HttpException (e.g. device_already_on_loan → 409).
 */
export class RadioAdminLoanError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'RadioAdminLoanError';
  }
}

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

  /** True when radio-admin is configured (api-token mode OR client_credentials). */
  isEnabled(): boolean {
    if (!this.configService.get('RADIO_ADMIN_URL')) return false;
    // Static api-token mode needs only the URL + token.
    if (this.configService.get('RADIO_ADMIN_API_TOKEN')) return true;
    // OAuth2 client_credentials mode needs the full Pocket ID trio.
    return Boolean(
      this.configService.get('RADIO_ADMIN_ISSUER_URL') &&
        this.configService.get('RADIO_ADMIN_CLIENT_ID') &&
        this.configService.get('RADIO_ADMIN_CLIENT_SECRET'),
    );
  }

  /**
   * Bearer auth header for S2S calls: a static api-token when configured, else
   * an OAuth2 client_credentials access token (Pocket ID, cached).
   */
  private async getAuthHeader(): Promise<string> {
    const apiToken = this.configService.get('RADIO_ADMIN_API_TOKEN');
    if (apiToken) return `Bearer ${apiToken}`;
    return `Bearer ${await this.getAccessToken()}`;
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
    const auth = await this.getAuthHeader();
    const base = this.configService.get('RADIO_ADMIN_URL');
    const url = new URL('api/v1/loan-devices', base.endsWith('/') ? base : `${base}/`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: auth },
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

  /**
   * Perform an authenticated S2S request to a radio-admin loan endpoint and
   * return the parsed JSON. On a non-2xx response the `{error}` code is surfaced
   * as a {@link RadioAdminLoanError} (with the HTTP status) so the caller can map
   * it to the right HttpException; an unreachable host becomes a 503.
   */
  private async loanRequest(method: string, path: string, body?: unknown): Promise<unknown> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('radio-admin integration is not configured');
    }
    const base = this.configService.get('RADIO_ADMIN_URL');
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    const auth = await this.getAuthHeader();

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: auth,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      this.logger.error(
        `radio-admin ${method} ${path} unreachable:`,
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException('radio-admin ist nicht erreichbar');
    }

    if (!response.ok) {
      // An upstream 5xx (radio-admin down behind a proxy, or an internal error)
      // is an outage from our side — surface it as 503, consistent with
      // refreshDevices, not as a generic 500. Only 4xx carry a machine-readable
      // {error} code that the caller maps to a specific HttpException.
      if (response.status >= 500) {
        this.logger.error(`radio-admin ${method} ${path} returned ${response.status}`);
        throw new ServiceUnavailableException('radio-admin ist nicht erreichbar');
      }
      const payload: unknown = await response.json().catch(() => null);
      const code =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : `http_${response.status}`;
      throw new RadioAdminLoanError(code, response.status);
    }

    return response.json();
  }

  private parse<T>(schema: z.ZodType<T>, json: unknown, what: string): T {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      this.logger.error(`radio-admin ${what} payload failed validation`);
      throw new ServiceUnavailableException(`radio-admin ${what} payload is invalid`);
    }
    return parsed.data;
  }

  /** POST /api/v1/loans — create a loan at the master. Throws RadioAdminLoanError on 4xx. */
  async createLoan(body: { deviceId: string; borrowerName: string }): Promise<RadioAdminLoanRecord> {
    const json = await this.loanRequest('POST', 'api/v1/loans', body);
    return this.parse(RadioAdminLoanRecordSchema, json, 'create-loan');
  }

  /** PATCH /api/v1/loans/:loanId — return a loan. Throws RadioAdminLoanError on 4xx. */
  async returnLoan(
    loanId: string,
    body: { returnNote: string | null },
  ): Promise<RadioAdminLoanRecord> {
    const json = await this.loanRequest(
      'PATCH',
      `api/v1/loans/${encodeURIComponent(loanId)}`,
      body,
    );
    return this.parse(RadioAdminLoanRecordSchema, json, 'return-loan');
  }

  /** GET /api/v1/active-loans — all active loans (un-paginated). */
  async fetchActiveLoans(): Promise<RadioAdminActiveLoan[]> {
    const json = await this.loanRequest('GET', 'api/v1/active-loans');
    return this.parse(RadioAdminActiveLoanListSchema, json, 'active-loans');
  }

  /** GET /api/v1/loans/history — paginated loan history (from/to are epoch-ms). */
  async fetchLoanHistory(params: {
    deviceId?: string;
    from?: number;
    to?: number;
    page?: number;
    pageSize?: number;
  }): Promise<RadioAdminLoanHistory> {
    const qs = new URLSearchParams();
    if (params.deviceId) qs.set('deviceId', params.deviceId);
    if (params.from !== undefined) qs.set('from', String(params.from));
    if (params.to !== undefined) qs.set('to', String(params.to));
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.pageSize !== undefined) qs.set('pageSize', String(params.pageSize));
    const json = await this.loanRequest('GET', `api/v1/loans/history?${qs.toString()}`);
    return this.parse(RadioAdminLoanHistorySchema, json, 'loan-history');
  }

  /** GET /api/v1/borrowers/suggestions — borrower-name autocomplete. */
  async fetchBorrowerSuggestions(
    q: string,
    limit: number,
  ): Promise<RadioAdminBorrowerSuggestion[]> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    const json = await this.loanRequest('GET', `api/v1/borrowers/suggestions?${qs.toString()}`);
    return this.parse(RadioAdminBorrowerSuggestionListSchema, json, 'borrower-suggestions');
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
