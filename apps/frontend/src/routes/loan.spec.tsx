import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock state for search params
let mockSearchParams: { deviceId?: string } = {};

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
    mutateAsync: vi.fn(),
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

// Helper to complete loan flow up to confirm button click
async function completeLoanFlowToConfirm(user: ReturnType<typeof userEvent.setup>) {
  // Wait for page to load
  await waitFor(() => {
    expect(screen.getByText('Gerät ausleihen')).toBeInTheDocument();
  });

  // Find and click device
  const deviceCard = await screen.findByRole('option', {
    name: new RegExp(TEST_DEVICE_CALLSIGN)
  });
  await user.click(deviceCard);

  // Wait for borrower input to be enabled (after device selection updates URL)
  const borrowerInput = await screen.findByPlaceholderText(/name eingeben/i);

  // Enter borrower name
  await user.type(borrowerInput, TEST_BORROWER_NAME);

  // Click confirm button
  const confirmButton = await screen.findByRole('button', { name: /Gerät ausleihen/i });
  await user.click(confirmButton);
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
      expect(screen.getByText(/Wählen Sie ein Gerät/i)).toBeInTheDocument();
    });

    it('renders step 1 heading for device selection', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 2, name: /1\. Gerät wählen/i })).toBeInTheDocument();
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
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
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
        search: { deviceId: TEST_DEVICE_ID },
        replace: true,
      });
    });

    it('shows device as selected when deviceId is in URL', () => {
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      render(<LoanPage />, { wrapper: createWrapper() });

      const deviceCard = screen.getByRole('option', {
        name: new RegExp(TEST_DEVICE_CALLSIGN)
      });
      expect(deviceCard).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Complete Happy Path Flow', () => {
    it('calls mutate with correct parameters when form is submitted', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      // Start with device already selected
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      // Enter borrower name
      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Verify mutate was called with correct params
      expect(mockMutate).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID, borrowerName: TEST_BORROWER_NAME },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('shows success toast and navigates to home on successful loan', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Trigger success callback
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      // Verify success toast was shown
      expect(mockToast.success).toHaveBeenCalledWith('Gerät erfolgreich ausgeliehen');

      // Verify navigation to home
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast with user-friendly message on 409 conflict', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Trigger error callback with 409 conflict
      const conflictError = new Error('409 Conflict: Device already on loan');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(conflictError);
      });

      // Verify error toast was shown
      expect(mockToast.error).toHaveBeenCalledWith(
        'Ausleihe fehlgeschlagen',
        expect.objectContaining({
          description: expect.stringContaining('Gerät ist bereits ausgeliehen'),
        })
      );
    });

    it('shows error toast with network error message', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Trigger error callback with network error
      const networkError = new Error('Network error: Failed to fetch');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(networkError);
      });

      // Verify error toast was shown
      expect(mockToast.error).toHaveBeenCalledWith(
        'Ausleihe fehlgeschlagen',
        expect.objectContaining({
          description: expect.stringContaining('Keine Verbindung zum Server'),
        })
      );
    });

    it('does not navigate on error', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Clear any navigation from device selection
      mockNavigate.mockClear();

      // Trigger error callback
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Form State Persistence', () => {
    it('preserves borrower name value in input after error', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Trigger error callback
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify input still has the value
      expect(borrowerInput).toHaveValue(TEST_BORROWER_NAME);
    });

    it('allows retry after error with same form values', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      await user.click(confirmButton);

      // Trigger error callback
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Click confirm button again to retry
      await user.click(confirmButton);

      // Verify mutate was called again (2nd time)
      expect(mockMutate).toHaveBeenCalledTimes(2);
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
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      render(<LoanPage />, { wrapper: createWrapper() });

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      expect(confirmButton).toBeDisabled();
    });

    it('enables confirm button when device and borrower name are provided', async () => {
      const user = userEvent.setup();
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      render(<LoanPage />, { wrapper: createWrapper() });

      const borrowerInput = screen.getByPlaceholderText(/name eingeben/i);
      await user.type(borrowerInput, TEST_BORROWER_NAME);

      const confirmButton = screen.getByRole('button', { name: /Gerät ausleihen/i });
      expect(confirmButton).toBeEnabled();
    });

    it('shows loading state during submission', () => {
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ isPending: true })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has main heading at h1 level', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/Gerät ausleihen/i);
    });

    it('has section headings at h2 level', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headings.length).toBeGreaterThanOrEqual(2);
    });

    it('device selector has listbox role', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('borrower input has combobox role', () => {
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      render(<LoanPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('confirm button has aria-busy when loading', () => {
      mockSearchParams = { deviceId: TEST_DEVICE_ID };
      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ isPending: true })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      const button = screen.getByRole('button', { name: /wird gespeichert/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
