import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBorrowerSuggestions } from './borrowers';
import type { ReactNode } from 'react';

// Mock apiClient
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from './client';

const mockApiGet = apiClient.get as ReturnType<typeof vi.fn>;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useBorrowerSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Enabling', () => {
    it('ist disabled bei query.length < 2', () => {
      const { result } = renderHook(() => useBorrowerSuggestions('T'), {
        wrapper: createWrapper(),
      });

      // Should not fetch - query is disabled when < 2 chars
      expect(mockApiGet).not.toHaveBeenCalled();
      // Data is undefined when query is disabled (not yet fetched)
      expect(result.current.data).toBeUndefined();
    });

    it('ist disabled bei leerem query', () => {
      const { result } = renderHook(() => useBorrowerSuggestions(''), {
        wrapper: createWrapper(),
      });

      expect(mockApiGet).not.toHaveBeenCalled();
      // Data is undefined when query is disabled
      expect(result.current.data).toBeUndefined();
    });

    it('fetcht bei query.length >= 2', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: [
          { name: 'Tim Mueller', lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      });

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/borrowers/suggestions?q=Ti&limit=10'
      );
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.name).toBe('Tim Mueller');
    });

    it('verwendet custom limit Parameter', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [] });

      renderHook(() => useBorrowerSuggestions('Ti', 5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/borrowers/suggestions?q=Ti&limit=5'
      );
    });

    it('validiert und begrenzt limit Parameter', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [] });

      renderHook(() => useBorrowerSuggestions('Ti', 100), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });

      // Should be capped at 50
      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/borrowers/suggestions?q=Ti&limit=50'
      );
    });

    it('verwendet default limit bei negativem Wert', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [] });

      renderHook(() => useBorrowerSuggestions('Ti', -5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });

      // Should use minimum of 1
      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/borrowers/suggestions?q=Ti&limit=1'
      );
    });
  });

  describe('Response Validation', () => {
    it('validiert Response mit Zod - gueltige Daten', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: [
          { name: 'Tim', lastUsed: '2025-12-15T10:00:00.000Z' },
          { name: 'Tom', lastUsed: '2025-12-14T09:00:00.000Z' },
        ],
      });

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it('wirft Error bei invalid Response - fehlende data wrapper', async () => {
      mockApiGet.mockResolvedValueOnce([
        { name: 'Tim', lastUsed: '2025-12-15T10:00:00.000Z' },
      ]);

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Invalid');
    });

    it('wirft Error bei invalid Response - falsches Datumsformat', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: [
          { name: 'Tim', lastUsed: 'not-a-date' },
        ],
      });

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('wirft Error bei invalid Response - fehlender name', async () => {
      mockApiGet.mockResolvedValueOnce({
        data: [
          { lastUsed: '2025-12-15T10:00:00.000Z' },
        ],
      });

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('wirft Error bei Network-Fehler', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBorrowerSuggestions('Ti'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Fehler beim Laden der Vorschläge');
    });
  });

  describe('URL Encoding', () => {
    it('encodiert Sonderzeichen im Query', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [] });

      renderHook(() => useBorrowerSuggestions('Tim & Co'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/borrowers/suggestions?q=Tim%20%26%20Co&limit=10'
      );
    });

    it('encodiert Umlaute im Query', async () => {
      mockApiGet.mockResolvedValueOnce({ data: [] });

      renderHook(() => useBorrowerSuggestions('Müller'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled();
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('M%C3%BCller')
      );
    });
  });

  describe('Caching', () => {
    it('verwendet staleTime von 30 Sekunden', async () => {
      mockApiGet.mockResolvedValue({
        data: [{ name: 'Tim', lastUsed: '2025-12-15T10:00:00.000Z' }],
      });

      const wrapper = createWrapper();

      // First render
      const { result: result1 } = renderHook(
        () => useBorrowerSuggestions('Ti'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // API should be called once
      expect(mockApiGet).toHaveBeenCalledTimes(1);

      // Re-render with same query - should use cached data
      const { result: result2 } = renderHook(
        () => useBorrowerSuggestions('Ti'),
        { wrapper }
      );

      // Should still be just one call (cached)
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toHaveLength(1);
    });
  });
});
