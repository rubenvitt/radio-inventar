// apps/frontend/src/routes/admin/AdminHistory.integration.spec.tsx
// Story 6.3: Admin Historie UI - Integration Tests (Task 12)
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { HistoryResponse } from '@radio-inventar/shared';

// Polyfill for Radix UI in test environment
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock apiClient at module level
const mockApiGet = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      message: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock useNavigate and useSearch
const mockNavigate = vi.fn();
let mockSearchState = {};
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchState,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sanitize
vi.mock('@/lib/sanitize', () => ({
  sanitizeForDisplay: (text: string | undefined) => text || '',
}));

// Import components after mocks
import { HistoryFilters } from '@/components/features/admin/HistoryFilters';
import { HistoryTable } from '@/components/features/admin/HistoryTable';
import { HistoryPagination } from '@/components/features/admin/HistoryPagination';
import { useAdminHistory, type HistoryQueryFilters } from '@/api/admin-history';

// Integration test component that simulates the full page
function HistoryPageIntegration() {
  const filters: HistoryQueryFilters = {
    page: (mockSearchState as { page?: number }).page || 1,
    pageSize: 100,
    deviceId: (mockSearchState as { deviceId?: string }).deviceId,
    from: (mockSearchState as { from?: string }).from,
    to: (mockSearchState as { to?: string }).to,
  };

  const { data, isLoading, error, isFetching, refetch } = useAdminHistory(filters);

  const handleFilterChange = (newFilters: Partial<HistoryQueryFilters>) => {
    mockNavigate({
      to: '/admin/history',
      search: { ...filters, ...newFilters, page: 1 },
    });
  };

  const handlePageChange = (page: number) => {
    mockNavigate({
      to: '/admin/history',
      search: { ...filters, page },
    });
  };

  if (isLoading) {
    return <div data-testid="loading">Lädt...</div>;
  }

  if (error) {
    return (
      <div data-testid="error">
        <p>Fehler beim Laden</p>
        <button type="button" onClick={() => refetch()}>Erneut versuchen</button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return <div data-testid="empty">Keine Einträge</div>;
  }

  return (
    <div data-testid="history-page">
      <HistoryFilters
        filters={filters}
        onChange={handleFilterChange}
      />
      <HistoryTable data={data.data} isFetching={isFetching} />
      <HistoryPagination
        meta={data.meta}
        onPageChange={handlePageChange}
        disabled={isFetching}
      />
    </div>
  );
}

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

// Mock data - using valid CUID-like IDs for Zod validation
const mockHistoryData: HistoryResponse = {
  data: [
    {
      id: 'clx1111111111111111111111111',
      device: {
        id: 'cly1111111111111111111111111',
        callSign: 'Florian 4-23',
        serialNumber: null,
        deviceType: 'Handfunkgerät',
        status: 'ON_LOAN',
      },
      borrowerName: 'Max Mustermann',
      borrowedAt: '2025-12-23T10:30:00.000Z',
      returnedAt: null,
      returnNote: null,
    },
    {
      id: 'clx2222222222222222222222222',
      device: {
        id: 'cly2222222222222222222222222',
        callSign: 'Florian 4-24',
        serialNumber: null,
        deviceType: 'Funkgerät',
        status: 'AVAILABLE',
      },
      borrowerName: 'Anna Schmidt',
      borrowedAt: '2025-12-22T14:00:00.000Z',
      returnedAt: '2025-12-23T08:00:00.000Z',
      returnNote: 'Alles in Ordnung',
    },
  ],
  meta: {
    total: 250,
    page: 1,
    pageSize: 100,
    totalPages: 3,
  },
};

const mockDevicesData = {
  data: [
    { id: 'cly1111111111111111111111111', callSign: 'Florian 4-23', deviceType: 'Handfunkgerät', status: 'ON_LOAN' },
    { id: 'cly2222222222222222222222222', callSign: 'Florian 4-24', deviceType: 'Funkgerät', status: 'AVAILABLE' },
    { id: 'cly3333333333333333333333333', callSign: 'Florian 4-25', deviceType: 'Radio', status: 'MAINTENANCE' },
  ],
};

describe('Admin History Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = {};
    // Default mock responses
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/api/admin/history/history')) {
        return Promise.resolve(mockHistoryData);
      }
      if (url.includes('/api/admin/devices')) {
        return Promise.resolve(mockDevicesData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // === Full Page Render Tests ===
  describe('Full Page Render', () => {
    it('should render all sections after loading', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('history-page')).toBeInTheDocument();
      });

      // Check table has data
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    it('should show history items in table', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
      });

      expect(screen.getByText('Florian 4-24')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    });

    it('should show active loan highlighting', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Find the badge (not the header)
        const ausgeliehenElements = screen.getAllByText('Ausgeliehen');
        const badge = ausgeliehenElements.find(el => el.tagName === 'SPAN');
        expect(badge).toBeInTheDocument();
      });

      // Find the badge (not the header)
      const zurueckElements = screen.getAllByText('Zurückgegeben');
      const badge = zurueckElements.find(el => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
    });
  });

  // === Filter Integration Tests ===
  describe('Filter Integration', () => {
    it('should show device filter dropdown', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/gerät/i)).toBeInTheDocument();
      });
    });

    it('should show date filter inputs', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/von/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bis/i)).toBeInTheDocument();
      });
    });

    it('should navigate with filters when device selected', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('combobox'));
      // Find the option in the dropdown (not the table cell)
      const options = screen.getAllByText('Florian 4-23');
      const dropdownOption = options.find(el => el.closest('[role="option"]'));
      if (dropdownOption) {
        await userEvent.click(dropdownOption);
      }

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ deviceId: 'cly1111111111111111111111111', page: 1 }),
      });
    });
  });

  // === Pagination Integration Tests ===
  describe('Pagination Integration', () => {
    it('should show pagination info', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/seite 1 von 3/i)).toBeInTheDocument();
      });
    });

    it('should navigate to next page when clicked', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nächste seite/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /nächste seite/i }));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ page: 2 }),
      });
    });

    it('should navigate to last page when clicked', async () => {
      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /letzte seite/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /letzte seite/i }));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ page: 3 }),
      });
    });
  });

  // === Error Handling Integration ===
  describe('Error Handling', () => {
    it('should show error state on API failure', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Network error'));

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Network error'));

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      });
    });
  });

  // === Empty State Integration ===
  describe('Empty State', () => {
    it('should show empty state when no history items', async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes('/api/admin/history/history')) {
          return Promise.resolve({
            data: [],
            meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
          });
        }
        if (url.includes('/api/admin/devices')) {
          return Promise.resolve(mockDevicesData);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('empty')).toBeInTheDocument();
      });
    });
  });

  // === Loading State Integration ===
  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockApiGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  // === Combined Filter Tests (AC4) ===
  describe('Combined Filter Tests', () => {
    it('should apply combined device + date filters', async () => {
      mockSearchState.deviceId = 'cly1111111111111111111111111';
      mockSearchState.from = '2025-12-01T00:00:00Z';
      mockSearchState.to = '2025-12-31T23:59:59Z';

      mockApiGet.mockImplementation((url: string) => {
        if (url.includes('/api/admin/history/history')) {
          // Verify all filters are in the URL
          expect(url).toContain('deviceId=cly1111111111111111111111111');
          expect(url).toContain('from=2025-12-01T00%3A00%3A00Z');
          expect(url).toContain('to=2025-12-31T23%3A59%3A59Z');
          return Promise.resolve(mockHistoryData);
        }
        if (url.includes('/api/admin/devices')) {
          return Promise.resolve(mockDevicesData);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('history-page')).toBeInTheDocument();
      });

      // Verify the API was called with all filters
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('deviceId=cly1111111111111111111111111')
      );
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('from=2025-12-01T00%3A00%3A00Z')
      );
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('to=2025-12-31T23%3A59%3A59Z')
      );
    });

    it('should handle all three filters together with pagination', async () => {
      mockSearchState.deviceId = 'cly2222222222222222222222222';
      mockSearchState.from = '2025-01-01T00:00:00Z';
      mockSearchState.to = '2025-06-30T23:59:59Z';
      mockSearchState.page = 2;

      mockApiGet.mockImplementation((url: string) => {
        if (url.includes('/api/admin/history/history')) {
          // Verify all filters plus pagination are in URL
          expect(url).toContain('deviceId=cly2222222222222222222222222');
          expect(url).toContain('from=2025-01-01T00%3A00%3A00Z');
          expect(url).toContain('to=2025-06-30T23%3A59%3A59Z');
          expect(url).toContain('page=2');
          return Promise.resolve(mockHistoryData);
        }
        if (url.includes('/api/admin/devices')) {
          return Promise.resolve(mockDevicesData);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('history-page')).toBeInTheDocument();
      });
    });

    it('should show filtered results when device and date range applied', async () => {
      const filteredData: HistoryResponse = {
        data: [
          {
            id: 'clx1111111111111111111111111',
            device: {
              id: 'cly1111111111111111111111111',
              callSign: 'Florian 4-23',
              serialNumber: null,
              deviceType: 'Handfunkgerät',
              status: 'ON_LOAN',
            },
            borrowerName: 'Max Mustermann',
            borrowedAt: '2025-12-23T10:30:00.000Z',
            returnedAt: null,
            returnNote: null,
          },
        ],
        meta: {
          total: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        },
      };

      mockSearchState.deviceId = 'cly1111111111111111111111111';
      mockSearchState.from = '2025-12-01T00:00:00Z';
      mockSearchState.to = '2025-12-31T23:59:59Z';

      mockApiGet.mockImplementation((url: string) => {
        if (url.includes('/api/admin/history/history')) {
          return Promise.resolve(filteredData);
        }
        if (url.includes('/api/admin/devices')) {
          return Promise.resolve(mockDevicesData);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<HistoryPageIntegration />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
      });

      // Should only show the filtered device
      expect(screen.queryByText('Florian 4-24')).not.toBeInTheDocument();
    });
  });
});
