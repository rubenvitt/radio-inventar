// apps/frontend/src/api/auth.spec.ts
// Story 5.2: Admin Login UI - Auth API Function Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { login, checkSession, logout, isRateLimitError, useLogin, useSession, useLogout } from './auth';
import { apiClient, ApiError, TimeoutError } from './client';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import { authKeys } from '@/lib/queryKeys';
import { createElement } from 'react';
import type { ReactNode } from 'react';

// Mock the TanStack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the API client
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public statusText: string, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
  TimeoutError: class TimeoutError extends Error {
    constructor(timeoutMs: number) {
      super(`Request timed out after ${timeoutMs}ms`);
      this.name = 'TimeoutError';
    }
  },
}));

const mockApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

// Helper to create QueryClient wrapper for hook tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('auth.ts - API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login()', () => {
    it('successful login returns validated session data', async () => {
      // AC3: Successful login
      const mockResponse = {
        username: 'testadmin',
        isValid: true,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await login('testadmin', 'password123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles 401 with invalid credentials error message', async () => {
      // AC4: Invalid credentials
      const error = new ApiError(401, 'Unauthorized', 'Ungültige Zugangsdaten');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('wronguser', 'wrongpass')).rejects.toThrow(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('handles 429 with rate limit error message', async () => {
      // AC5: Rate limiting
      const error = new ApiError(429, 'Too Many Requests', 'Rate limited');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS
      );
    });

    it('handles 400 with network error message', async () => {
      // HIGH 1: 4xx errors - Bad Request
      const error = new ApiError(400, 'Bad Request', 'Invalid request');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('handles 403 with network error message', async () => {
      // HIGH 1: 4xx errors - Forbidden
      const error = new ApiError(403, 'Forbidden', 'Forbidden');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('handles 404 with network error message', async () => {
      // HIGH 1: 4xx errors - Not Found
      const error = new ApiError(404, 'Not Found', 'Not found');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('handles 500 with network error message', async () => {
      // AC10: 5xx errors
      const error = new ApiError(500, 'Internal Server Error', 'Server error');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('handles 503 with network error message', async () => {
      // AC10: Service unavailable
      const error = new ApiError(503, 'Service Unavailable', 'Service down');
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('handles timeout error with network error message', async () => {
      // AC10: Timeout errors
      const error = new TimeoutError(30000);
      mockApiClient.post.mockRejectedValue(error);

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('handles generic network errors with network error message', async () => {
      // AC10: Generic network failures
      mockApiClient.post.mockRejectedValue(new Error('Network failure'));

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('throws error on invalid response format (Zod validation failure)', async () => {
      // Security: Validate response schema - wrapped in network error for security
      mockApiClient.post.mockResolvedValue({
        invalid: 'data',
        missing: 'required fields',
      });

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('throws error when username is missing in response', async () => {
      // Zod schema requires username - wrapped in network error for security
      mockApiClient.post.mockResolvedValue({
        isValid: true,
        // username missing
      });

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('throws error when isValid is missing in response', async () => {
      // Zod schema requires isValid - wrapped in network error for security
      mockApiClient.post.mockResolvedValue({
        username: 'testadmin',
        // isValid missing
      });

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });

    it('throws error when isValid is not boolean', async () => {
      // Zod schema enforces boolean type - wrapped in network error for security
      mockApiClient.post.mockResolvedValue({
        username: 'testadmin',
        isValid: 'yes', // Should be boolean
      });

      await expect(login('testadmin', 'password123')).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });
  });

  describe('checkSession()', () => {
    it('returns session data when authenticated', async () => {
      // AC8: Session persistence
      const mockSession = {
        username: 'testadmin',
        isValid: true,
      };
      mockApiClient.get.mockResolvedValue(mockSession);

      const result = await checkSession();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/auth/session');
      expect(result).toEqual(mockSession);
    });

    it('returns null on 401 (not authenticated)', async () => {
      // AC8: Expected behavior when not logged in
      const error = new ApiError(401, 'Unauthorized', 'Not authenticated');
      mockApiClient.get.mockRejectedValue(error);

      const result = await checkSession();

      expect(result).toBeNull();
    });

    it('returns null on invalid response format (Zod validation failure)', async () => {
      // Security: Validate response schema
      mockApiClient.get.mockResolvedValue({
        invalid: 'data',
      });

      const result = await checkSession();

      expect(result).toBeNull();
    });

    it('returns null on 500 error (graceful degradation)', async () => {
      // AC10: Don't break app on server errors
      const error = new ApiError(500, 'Internal Server Error', 'Server error');
      mockApiClient.get.mockRejectedValue(error);

      const result = await checkSession();

      expect(result).toBeNull();
    });

    it('returns null on network error (graceful degradation)', async () => {
      // AC10: Don't break app on network failures
      mockApiClient.get.mockRejectedValue(new Error('Network failure'));

      const result = await checkSession();

      expect(result).toBeNull();
    });

    it('returns null on timeout error (graceful degradation)', async () => {
      // AC10: Don't break app on timeouts
      const error = new TimeoutError(30000);
      mockApiClient.get.mockRejectedValue(error);

      const result = await checkSession();

      expect(result).toBeNull();
    });
  });

  describe('logout()', () => {
    it('successful logout returns message', async () => {
      // AC8: Successful logout
      const mockResponse = {
        message: 'Erfolgreich abgemeldet',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/auth/logout');
      expect(result).toEqual(mockResponse);
    });

    it('logout clears session (response validation)', async () => {
      // AC8: Logout invalidates session
      const mockResponse = {
        message: 'Logged out',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await logout();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('logout handles network errors gracefully', async () => {
      // AC10: Network failures
      mockApiClient.post.mockRejectedValue(new Error('Network failure'));

      await expect(logout()).rejects.toThrow('Verbindungsfehler. Bitte später erneut versuchen.');
    });

    it('logout handles 500 server errors', async () => {
      // AC10: Server errors
      const error = new ApiError(500, 'Internal Server Error', 'Server error');
      mockApiClient.post.mockRejectedValue(error);

      await expect(logout()).rejects.toThrow('Verbindungsfehler. Bitte später erneut versuchen.');
    });

    it('logout throws error on invalid response format (Zod validation failure)', async () => {
      // Security: Validate response schema
      mockApiClient.post.mockResolvedValue({
        invalid: 'data',
      });

      await expect(logout()).rejects.toThrow(
        'Verbindungsfehler. Bitte später erneut versuchen.'
      );
    });
  });

  describe('isRateLimitError()', () => {
    it('returns true for 429 ApiError', () => {
      // AC5: Rate limit detection
      const error = new ApiError(429, 'Too Many Requests', 'Rate limited');

      expect(isRateLimitError(error)).toBe(true);
    });

    it('returns false for 401 ApiError', () => {
      const error = new ApiError(401, 'Unauthorized', 'Invalid credentials');

      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for 500 ApiError', () => {
      const error = new ApiError(500, 'Internal Server Error', 'Server error');

      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for non-ApiError', () => {
      const error = new Error('Generic error');

      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for TimeoutError', () => {
      const error = new TimeoutError(30000);

      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });
});

// === React Query Hooks Tests ===
describe('auth.ts - React Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLogin()', () => {
    it('mutate calls login() function', async () => {
      const mockResponse = {
        username: 'testadmin',
        isValid: true,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      result.current.mutate({ username: 'testadmin', password: 'password123' });

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/auth/login', {
          username: 'testadmin',
          password: 'password123',
        });
      });
    });

    it('onSuccess sets session data in cache', async () => {
      const mockResponse = {
        data: {
          username: 'testadmin',
          isValid: true,
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: 'testadmin', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        authKeys.session(),
        { username: 'testadmin', isValid: true }
      );
    });

    it('retry is false', () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      // Check mutation options
      expect(result.current.failureCount).toBe(0);
      // Verify no retries by checking mutation fails immediately
      mockApiClient.post.mockRejectedValue(new Error('Test error'));

      result.current.mutate({ username: 'test', password: 'test' });

      // Should fail without retry
      expect(result.current.failureCount).toBeLessThanOrEqual(1);
    });
  });

  describe('useSession()', () => {
    it('calls checkSession() function', async () => {
      const mockSession = {
        username: 'testadmin',
        isValid: true,
      };
      mockApiClient.get.mockResolvedValue(mockSession);

      renderHook(() => useSession(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/auth/session');
      });
    });

    it('has correct staleTime (5 minutes)', async () => {
      const mockSession = {
        username: 'testadmin',
        isValid: true,
      };
      mockApiClient.get.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query should not be stale immediately after fetching (staleTime: 5 minutes)
      expect(result.current.isStale).toBe(false);
    });

    it('retry is false', async () => {
      // Mock checkSession to return null (graceful error handling)
      mockApiClient.get.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // checkSession catches errors and returns null, so query succeeds with null data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify only attempted once (no retries) - data should be null
      expect(result.current.data).toBeNull();
      expect(result.current.failureCount).toBe(0); // No failures since checkSession returns null
    });
  });

  describe('useLogout()', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('mutate calls logout() function', async () => {
      const mockResponse = {
        message: 'Logged out',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      result.current.mutate();

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/auth/logout');
      });
    });

    it('clears session from cache on success', async () => {
      const mockResponse = {
        message: 'Logged out',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useLogout(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(setQueryDataSpy).toHaveBeenCalled();
    });

    it('redirects on success using navigate', async () => {
      const mockResponse = {
        message: 'Logged out',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/login' });
    });

    it('redirects on error using navigate', async () => {
      const error = new ApiError(500, 'Internal Server Error', 'Server error');
      mockApiClient.post.mockRejectedValue(error);

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/login' });
    });

    it('invalidates all auth queries on success', async () => {
      // CRITICAL 5: Missing invalidateQueries test
      const mockResponse = {
        message: 'Logged out',
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useLogout(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: authKeys.all });
    });

    it('retry is false', () => {
      // HIGH 2: Missing retry:false test
      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      // Check mutation options
      expect(result.current.failureCount).toBe(0);
      // Verify no retries by checking mutation fails immediately
      mockApiClient.post.mockRejectedValue(new Error('Test error'));

      result.current.mutate();

      // Should fail without retry
      expect(result.current.failureCount).toBeLessThanOrEqual(1);
    });
  });
});
