import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { RadioAdminService, RadioAdminLoanError } from './radio-admin.service';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const baseConfig: Record<string, unknown> = {
  RADIO_ADMIN_URL: 'https://radio-admin.example',
  RADIO_ADMIN_ISSUER_URL: 'https://id.example',
  RADIO_ADMIN_CLIENT_ID: 'radio-inventar',
  RADIO_ADMIN_CLIENT_SECRET: 'secret',
  RADIO_ADMIN_CACHE_TTL_MS: 30000,
};

const discovery = { token_endpoint: 'https://id.example/api/oidc/token' };
const tokenResponse = { access_token: 'access-token-1', expires_in: 3600 };
const device = {
  id: 'we3hm7h7pio2ddufaockc09j',
  issi: '1001',
  opta: 'O-1',
  rufname: 'Florian 4-23',
  status: 'Einsatzbereit',
  location: 'Lager',
  deviceType: 'HRT',
  serialNumber: 'SN-1',
  hersteller: 'Sepura',
  bedieneinheit: null,
  funktion: null,
};

// radio-admin is the loan system of record; these are the wire shapes
// RadioAdminService returns (timestamps stay epoch-ms numbers here — the
// epoch-ms → Date conversion lives in the consuming repositories, not here).
const loanRecord = {
  id: 'loan-1',
  deviceId: device.id,
  snapshotCallSign: 'Florian 4-23',
  snapshotSerialNumber: 'SN-1',
  snapshotDeviceType: 'HRT',
  borrowerName: 'Max Mustermann',
  borrowedAt: 1_700_000_000_000,
  returnedAt: null,
  returnNote: null,
};

const activeLoan = {
  id: 'loan-1',
  deviceId: device.id,
  snapshotCallSign: 'Florian 4-23',
  snapshotDeviceType: 'HRT',
  borrowerName: 'Max Mustermann',
  borrowedAt: 1_700_000_000_000,
};

// Static api-token mode: only URL + token, no Pocket ID client_credentials.
const apiTokenConfig: Record<string, unknown> = {
  RADIO_ADMIN_URL: 'https://radio-admin.example',
  RADIO_ADMIN_API_TOKEN: 'static-api-token',
  RADIO_ADMIN_CACHE_TTL_MS: 30000,
};

function headerOf(init: unknown, name: string): string | undefined {
  return ((init as { headers: Record<string, string> }).headers ?? {})[name];
}

describe('RadioAdminService', () => {
  let service: RadioAdminService;
  let fetchMock: jest.Mock;
  let nowSpy: jest.SpyInstance;

  async function build(config: Record<string, unknown> = baseConfig) {
    const configService = { get: jest.fn((key: string) => config[key]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RadioAdminService, { provide: ConfigService, useValue: configService }],
    }).compile();
    return module.get<RadioAdminService>(RadioAdminService);
  }

  function mockFullFetch() {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(discovery))
      .mockResolvedValueOnce(jsonResponse(tokenResponse))
      .mockResolvedValueOnce(jsonResponse([device]));
  }

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    service = await build();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('isEnabled reflects whether all connection fields are set', async () => {
    expect(service.isEnabled()).toBe(true);
    const disabled = await build({ ...baseConfig, RADIO_ADMIN_URL: '' });
    expect(disabled.isEnabled()).toBe(false);
  });

  it('throws (without any HTTP) when the integration is not configured', async () => {
    const disabled = await build({ ...baseConfig, RADIO_ADMIN_URL: '' });
    await expect(disabled.fetchLoanableDevices()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches loanable devices via discovery + client_credentials token + loan API', async () => {
    mockFullFetch();
    const devices = await service.fetchLoanableDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe(device.id);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // The loan-devices request carries the bearer token.
    const [, devicesInit] = fetchMock.mock.calls[2];
    expect((devicesInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer access-token-1',
    );
  });

  it('serves the device cache within the TTL without new HTTP calls', async () => {
    mockFullFetch();
    await service.fetchLoanableDevices();
    const again = await service.fetchLoanableDevices();
    expect(again).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3); // no extra calls
  });

  it('getDeviceById returns the matching device or null', async () => {
    mockFullFetch();
    expect(await service.getDeviceById(device.id)).toMatchObject({ id: device.id });
    expect(await service.getDeviceById('does-not-exist')).toBeNull();
  });

  it('serves a stale cache when radio-admin becomes unreachable within the grace period', async () => {
    mockFullFetch();
    await service.fetchLoanableDevices();

    // Advance past the TTL but stay within the stale-grace window; token stays valid.
    nowSpy.mockReturnValue(1_000_000 + 30_000 + 1_000);
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const devices = await service.fetchLoanableDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe(device.id);
  });

  it('throws ServiceUnavailableException when unreachable and no cache exists', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(service.fetchLoanableDevices()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when the loan-devices payload is malformed', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(discovery))
      .mockResolvedValueOnce(jsonResponse(tokenResponse))
      .mockResolvedValueOnce(jsonResponse([{ issi: '1001' }])); // missing id etc.
    await expect(service.fetchLoanableDevices()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe('api-token auth mode', () => {
    it('isEnabled is true with only URL + RADIO_ADMIN_API_TOKEN', async () => {
      const tokenService = await build(apiTokenConfig);
      expect(tokenService.isEnabled()).toBe(true);
      // Removing the URL still disables it.
      const noUrl = await build({ ...apiTokenConfig, RADIO_ADMIN_URL: '' });
      expect(noUrl.isEnabled()).toBe(false);
    });

    it('sends Bearer <api-token> and performs no client_credentials token fetch', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse([])); // active-loans (empty)
      await tokenService.fetchActiveLoans();
      // Exactly one HTTP call: no OIDC discovery, no token request.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      expect(headerOf(init, 'Authorization')).toBe('Bearer static-api-token');
    });
  });

  describe('createLoan', () => {
    it('POSTs to /api/v1/loans with Bearer auth + JSON body and returns the parsed record', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse(loanRecord, 201));

      const result = await tokenService.createLoan({
        deviceId: device.id,
        borrowerName: 'Max Mustermann',
      });

      expect(result).toEqual(loanRecord);
      expect(result.returnedAt).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://radio-admin.example/api/v1/loans');
      expect(init.method).toBe('POST');
      expect(headerOf(init, 'Authorization')).toBe('Bearer static-api-token');
      expect(headerOf(init, 'Content-Type')).toBe('application/json');
      expect(JSON.parse(init.body as string)).toEqual({
        deviceId: device.id,
        borrowerName: 'Max Mustermann',
      });
    });

    it('obtains a client_credentials token first, then POSTs with that bearer', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(discovery))
        .mockResolvedValueOnce(jsonResponse(tokenResponse))
        .mockResolvedValueOnce(jsonResponse(loanRecord, 201));

      const result = await service.createLoan({
        deviceId: device.id,
        borrowerName: 'Max Mustermann',
      });

      expect(result).toEqual(loanRecord);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [url, init] = fetchMock.mock.calls[2];
      expect(String(url)).toBe('https://radio-admin.example/api/v1/loans');
      expect(init.method).toBe('POST');
      expect(headerOf(init, 'Authorization')).toBe('Bearer access-token-1');
    });

    it('throws RadioAdminLoanError (code + status) on a non-2xx response', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: 'device_already_on_loan' }, 409),
      );

      const error = await tokenService
        .createLoan({ deviceId: device.id, borrowerName: 'Max Mustermann' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(RadioAdminLoanError);
      expect((error as RadioAdminLoanError).code).toBe('device_already_on_loan');
      expect((error as RadioAdminLoanError).status).toBe(409);
    });

    it('throws ServiceUnavailableException when the loan record payload is malformed', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'loan-1' }, 201)); // missing fields
      await expect(
        tokenService.createLoan({ deviceId: device.id, borrowerName: 'Max Mustermann' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('returnLoan', () => {
    it('PATCHes /api/v1/loans/:loanId, sends the returnNote, and preserves returnedAt', async () => {
      const tokenService = await build(apiTokenConfig);
      const returned = {
        ...loanRecord,
        returnedAt: 1_700_000_100_000,
        returnNote: 'Alles ok',
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(returned, 200));

      const result = await tokenService.returnLoan('loan-1', { returnNote: 'Alles ok' });

      expect(result).toEqual(returned);
      expect(result.returnedAt).toBe(1_700_000_100_000);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://radio-admin.example/api/v1/loans/loan-1');
      expect(init.method).toBe('PATCH');
      expect(headerOf(init, 'Authorization')).toBe('Bearer static-api-token');
      expect(JSON.parse(init.body as string)).toEqual({ returnNote: 'Alles ok' });
    });

    it('throws RadioAdminLoanError (code + status) on a non-2xx response', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'loan_not_found' }, 404));

      const error = await tokenService
        .returnLoan('missing', { returnNote: null })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(RadioAdminLoanError);
      expect((error as RadioAdminLoanError).code).toBe('loan_not_found');
      expect((error as RadioAdminLoanError).status).toBe(404);
    });
  });

  describe('fetchActiveLoans', () => {
    it('GETs /api/v1/active-loans and returns the parsed (un-paginated) list', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse([activeLoan]));

      const result = await tokenService.fetchActiveLoans();

      expect(result).toEqual([activeLoan]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://radio-admin.example/api/v1/active-loans');
      expect(init.method).toBe('GET');
      expect(headerOf(init, 'Content-Type')).toBeUndefined();
    });

    it('throws ServiceUnavailableException when the payload is malformed', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'loan-1' }])); // missing fields
      await expect(tokenService.fetchActiveLoans()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('fetchLoanHistory', () => {
    it('GETs /api/v1/loans/history with the query params and returns the envelope', async () => {
      const tokenService = await build(apiTokenConfig);
      const history = { rows: [loanRecord], total: 1, page: 1, pageSize: 20 };
      fetchMock.mockResolvedValueOnce(jsonResponse(history));

      const result = await tokenService.fetchLoanHistory({
        deviceId: device.id,
        from: 1_690_000_000_000,
        to: 1_700_000_000_000,
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual(history);
      const [url, init] = fetchMock.mock.calls[0];
      const parsed = new URL(String(url));
      expect(parsed.pathname).toBe('/api/v1/loans/history');
      expect(parsed.searchParams.get('deviceId')).toBe(device.id);
      expect(parsed.searchParams.get('from')).toBe('1690000000000');
      expect(parsed.searchParams.get('to')).toBe('1700000000000');
      expect(parsed.searchParams.get('page')).toBe('1');
      expect(parsed.searchParams.get('pageSize')).toBe('20');
      expect(init.method).toBe('GET');
    });

    it('throws ServiceUnavailableException when the payload is malformed', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse({ rows: [], total: 'nope' })); // total not int
      await expect(tokenService.fetchLoanHistory({})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('fetchBorrowerSuggestions', () => {
    it('GETs /api/v1/borrowers/suggestions with q + limit and returns the list', async () => {
      const tokenService = await build(apiTokenConfig);
      const suggestions = [{ name: 'Max Mustermann', lastUsed: 1_700_000_000_000 }];
      fetchMock.mockResolvedValueOnce(jsonResponse(suggestions));

      const result = await tokenService.fetchBorrowerSuggestions('max', 5);

      expect(result).toEqual(suggestions);
      const [url, init] = fetchMock.mock.calls[0];
      const parsed = new URL(String(url));
      expect(parsed.pathname).toBe('/api/v1/borrowers/suggestions');
      expect(parsed.searchParams.get('q')).toBe('max');
      expect(parsed.searchParams.get('limit')).toBe('5');
      expect(init.method).toBe('GET');
    });

    it('throws ServiceUnavailableException when the payload is malformed', async () => {
      const tokenService = await build(apiTokenConfig);
      fetchMock.mockResolvedValueOnce(jsonResponse([{ name: 'Max' }])); // missing lastUsed
      await expect(tokenService.fetchBorrowerSuggestions('max', 5)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
