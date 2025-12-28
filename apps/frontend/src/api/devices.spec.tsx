import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDevices } from './devices';
import type { DeviceStatus } from '@radio-inventar/shared';

// Mock the apiClient module
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from './client';
const mockApiClient = vi.mocked(apiClient);

// Create fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

// Wrapper for hooks with persistent QueryClient for refetch tests
function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Valid CUID2 format IDs for testing (required by Zod validation)
// CUID2: 24 chars, lowercase alphanumeric
const TEST_IDS = {
  device1: 'clh8u82zq0000r6j10wxy7k01',
  device2: 'clh8u82zq0001r6j10wxy7k02',
  device3: 'clh8u82zq0002r6j10wxy7k03',
  device4: 'clh8u82zq0003r6j10wxy7k04',
  loan1: 'clh8u82zq0004r6j10wxy7k05',
};

// Helper to create mock device
function createMockDevice(overrides: {
  id: string;
  callSign: string;
  status: DeviceStatus;
}) {
  return {
    id: overrides.id,
    callSign: overrides.callSign,
    status: overrides.status,
    serialNumber: 'SN001',
    deviceType: 'Handheld',
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

describe('useDevices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and combines devices with loans', async () => {
    const mockDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'AVAILABLE' }),
      createMockDevice({ id: TEST_IDS.device2, callSign: 'F4-22', status: 'ON_LOAN' }),
    ];

    const mockLoans = [
      {
        id: TEST_IDS.loan1,
        deviceId: TEST_IDS.device2,
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-16T10:00:00Z',
        device: { id: TEST_IDS.device2, callSign: 'F4-22', status: 'ON_LOAN' },
      },
    ];

    mockApiClient.get
      .mockResolvedValueOnce({ data: mockDevices })
      .mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(2);

    const availableDevice = result.current.data?.[0];
    expect(availableDevice?.id).toBe(TEST_IDS.device1);
    expect(availableDevice?.borrowerName).toBeUndefined();

    const loanedDevice = result.current.data?.[1];
    expect(loanedDevice?.id).toBe(TEST_IDS.device2);
    expect(loanedDevice?.borrowerName).toBe('Max Mustermann');
    expect(loanedDevice?.borrowedAt).toEqual(new Date('2025-12-16T10:00:00Z'));
  });

  it('sorts devices by status priority (AVAILABLE first)', async () => {
    const mockDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'MAINTENANCE' }),
      createMockDevice({ id: TEST_IDS.device2, callSign: 'F4-22', status: 'AVAILABLE' }),
      createMockDevice({ id: TEST_IDS.device3, callSign: 'F4-23', status: 'DEFECT' }),
      createMockDevice({ id: TEST_IDS.device4, callSign: 'F4-24', status: 'ON_LOAN' }),
    ];

    mockApiClient.get
      .mockResolvedValueOnce({ data: mockDevices })
      .mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(4);
    expect(result.current.data?.[0]?.status).toBe('AVAILABLE');
    expect(result.current.data?.[1]?.status).toBe('ON_LOAN');
    expect(result.current.data?.[2]?.status).toBe('DEFECT');
    expect(result.current.data?.[3]?.status).toBe('MAINTENANCE');
  });

  it('handles loading state', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it('handles error state', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('returns undefined borrowerName for devices without loans', async () => {
    const mockDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'AVAILABLE' }),
      createMockDevice({ id: TEST_IDS.device2, callSign: 'F4-22', status: 'DEFECT' }),
    ];

    mockApiClient.get
      .mockResolvedValueOnce({ data: mockDevices })
      .mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    result.current.data?.forEach(device => {
      expect(device.borrowerName).toBeUndefined();
      expect(device.borrowedAt).toBeUndefined();
    });
  });

  it('refetch() triggers new API calls and updates data', async () => {
    const initialDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'AVAILABLE' }),
    ];

    const updatedDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'ON_LOAN' }),
    ];

    const updatedLoans = [
      {
        id: TEST_IDS.loan1,
        deviceId: TEST_IDS.device1,
        borrowerName: 'New Borrower',
        borrowedAt: '2025-12-16T15:00:00Z',
        device: { id: TEST_IDS.device1, callSign: 'F4-21', status: 'ON_LOAN' },
      },
    ];

    // Initial fetch
    mockApiClient.get
      .mockResolvedValueOnce({ data: initialDevices })
      .mockResolvedValueOnce({ data: [] });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.status).toBe('AVAILABLE');
    expect(result.current.data?.[0]?.borrowerName).toBeUndefined();

    // Setup mocks for refetch
    mockApiClient.get
      .mockResolvedValueOnce({ data: updatedDevices })
      .mockResolvedValueOnce({ data: updatedLoans });

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data?.[0]?.status).toBe('ON_LOAN');
    });

    expect(result.current.data?.[0]?.borrowerName).toBe('New Borrower');
    expect(mockApiClient.get).toHaveBeenCalledTimes(4); // 2 initial + 2 refetch
  });

  it('handles partial failure gracefully (loans fail but devices succeed)', async () => {
    const mockDevices = [
      createMockDevice({ id: TEST_IDS.device1, callSign: 'F4-21', status: 'AVAILABLE' }),
    ];

    // Devices succeed, loans fail
    mockApiClient.get
      .mockResolvedValueOnce({ data: mockDevices })
      .mockRejectedValueOnce(new Error('Loans API failed'));

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should still have device data without loan info
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe(TEST_IDS.device1);
    expect(result.current.data?.[0]?.borrowerName).toBeUndefined();
  });
});
