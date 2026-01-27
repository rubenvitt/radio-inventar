import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock state for search params
let mockSearchParams: { deviceIds?: string | string[] } = {};

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
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      ...options,
      path,
      fullPath: path,
      useSearch: () => mockSearchParams,
    }),
  };
});

// Mock sonner toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock the hooks
vi.mock('@/api/loans', () => ({
  useCreateLoan: vi.fn(),
}));

vi.mock('@/api/devices', () => ({
  useDevices: vi.fn(),
}));

vi.mock('@/api/borrowers', () => ({
  useBorrowerSuggestions: vi.fn(),
}));

import { useCreateLoan } from '@/api/loans';
import { useDevices } from '@/api/devices';
import { useBorrowerSuggestions } from '@/api/borrowers';
import type { DeviceWithLoanInfo } from '@/api/devices';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { CreateLoanResponse } from '@/api/loans';

const mockUseCreateLoan = useCreateLoan as Mock;
const mockUseDevices = vi.mocked(useDevices);
const mockUseBorrowerSuggestions = vi.mocked(useBorrowerSuggestions);

// Import the actual component after mocks are set up
const LoanPageModule = await import('./loan');
const RouteConfig = LoanPageModule.Route as { component: () => JSX.Element };
const LoanPage = RouteConfig.component;

// Test data - CUID2 format requires exactly 24 characters
const TEST_DEVICE_ID = 'clh8u82zq0000r6j10wxy7k0';
const TEST_DEVICE_CALLSIGN = 'F4-21';
const TEST_BORROWER_NAME = 'Tim Schmidt';

const mockDevice: DeviceWithLoanInfo = {
  id: TEST_DEVICE_ID,
  callSign: TEST_DEVICE_CALLSIGN,
  status: 'AVAILABLE',
  serialNumber: 'SN001',
  deviceType: 'Handheld',
  notes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockLoanResponse: CreateLoanResponse = {
  id: 'clh8u82zq0010r6j10wxy7k1',
  deviceId: TEST_DEVICE_ID,
  borrowerName: TEST_BORROWER_NAME,
  borrowedAt: '2025-12-18T10:00:00.000Z',
  device: {
    id: TEST_DEVICE_ID,
    callSign: TEST_DEVICE_CALLSIGN,
    status: 'ON_LOAN',
  },
};

// Helper to create mock mutation return value
function createMockMutationReturn(overrides = {}): UseMutationResult<CreateLoanResponse, Error, { deviceId: string; borrowerName: string }, unknown> {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(mockLoanResponse),
    isPending: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    error: null,
    data: undefined,
    reset: vi.fn(),
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    context: undefined,
    ...overrides,
  } as UseMutationResult<CreateLoanResponse, Error, { deviceId: string; borrowerName: string }, unknown>;
}

// Helper to create mock devices query return
function createMockDevicesReturn(overrides = {}): UseQueryResult<DeviceWithLoanInfo[], Error> {
  return {
    data: [mockDevice],
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(),
    status: 'success',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    ...overrides,
  } as UseQueryResult<DeviceWithLoanInfo[], Error>;
}

// Helper to create mock borrower suggestions return
function createMockBorrowerReturn(overrides = {}): UseQueryResult<[], Error> {
  return {
    data: [],
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(),
    status: 'success',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    ...overrides,
  } as UseQueryResult<[], Error>;
}

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('LoanPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockSearchParams = {};

    // Mock DOM methods
    Element.prototype.scrollIntoView = vi.fn();
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;

    // Default mock returns
    mockUseDevices.mockReturnValue(createMockDevicesReturn());
    mockUseBorrowerSuggestions.mockReturnValue(createMockBorrowerReturn());
    mockUseCreateLoan.mockReturnValue(createMockMutationReturn());
  });

  describe('Page Structure and Initial State', () => {
    it('renders page title and instructions', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 1, name: /Gerät ausleihen/i })).toBeInTheDocument();
      expect(screen.getByText(/Wählen Sie ein oder mehrere Geräte/i)).toBeInTheDocument();
    });

    it('renders step 1 heading for device selection', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 2, name: /1\. Gerät\(e\) wählen/i })).toBeInTheDocument();
    });

    it('renders step 2 heading for borrower input', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 2, name: /2\. Empfänger angeben/i })).toBeInTheDocument();
    });

    it('disables borrower input when no device is selected', () => {
      mockSearchParams = {}; // No device selected
      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      expect(borrowerInput).toBeDisabled();
    });

    it('enables borrower input when device is selected via URL', () => {
      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      expect(borrowerInput).toBeEnabled();
    });
  });

  describe('Device Selection Flow', () => {
    it('calls navigate to update URL when device is selected', async () => {
      const user = userEvent.setup();
      render(<LoanPage />, { wrapper: createWrapper() });

      const deviceCard = await screen.findByRole('option', {
        name: new RegExp(TEST_DEVICE_CALLSIGN)
      });
      await user.click(deviceCard);

      expect(mockNavigate).toHaveBeenCalledWith({
        search: { deviceIds: [TEST_DEVICE_ID] },
        replace: true,
      });
    });

    it('shows device as selected when deviceId is in URL', () => {
      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      render(<LoanPage />, { wrapper: createWrapper() });

      const deviceCard = screen.getByRole('option', {
        name: new RegExp(TEST_DEVICE_CALLSIGN)
      });
      expect(deviceCard).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Complete Happy Path Flow', () => {
    it('calls mutateAsync with correct parameters when form is submitted', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue(mockLoanResponse);

      // Start with device already selected
      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutateAsync: mockMutateAsync })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      // Enter borrower name
      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Verify mutate was called with correct params
      expect(mockMutateAsync).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID, borrowerName: TEST_BORROWER_NAME }
      );
    });

    it('shows success toast and navigates to home on successful loan', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue(mockLoanResponse);

      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutateAsync: mockMutateAsync })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Gerät erfolgreich ausgeliehen');
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast with error message', async () => {
      const user = userEvent.setup();
      const error = new Error('Network error');
      const mockMutateAsync = vi.fn().mockRejectedValue(error);

      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutateAsync: mockMutateAsync })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      await waitFor(() => {
          expect(mockToast.error).toHaveBeenCalledWith(
            'Ausleihe fehlgeschlagen',
            expect.objectContaining({
              description: expect.stringContaining('Keine Verbindung zum Server'),
            })
          );
      });
    });
  });

  describe('Button States', () => {
    it('disables confirm button when no device is selected', () => {
      mockSearchParams = {};
      render(<LoanPage />, { wrapper: createWrapper() });

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      expect(confirmButton).toBeDisabled();
    });

    it('disables confirm button when borrower name is empty', () => {
      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      render(<LoanPage />, { wrapper: createWrapper() });

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      expect(confirmButton).toBeDisabled();
    });

    it('enables confirm button when device and borrower name are provided', async () => {
      const user = userEvent.setup();
      mockSearchParams = { deviceIds: [TEST_DEVICE_ID] };
      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      expect(confirmButton).toBeEnabled();
    });

    // Test for loading state might be tricky as it is local now and async
    // But we can test behavior of ConfirmLoanButton as blackbox
  });
});
