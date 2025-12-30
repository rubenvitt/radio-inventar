import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DeviceList } from './DeviceList';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DeviceWithLoanInfo } from '@/api/devices';
import type { ReactNode } from 'react';

// Mock TanStack Router hooks
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
      <a href={to} className={className}>{children}</a>
    ),
  };
});

// Mock the hook
vi.mock('@/api/devices', () => ({
  useDevices: vi.fn(),
}));

import { useDevices } from '@/api/devices';
const mockUseDevices = vi.mocked(useDevices);

// Helper to create properly typed mock return values
type UseDevicesResult = UseQueryResult<DeviceWithLoanInfo[], Error>;

function createMockReturn(overrides: Partial<UseDevicesResult>): UseDevicesResult {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: false,
    refetch: vi.fn(),
    status: 'pending',
    ...overrides,
  } as UseDevicesResult;
}

const mockDevices: DeviceWithLoanInfo[] = [
  {
    id: 'dev1',
    callSign: 'Florian 4-21',
    status: 'AVAILABLE',
    serialNumber: 'SN1',
    deviceType: 'Handheld',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dev2',
    callSign: 'Florian 4-22',
    status: 'ON_LOAN',
    serialNumber: 'SN2',
    deviceType: 'Handheld',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    borrowerName: 'Max',
  },
];

describe('DeviceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders loading state when isLoading', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      isLoading: true,
      isPending: true,
      status: 'pending',
    }));

    render(<DeviceList />);
    // Explicitly check for LoadingState component indicators
    const loadingState = screen.getByRole('status', { name: 'Geräte werden geladen' });
    expect(loadingState).toBeInTheDocument();
    expect(loadingState).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-[200px]');

    // Check for spinner within loading state
    const spinner = loadingState.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Check for accessible loading text
    expect(screen.getByText('Geräte werden geladen...')).toBeInTheDocument();
  });

  it('renders error state when isError', () => {
    const mockRefetch = vi.fn();
    mockUseDevices.mockReturnValue(createMockReturn({
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
      status: 'error',
    }));

    render(<DeviceList />);
    expect(screen.getByText('Fehler beim Laden der Geräte')).toBeInTheDocument();
    // Error messages are now sanitized - check for retry button as a key indicator
    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
  });

  it('renders devices in grid when data available', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }));

    const { container } = render(<DeviceList />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('grid has correct responsive classes', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }));

    const { container } = render(<DeviceList />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders correct number of DeviceCards', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: mockDevices,
      isSuccess: true,
      status: 'success',
    }));

    render(<DeviceList />);
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
    expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
  });

  // Boundary Tests
  it('renders empty state when no devices exist (0 devices)', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: [],
      isSuccess: true,
      status: 'success',
    }));

    render(<DeviceList />);
    expect(screen.getByText('Keine Geräte vorhanden')).toBeInTheDocument();
    expect(screen.getByText(/noch keine Geräte/i)).toBeInTheDocument();
  });

  it('renders single device correctly (1 device)', () => {
    const singleDevice: DeviceWithLoanInfo[] = [mockDevices[0]!];
    mockUseDevices.mockReturnValue(createMockReturn({
      data: singleDevice,
      isSuccess: true,
      status: 'success',
    }));

    render(<DeviceList />);
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
    expect(screen.queryByText('Florian 4-22')).not.toBeInTheDocument();
  });

  it('renders multiple devices correctly (3+ devices)', () => {
    const threeDevices: DeviceWithLoanInfo[] = [
      ...mockDevices,
      {
        id: 'dev3',
        callSign: 'Florian 4-23',
        status: 'DEFECT',
        serialNumber: 'SN3',
        deviceType: 'Handheld',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockUseDevices.mockReturnValue(createMockReturn({
      data: threeDevices,
      isSuccess: true,
      status: 'success',
    }));

    render(<DeviceList />);
    expect(screen.getByText('Florian 4-21')).toBeInTheDocument();
    expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
    expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
  });

  it('handles empty array data gracefully', () => {
    mockUseDevices.mockReturnValue(createMockReturn({
      data: [],
      isSuccess: true,
      status: 'success',
    }));

    render(<DeviceList />);
    // Should show empty state when data is empty array
    expect(screen.getByText('Keine Geräte vorhanden')).toBeInTheDocument();
  });

  // REFRESH BUTTON TESTS
  describe('Refresh Button', () => {
    it('renders refresh button when data is available', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls refetch when refresh button is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      await userEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('disables refresh button while fetching', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: true,
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).toBeDisabled();
    });

    it('has spinning icon while fetching', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: true,
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      const spinningIcon = refreshButton.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });

    it('refresh button icon does not spin when not fetching', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: false,
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      const spinningIcon = refreshButton.querySelector('.animate-spin');
      expect(spinningIcon).not.toBeInTheDocument();
    });

    it('is not visible in error state', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        isError: true,
        error: new Error('Network error'),
        status: 'error',
      }));

      render(<DeviceList />);
      const refreshButton = screen.queryByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeInTheDocument();
    });

    it('is not visible in loading state', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        isLoading: true,
        isPending: true,
        status: 'pending',
      }));

      render(<DeviceList />);
      const refreshButton = screen.queryByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeInTheDocument();
    });

    it('is not visible in empty state', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: [],
        isSuccess: true,
        status: 'success',
      }));

      render(<DeviceList />);
      const refreshButton = screen.queryByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeInTheDocument();
    });

    it('disables button after first click to prevent double-trigger', async () => {
      const mockRefetch = vi.fn();

      // Start with isFetching=false (button enabled)
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        refetch: mockRefetch,
      }));

      const { rerender } = render(<DeviceList />);
      let refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeDisabled();

      // Simulate first click
      await userEvent.click(refreshButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);

      // After first click, React Query sets isFetching=true (simulated here)
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: true,
        refetch: mockRefetch,
      }));

      rerender(<DeviceList />);
      refreshButton = screen.getByRole('button', { name: /aktualisieren/i });

      // Button is now disabled, preventing further clicks
      expect(refreshButton).toBeDisabled();

      // Attempting to click again should not trigger refetch
      await userEvent.click(refreshButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('transitions through isFetching states correctly', () => {
      const mockRefetch = vi.fn();

      // Initial state: not fetching
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        refetch: mockRefetch,
      }));

      const { rerender } = render(<DeviceList />);
      let refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeDisabled();
      expect(refreshButton.querySelector('.animate-spin')).not.toBeInTheDocument();

      // Transition to: fetching
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: true,
        refetch: mockRefetch,
      }));

      rerender(<DeviceList />);
      refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).toBeDisabled();
      expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument();

      // Transition back to: not fetching
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        refetch: mockRefetch,
      }));

      rerender(<DeviceList />);
      refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      expect(refreshButton).not.toBeDisabled();
      expect(refreshButton.querySelector('.animate-spin')).not.toBeInTheDocument();
    });

    it('shows error message when refresh fails', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      await userEvent.click(refreshButton);

      // Expect error message to be shown (implementation specific)
      await waitFor(() => {
        expect(screen.getByText('Aktualisierung fehlgeschlagen')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // ACCESSIBILITY & SEMANTIC TESTS
  describe('Accessibility & Semantics', () => {
    it('has aria-live region for accessibility', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }));

      const { container } = render(<DeviceList />);
      // role="status" provides implicit aria-live="polite" per WAI-ARIA spec
      const liveRegion = container.querySelector('[role="status"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('has semantic header element', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }));

      const { container } = render(<DeviceList />);
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Geräte');
    });

    it('has data-testid for E2E testing', () => {
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
      }));

      render(<DeviceList />);
      expect(screen.getByTestId('device-list')).toBeInTheDocument();
    });
  });

  // SECURITY: getUserFriendlyErrorMessage TESTS
  describe('getUserFriendlyErrorMessage', () => {
    // The function is not exported, so we test it indirectly via the error state

    it('shows network error message for network failures', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Keine Verbindung zum Server/i)).toBeInTheDocument();
      });
    });

    it('shows timeout error message for timeout failures', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Request timeout'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Die Anfrage hat zu lange gedauert/i)).toBeInTheDocument();
      });
    });

    it('shows server error message for 500 errors', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Der Server ist momentan nicht erreichbar/i)).toBeInTheDocument();
      });
    });

    it('shows generic error for unknown errors', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Some random error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });

    it('handles null error gracefully', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(null);
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        // When null is thrown, handleRefresh converts it to new Error('Refresh failed')
        // which triggers the generic error message
        expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });

    it('shows 401/403 authorization error message', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Sie haben keine Berechtigung/i)).toBeInTheDocument();
      });
    });

    it('shows 404 not found error message', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('404 Not Found'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/Die angeforderten Daten wurden nicht gefunden/i)).toBeInTheDocument();
      });
    });

    it('never exposes raw error messages', async () => {
      const sensitiveError = 'Database connection failed at mysql://secret-host:3306/db';
      const mockRefetch = vi.fn().mockRejectedValue(new Error(sensitiveError));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        status: 'success',
        refetch: mockRefetch,
      }));

      render(<DeviceList />);
      await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));

      await waitFor(() => {
        // Should NOT contain the raw error
        expect(screen.queryByText(new RegExp(sensitiveError))).not.toBeInTheDocument();
        // Should show generic error instead
        expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });
  });

  // AC #3 - Data Update Tests
  describe('Data Updates After Refresh', () => {
    it('updates device list after successful refresh with new data', async () => {
      const mockRefetch = vi.fn();
      const oldDevices: DeviceWithLoanInfo[] = [
        {
          id: 'dev1',
          callSign: 'Florian 4-21',
          status: 'AVAILABLE',
          serialNumber: 'SN1',
          deviceType: 'Handheld',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUseDevices.mockReturnValue(createMockReturn({
        data: oldDevices,
        isSuccess: true,
        refetch: mockRefetch,
        status: 'success',
      }));

      const { rerender } = render(<DeviceList />);
      expect(screen.getByText('Florian 4-21')).toBeInTheDocument();

      // Simulate data update after refetch
      const newDevices: DeviceWithLoanInfo[] = [
        {
          id: 'dev1',
          callSign: 'Florian 4-21',
          status: 'ON_LOAN',
          serialNumber: 'SN1',
          deviceType: 'Handheld',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          borrowerName: 'Max Mustermann',
        },
        {
          id: 'dev2',
          callSign: 'Florian 4-22',
          status: 'AVAILABLE',
          serialNumber: 'SN2',
          deviceType: 'Handheld',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUseDevices.mockReturnValue(createMockReturn({
        data: newDevices,
        isSuccess: true,
        refetch: mockRefetch,
        status: 'success',
      }));

      rerender(<DeviceList />);

      expect(screen.getByText('Florian 4-22')).toBeInTheDocument();
      expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument();
    });
  });

  // Auto-Dismiss & Cleanup Tests
  describe('Error Alert Auto-Dismiss', () => {
    // TODO: Fix these tests - they have issues with fake timers and userEvent interaction
    it.skip('automatically dismisses error alert after 5 seconds', async () => {
      vi.useFakeTimers();

      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        refetch: mockRefetch,
        status: 'success',
      }));

      render(<DeviceList />);

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      await userEvent.click(refreshButton);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Fast-forward 5 seconds to trigger auto-dismiss
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Check that alert is gone
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      vi.useRealTimers();
    }, 10000);

    it.skip('error alert close button has touch-optimized target', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        refetch: mockRefetch,
        status: 'success',
      }));

      render(<DeviceList />);

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /schließen/i });
      expect(closeButton).toHaveClass('touch-target-md');
    });

    it.skip('cleans up timeout on component unmount', async () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDevices.mockReturnValue(createMockReturn({
        data: mockDevices,
        isSuccess: true,
        refetch: mockRefetch,
        status: 'success',
      }));

      const { unmount } = render(<DeviceList />);

      const refreshButton = screen.getByRole('button', { name: /aktualisieren/i });
      await userEvent.click(refreshButton);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 1000 });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }, 10000);
  });
});
