import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PocketIdService } from './pocket-id.service';

function createJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as any;
}

describe('PocketIdService', () => {
  let service: PocketIdService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  const baseConfig = {
    POCKET_ID_ISSUER_URL: 'https://auth.example.com',
    POCKET_ID_CLIENT_ID: 'radio-inventar',
    POCKET_ID_CLIENT_SECRET: 'super-secret',
    POCKET_ID_REDIRECT_URI: 'https://api.example.com/api/admin/auth/callback',
  } as const;

  const discoveryResponse = {
    issuer: 'https://auth.example.com',
    authorization_endpoint: 'https://auth.example.com/authorize',
    token_endpoint: 'https://auth.example.com/token',
    userinfo_endpoint: 'https://auth.example.com/userinfo',
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    configService = {
      get: jest.fn((key: keyof typeof baseConfig) => baseConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PocketIdService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PocketIdService>(PocketIdService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates an authorization URL and stores state + PKCE verifier in the session', async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse(discoveryResponse));

    const request = {
      session: {
        save: jest.fn((cb) => cb(null)),
      },
    } as any;

    const result = await service.createAuthorizationUrl(request);
    const url = new URL(result);

    expect(url.origin + url.pathname).toBe('https://auth.example.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('radio-inventar');
    expect(url.searchParams.get('redirect_uri')).toBe(baseConfig.POCKET_ID_REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe('openid profile email');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(request.session.oauthState).toBeTruthy();
    expect(request.session.oauthCodeVerifier).toBeTruthy();
    expect(request.session.save).toHaveBeenCalledTimes(1);
  });

  it('authenticates a callback after a successful Pocket ID login', async () => {
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(discoveryResponse))
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token-123', token_type: 'Bearer' }))
      .mockResolvedValueOnce(
        createJsonResponse({
          sub: 'user-123',
          email: 'admin@example.com',
          email_verified: true,
        }),
      );

    const request = {
      session: {
        oauthState: 'expected-state',
        oauthCodeVerifier: 'expected-verifier',
        save: jest.fn((cb) => cb(null)),
      },
    } as any;

    const result = await service.authenticateCallback(request, {
      code: 'auth-code',
      state: 'expected-state',
      error: undefined,
    });

    expect(result).toEqual({
      id: 'pocketid:user-123',
      username: 'admin@example.com',
    });
    expect(request.session.oauthState).toBeUndefined();
    expect(request.session.oauthCodeVerifier).toBeUndefined();
  });

  it('rejects callbacks with an invalid state', async () => {
    const request = {
      session: {
        oauthState: 'expected-state',
        oauthCodeVerifier: 'expected-verifier',
        save: jest.fn((cb) => cb(null)),
      },
    } as any;

    await expect(
      service.authenticateCallback(request, {
        code: 'auth-code',
        state: 'different-state',
        error: undefined,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects callbacks when Pocket ID returns an OAuth error', async () => {
    const request = {
      session: {
        oauthState: 'expected-state',
        oauthCodeVerifier: 'expected-verifier',
        save: jest.fn((cb) => cb(null)),
      },
    } as any;

    await expect(
      service.authenticateCallback(request, {
        code: undefined,
        state: 'expected-state',
        error: 'access_denied',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects malformed userinfo payloads', async () => {
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(discoveryResponse))
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token-123', token_type: 'Bearer' }))
      .mockResolvedValueOnce(
        createJsonResponse({
          sub: '',
        }),
      );

    const request = {
      session: {
        oauthState: 'expected-state',
        oauthCodeVerifier: 'expected-verifier',
        save: jest.fn((cb) => cb(null)),
      },
    } as any;

    await expect(
      service.authenticateCallback(request, {
        code: 'auth-code',
        state: 'expected-state',
        error: undefined,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when Pocket ID is not configured', async () => {
    configService.get.mockImplementation(() => '');

    await expect(service.createAuthorizationUrl({ session: {} } as any)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
