import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { RadioAdminService } from './radio-admin.service';

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
});
