// apps/frontend/src/api/setup.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSetupStatus, createFirstAdmin } from './setup';
import { apiClient, ApiError } from './client';
import { SETUP_ERROR_MESSAGES } from '@radio-inventar/shared';

// Mock the apiClient
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    statusText: string;
    constructor(status: number, statusText: string, message: string) {
      super(message);
      this.status = status;
      this.statusText = statusText;
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

describe('Setup API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('checkSetupStatus', () => {
    it('should return isSetupComplete: false when no admin exists', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { isSetupComplete: false },
      });

      const result = await checkSetupStatus();

      expect(result).toEqual({ isSetupComplete: false });
      expect(apiClient.get).toHaveBeenCalledWith('/api/setup/status');
    });

    it('should return isSetupComplete: true when admin exists', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { isSetupComplete: true },
      });

      const result = await checkSetupStatus();

      expect(result).toEqual({ isSetupComplete: true });
    });

    it('should return isSetupComplete: true on network error (fail-safe)', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await checkSetupStatus();

      // Should not block app on network failure
      expect(result).toEqual({ isSetupComplete: true });
    });

    it('should return isSetupComplete: true on invalid response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { invalid: 'response' },
      });

      const result = await checkSetupStatus();

      // Should assume complete on validation failure
      expect(result).toEqual({ isSetupComplete: true });
    });
  });

  describe('createFirstAdmin', () => {
    it('should create admin successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { username: 'admin', isValid: true },
      });

      const result = await createFirstAdmin('admin', 'password123');

      expect(result).toEqual({ username: 'admin', isValid: true });
      expect(apiClient.post).toHaveBeenCalledWith('/api/setup', {
        username: 'admin',
        password: 'password123',
      });
    });

    it('should throw error when admin already exists (403)', async () => {
      const mockError = new ApiError(403, 'Forbidden', 'Admin exists');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createFirstAdmin('admin', 'password123')).rejects.toThrow(
        SETUP_ERROR_MESSAGES.ALREADY_COMPLETE
      );
    });

    it('should throw error when admin already exists (409)', async () => {
      const mockError = new ApiError(409, 'Conflict', 'Admin exists');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createFirstAdmin('admin', 'password123')).rejects.toThrow(
        SETUP_ERROR_MESSAGES.ADMIN_EXISTS
      );
    });

    it('should throw error on rate limit (429)', async () => {
      const mockError = new ApiError(429, 'Too Many Requests', 'Rate limited');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createFirstAdmin('admin', 'password123')).rejects.toThrow(
        'Zu viele Versuche'
      );
    });

    it('should throw error on server error (500)', async () => {
      const mockError = new ApiError(500, 'Internal Server Error', 'Server error');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createFirstAdmin('admin', 'password123')).rejects.toThrow(
        'Serverfehler'
      );
    });

    it('should validate username before sending', async () => {
      await expect(createFirstAdmin('', 'password123')).rejects.toThrow(
        'Invalid username or password format'
      );

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should validate password before sending', async () => {
      await expect(createFirstAdmin('admin', '')).rejects.toThrow(
        'Invalid username or password format'
      );

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
