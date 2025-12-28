import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMyLoans, useReturnDevice, type ActiveLoan } from './loans';

// Mock the apiClient module
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
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

// Wrapper for hooks
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMyLoans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLoans = [
    {
      id: 'clh8u82zq0004r6j10wxy7k05',
      deviceId: 'clh8u82zq0000r6j10wxy7k01',
      borrowerName: 'Max Mustermann',
      borrowedAt: '2025-12-19T10:00:00Z',
      device: {
        id: 'clh8u82zq0000r6j10wxy7k01',
        callSign: 'RADIO-001',
        status: 'ON_LOAN',
      },
    },
    {
      id: 'clh8u82zq0005r6j10wxy7k06',
      deviceId: 'clh8u82zq0001r6j10wxy7k02',
      borrowerName: 'Erika Musterfrau',
      borrowedAt: '2025-12-19T11:00:00Z',
      device: {
        id: 'clh8u82zq0001r6j10wxy7k02',
        callSign: 'RADIO-002',
        status: 'ON_LOAN',
      },
    },
    {
      id: 'clh8u82zq0006r6j10wxy7k07',
      deviceId: 'clh8u82zq0002r6j10wxy7k03',
      borrowerName: 'max weber',
      borrowedAt: '2025-12-19T12:00:00Z',
      device: {
        id: 'clh8u82zq0002r6j10wxy7k03',
        callSign: 'RADIO-003',
        status: 'ON_LOAN',
      },
    },
  ];

  it('returns empty array when borrowerName is empty', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('returns empty array when borrowerName is only whitespace', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('   '), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('returns empty array when borrowerName is only 1 character (AC#1: ab 2 Zeichen)', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('M'), {
      wrapper: createWrapper(),
    });

    // Should return empty because MIN_FILTER_LENGTH is 2
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('filters loans case-insensitively', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('MAX'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]?.borrowerName).toBe('Max Mustermann');
      expect(result.current.data[1]?.borrowerName).toBe('max weber');
    });
  });

  it('handles partial name matches', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('Muster'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]?.borrowerName).toBe('Max Mustermann');
      expect(result.current.data[1]?.borrowerName).toBe('Erika Musterfrau');
    });
  });

  it('returns empty array when no matches found', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('Nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('returns empty array when allLoans is undefined (loading state)', async () => {
    // Let the query remain in loading state by not resolving
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApiClient.get.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useMyLoans('Max'), {
      wrapper: createWrapper(),
    });

    // While loading, data should be empty array
    expect(result.current.data).toEqual([]);

    // Cleanup
    resolvePromise!({ data: mockLoans });
    await waitFor(() => expect(result.current.data.length).toBeGreaterThan(0));
  });

  it('trims borrowerName before filtering', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('  Max  '), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]?.borrowerName).toBe('Max Mustermann');
      expect(result.current.data[1]?.borrowerName).toBe('max weber');
    });
  });

  it('preserves query state from useActiveLoans', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApiClient.get.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useMyLoans('Max'), {
      wrapper: createWrapper(),
    });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!({ data: mockLoans });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
  });

  it('handles exact name match', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('Erika Musterfrau'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0]?.borrowerName).toBe('Erika Musterfrau');
    });
  });

  it('is case-insensitive for entire name', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: mockLoans });

    const { result } = renderHook(() => useMyLoans('erika musterfrau'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0]?.borrowerName).toBe('Erika Musterfrau');
    });
  });
});

describe('useReturnDevice', () => {
  // Create a persistent QueryClient instance for optimistic update tests
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const mockLoans = [
    {
      id: 'loan-001',
      deviceId: 'device-001',
      borrowerName: 'Max Mustermann',
      borrowedAt: '2025-12-19T10:00:00Z',
      device: {
        id: 'device-001',
        callSign: 'RADIO-001',
        status: 'ON_LOAN' as const,
      },
    },
    {
      id: 'loan-002',
      deviceId: 'device-002',
      borrowerName: 'Erika Musterfrau',
      borrowedAt: '2025-12-19T11:00:00Z',
      device: {
        id: 'device-002',
        callSign: 'RADIO-002',
        status: 'ON_LOAN' as const,
      },
    },
  ];

  // Wrapper that uses the persistent queryClient
  function createPersistentWrapper() {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('calls PATCH /api/loans/:loanId with returnNote (AC#4)', async () => {
    const mockResponse = {
      data: {
        id: 'loan-001',
        deviceId: 'device-001',
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-19T10:00:00Z',
        returnedAt: '2025-12-19T12:00:00Z',
        returnNote: 'Akku schwach',
        device: {
          id: 'device-001',
          callSign: 'RADIO-001',
          status: 'AVAILABLE' as const,
        },
      },
    };
    mockApiClient.patch.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    act(() => {
      result.current.mutate({ loanId: 'loan-001', returnNote: 'Akku schwach' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/loans/loan-001', { returnNote: 'Akku schwach' });
  });

  it('calls PATCH /api/loans/:loanId without body when no returnNote (AC#3)', async () => {
    const mockResponse = {
      data: {
        id: 'loan-001',
        deviceId: 'device-001',
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-19T10:00:00Z',
        returnedAt: '2025-12-19T12:00:00Z',
        returnNote: null,
        device: {
          id: 'device-001',
          callSign: 'RADIO-001',
          status: 'AVAILABLE' as const,
        },
      },
    };
    mockApiClient.patch.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    act(() => {
      result.current.mutate({ loanId: 'loan-001' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/loans/loan-001', {});
  });

  it('performs optimistic update - removes loan from cache (AC#5)', async () => {
    // Pre-populate cache with active loans
    queryClient.setQueryData(['loans', 'active'], mockLoans);
    const mockResponse = {
      data: {
        id: 'loan-001',
        deviceId: 'device-001',
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-19T10:00:00Z',
        returnedAt: '2025-12-19T12:00:00Z',
        returnNote: null,
        device: {
          id: 'device-001',
          callSign: 'RADIO-001',
          status: 'AVAILABLE' as const,
        },
      },
    };
    mockApiClient.patch.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    await act(async () => {
      result.current.mutate({ loanId: 'loan-001' });
      // Wait for the optimistic update to be applied
      await vi.waitFor(() => {
        const cachedLoans = queryClient.getQueryData(['loans', 'active']) as ActiveLoan[];
        expect(cachedLoans.find(l => l.id === 'loan-001')).toBeUndefined();
      });
    });
  });

  it('rolls back on error (AC#6)', async () => {
    // Pre-populate cache
    queryClient.setQueryData(['loans', 'active'], mockLoans);
    mockApiClient.patch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    act(() => {
      result.current.mutate({ loanId: 'loan-001' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back
    const cachedLoans = queryClient.getQueryData(['loans', 'active']) as ActiveLoan[];
    expect(cachedLoans.find(l => l.id === 'loan-001')).toBeDefined();
  });

  it('invalidates loan and device queries on success', async () => {
    queryClient.setQueryData(['loans', 'active'], mockLoans);
    const mockResponse = {
      data: {
        id: 'loan-001',
        deviceId: 'device-001',
        borrowerName: 'Max Mustermann',
        borrowedAt: '2025-12-19T10:00:00Z',
        returnedAt: '2025-12-19T12:00:00Z',
        returnNote: null,
        device: {
          id: 'device-001',
          callSign: 'RADIO-001',
          status: 'AVAILABLE' as const,
        },
      },
    };
    mockApiClient.patch.mockResolvedValueOnce(mockResponse);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    act(() => {
      result.current.mutate({ loanId: 'loan-001' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should invalidate both loan and device queries
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['loans', 'active'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['devices', 'list'] });
  });

  it('invalidates queries even on error (onSettled)', async () => {
    queryClient.setQueryData(['loans', 'active'], mockLoans);
    mockApiClient.patch.mockRejectedValueOnce(new Error('Server error'));
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReturnDevice(), {
      wrapper: createPersistentWrapper(),
    });

    act(() => {
      result.current.mutate({ loanId: 'loan-001' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // onSettled runs even on error - should still invalidate queries
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['loans', 'active'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['devices', 'list'] });
  });
});
