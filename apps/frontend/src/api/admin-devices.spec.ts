// apps/frontend/src/api/admin-devices.spec.ts
// Read-only admin device API tests (create/update/delete were removed —
// devices are managed in radio-admin).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import {
  fetchAdminDevices,
  useAdminDevices,
  type AdminDevice,
} from './admin-devices';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public statusText: string, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const mockApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
};

const device: AdminDevice = {
  id: 'we3hm7h7pio2ddufaockc09j',
  callSign: 'Florian 4-21',
  serialNumber: 'SN-001',
  deviceType: 'Handheld',
  status: 'AVAILABLE',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchAdminDevices', () => {
  it('returns the validated device list', async () => {
    mockApiClient.get.mockResolvedValue({ data: [device] });
    const result = await fetchAdminDevices();
    expect(result).toEqual([device]);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/devices');
  });

  it('appends filters to the query string', async () => {
    mockApiClient.get.mockResolvedValue({ data: [] });
    await fetchAdminDevices({ status: 'DEFECT', take: 10, skip: 5 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/devices?status=DEFECT&take=10&skip=5');
  });

  it('accepts a device with a null deviceType / serialNumber', async () => {
    mockApiClient.get.mockResolvedValue({ data: [{ ...device, serialNumber: null, deviceType: null }] });
    const result = await fetchAdminDevices();
    expect(result[0].deviceType).toBeNull();
  });

  it('throws on an invalid response format', async () => {
    mockApiClient.get.mockResolvedValue({ data: [{ id: 'x' }] });
    await expect(fetchAdminDevices()).rejects.toThrow(/Invalid response format/);
  });
});

describe('useAdminDevices', () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return createElement(QueryClientProvider, { client }, children);
  }

  it('fetches the device list', async () => {
    mockApiClient.get.mockResolvedValue({ data: [device] });
    const { result } = renderHook(() => useAdminDevices(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([device]);
  });
});
