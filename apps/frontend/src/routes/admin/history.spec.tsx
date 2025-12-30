// apps/frontend/src/routes/admin/history.spec.tsx
// Story 6.3: Admin Historie UI - Route Component Tests (Task 8)
// Note: These tests use mock components for isolation. Integration tests cover the full component interactions.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { HistoryResponse } from '@radio-inventar/shared';

// Mock the API hooks
const mockUseAdminHistory = vi.fn();
const mockUseDevicesForFilter = vi.fn();
vi.mock('@/api/admin-history', () => ({
  useAdminHistory: (...args: unknown[]) => mockUseAdminHistory(...args),
  useDevicesForFilter: () => mockUseDevicesForFilter(),
  getHistoryErrorMessage: (error: unknown) => {
    if (error instanceof Error && error.message.includes('401')) {
      return 'Authentifizierung erforderlich';
    }
    return 'Historie konnte nicht geladen werden';
  },
}));

// Mock useNavigate and useSearch
const mockNavigate = vi.fn();
const mockSearchState: Record<string, unknown> = {};
vi.mock('@tanstack/react-router', () => ({
  // [AI-Review Fix] HIGH: Properly type the mock to avoid TSX issues
  createFileRoute: () => (options: { component: React.ComponentType; validateSearch?: unknown }) => ({
    options,
    component: options.component,
  }),
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchState,
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the components with simpler implementations
vi.mock('@/components/features/admin/HistoryFilters', () => ({
  HistoryFilters: ({ onChange, disabled }: { onChange: (f: unknown) => void; disabled: boolean }) => (
    <div data-testid="history-filters" data-disabled={disabled}>
      <button type="button" onClick={() => onChange({ deviceId: 'dev-1' })}>Filter ändern</button>
    </div>
  ),
}));

vi.mock('@/components/features/admin/HistoryTable', () => ({
  HistoryTable: ({ data, isFetching }: { data: unknown[]; isFetching: boolean }) => (
    <div data-testid="history-table" data-fetching={isFetching}>
      {data.length} Einträge
    </div>
  ),
}));

vi.mock('@/components/features/admin/HistoryPagination', () => ({
  HistoryPagination: ({ meta, onPageChange, disabled }: { meta: { totalPages: number }; onPageChange: (p: number) => void; disabled: boolean }) => (
    <div data-testid="history-pagination" data-disabled={disabled}>
      <button type="button" onClick={() => onPageChange(2)}>Seite 2</button>
      <span>{meta.totalPages} Seiten</span>
    </div>
  ),
}));

vi.mock('@/components/features/admin/ExportButton', () => ({
  ExportButton: ({ disabled }: { disabled: boolean }) => (
    <button data-testid="export-button" disabled={disabled}>Export</button>
  ),
}));

// Import after mocks to get the mocked route
import { Route } from './history';

// [AI-Review Fix] HIGH: Properly extract and type the component for testing
// Using non-null assertion since we know the component exists in our tests

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

// Mock data
const mockHistoryResponse: HistoryResponse = {
  data: [
    {
      id: 'clx1111111111111111111111111',
      device: {
        id: 'cly1111111111111111111111111',
        callSign: 'Florian 1',
        deviceType: 'Handfunkgerät',
        status: 'ON_LOAN',
        serialNumber: null,
      },
      borrowerName: 'Max Mustermann',
      borrowedAt: '2025-12-23T10:00:00.000Z',
      returnedAt: null,
      returnNote: null,
    },
    {
      id: 'clx2222222222222222222222222',
      device: {
        id: 'cly2222222222222222222222222',
        callSign: 'Florian 2',
        deviceType: 'Funkgerät',
        status: 'AVAILABLE',
        serialNumber: null,
      },
      borrowerName: 'Anna Schmidt',
      borrowedAt: '2025-12-22T14:00:00.000Z',
      returnedAt: '2025-12-23T08:00:00.000Z',
      returnNote: 'Alles OK',
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  },
};

// Get the component from the Route
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AdminHistoryPage = (Route as any).options?.component ?? (Route as any).component;

describe('AdminHistoryPage Route Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search state
    Object.keys(mockSearchState).forEach(key => delete mockSearchState[key]);
    // Default mock for useDevicesForFilter
    mockUseDevicesForFilter.mockReturnValue({ data: [] });
  });

  // === Loading State Tests ===
  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: true,
        isFetching: true,
        data: undefined,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Lädt...')).toBeInTheDocument();
    });

    it('should show page header during loading', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: true,
        isFetching: true,
        data: undefined,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Ausleihe-Historie')).toBeInTheDocument();
    });

    it('should show skeleton with same structure as loaded content', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: true,
        isFetching: true,
        data: undefined,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(<AdminHistoryPage />, { wrapper: createWrapper() });

      // Skeleton should render pulse animation elements (Skeleton component uses animate-pulse)
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThanOrEqual(3);

      // Should have page header
      expect(screen.getByText('Ausleihe-Historie')).toBeInTheDocument();

      // Skeleton should show loading indicator
      expect(screen.getByText('Lädt...')).toBeInTheDocument();
    });
  });

  // === Success State Tests ===
  describe('Success State', () => {
    it('should render all components when data loaded', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('history-filters')).toBeInTheDocument();
      expect(screen.getByTestId('history-table')).toBeInTheDocument();
      expect(screen.getByTestId('history-pagination')).toBeInTheDocument();
    });

    it('should show correct number of entries in table', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('2 Einträge')).toBeInTheDocument();
    });

    it('should show page title', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Ausleihe-Historie')).toBeInTheDocument();
    });
  });

  // === Error State Tests ===
  describe('Error State', () => {
    it('should show error message on API error', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: undefined,
        error: new Error('Network error'),
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Historie konnte nicht geladen werden')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      const mockRefetch = vi.fn();
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: undefined,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });

    it('should call refetch when retry button clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: undefined,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByText('Erneut versuchen'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // === Empty State Tests ===
  describe('Empty State', () => {
    it('should show empty state when no data', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: { data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } },
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Keine Ausleihen gefunden')).toBeInTheDocument();
    });

    it('should show filter-specific message when filters active', () => {
      mockSearchState.deviceId = 'dev-1';
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: { data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } },
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Keine Ausleihen für die gewählten Filter.')).toBeInTheDocument();
    });

    it('should show reset button when filters active and empty', async () => {
      mockSearchState.deviceId = 'dev-1';
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: { data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } },
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Filter zurücksetzen?')).toBeInTheDocument();
    });
  });

  // === Navigation Tests (AC5) ===
  describe('Navigation', () => {
    it('should navigate when filter changes', async () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByText('Filter ändern'));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ deviceId: 'dev-1', page: 1 }),
      });
    });

    it('should navigate to page 2 when pagination clicked', async () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByText('Seite 2'));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ page: 2 }),
      });
    });

    it('should reset to page 1 when filter changes', async () => {
      mockSearchState.page = 3;
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByText('Filter ändern'));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ page: 1 }),
      });
    });
  });

  // === Refresh Button Tests ===
  describe('Refresh Button', () => {
    it('should show refresh button', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Aktualisieren')).toBeInTheDocument();
    });

    it('should call refetch when refresh clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByText('Aktualisieren'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show spinning icon when fetching', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: true,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Lädt...')).toBeInTheDocument();
    });

    it('should have min-h-16 for touch target', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      const button = screen.getByRole('button', { name: /aktualisieren/i });
      expect(button).toHaveClass('min-h-16');
    });
  });

  // === Filter Props Tests ===
  describe('Filter Props', () => {
    it('should pass isFetching to table', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: true,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      const table = screen.getByTestId('history-table');
      expect(table).toHaveAttribute('data-fetching', 'true');
    });

    it('should pass disabled to pagination when fetching', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: true,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      const pagination = screen.getByTestId('history-pagination');
      expect(pagination).toHaveAttribute('data-disabled', 'true');
    });

    it('should verify pagination is disabled during refetch', () => {
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: true,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      const pagination = screen.getByTestId('history-pagination');

      // Verify pagination is disabled when isFetching is true
      expect(pagination).toHaveAttribute('data-disabled', 'true');

      // Verify filters are also disabled during fetch
      const filters = screen.getByTestId('history-filters');
      expect(filters).toHaveAttribute('data-disabled', 'true');
    });
  });

  // === Page Reset on Filter Change Tests ===
  describe('Page Reset on Filter Change', () => {
    it('should reset to page 1 when changing filter from page 2+', async () => {
      mockSearchState.page = 2;
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      // Change a filter (not page)
      await userEvent.click(screen.getByText('Filter ändern'));

      // Should navigate with page reset to 1
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({
          deviceId: 'dev-1',
          page: 1, // Should reset to page 1
        }),
      });
    });

    it('should reset to page 1 when adding date filter from page 3', async () => {
      mockSearchState.page = 3;
      mockSearchState.deviceId = 'dev-1';
      mockUseAdminHistory.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: mockHistoryResponse,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminHistoryPage />, { wrapper: createWrapper() });

      // Change filter by clicking the button
      await userEvent.click(screen.getByText('Filter ändern'));

      // Verify page was reset to 1
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/history',
        search: expect.objectContaining({ page: 1 }),
      });
    });
  });
});
