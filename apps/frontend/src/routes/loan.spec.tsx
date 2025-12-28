import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      ...options,
      path,
    }),
  };
});

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

  // Wait for borrower input to appear (conditional rendering)
  const borrowerInput = await screen.findByPlaceholderText(/name eingeben/i);

  // Enter borrower name
  await user.type(borrowerInput, TEST_BORROWER_NAME);

  // Click confirm button
  const confirmButton = await screen.findByRole('button', { name: /gerät ausleihen/i });
  await user.click(confirmButton);
}

describe('LoanPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

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

  describe('Test 1: Kompletter Happy-Path (Select → Name → Confirm → Success)', () => {
    it('erlaubt kompletten Ausleihe-Flow von Device-Auswahl bis Success', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Verify mutate was called
      expect(mockMutate).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID, borrowerName: TEST_BORROWER_NAME },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );

      // Trigger success callback
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      // Verify success screen is shown
      await waitFor(() => {
        expect(screen.getByText('Ausleihe erfolgreich!')).toBeInTheDocument();
      });
    }, 10000);
  });

  describe('Test 2: Success-Anzeige enthält callSign und borrowerName (AC#3)', () => {
    it('zeigt callSign und borrowerName in der Success-Anzeige an', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger success
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      // Verify success message contains both callSign and borrowerName
      await waitFor(() => {
        const text = screen.getByText((content, element) => {
          const hasText = (node: Element | null): boolean => {
            if (!node) return false;
            const text = node.textContent || '';
            return text.includes(TEST_DEVICE_CALLSIGN) &&
                   text.includes('ausgeliehen an') &&
                   text.includes(TEST_BORROWER_NAME);
          };
          return hasText(element);
        });
        expect(text).toBeInTheDocument();
      });
    }, 10000);

    it('sanitizes callSign and borrowerName for XSS protection', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      const maliciousLoanResponse: CreateLoanResponse = {
        ...mockLoanResponse,
        borrowerName: '<script>alert("xss")</script>Tim',
        device: {
          ...mockLoanResponse.device,
          callSign: 'F4<>21',
        },
      };

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger success with malicious data
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(maliciousLoanResponse);
      });

      await waitFor(() => {
        expect(screen.getByText('Ausleihe erfolgreich!')).toBeInTheDocument();
      });

      // Verify dangerous characters are removed
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
      const text = screen.getByText((content, element) => {
        return element?.textContent?.includes('F421') ?? false; // < and > removed
      });
      expect(text).toBeInTheDocument();
    }, 10000);
  });

  describe('Test 3: Auto-Redirect nach 2 Sekunden (AC#4)', () => {
    it('redirected nach 2000ms zur Übersicht nach erfolgreicher Ausleihe', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger success
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      await waitFor(() => {
        expect(screen.getByText('Ausleihe erfolgreich!')).toBeInTheDocument();
      });

      // Verify navigate has not been called yet
      expect(mockNavigate).not.toHaveBeenCalled();

      // Fast-forward 1999ms - should still not redirect
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      // Fast-forward 1ms more (total 2000ms) - should redirect
      act(() => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
      });

      vi.useRealTimers();
    }, 10000);

    it('zeigt "Weiterleitung zur Übersicht..." Nachricht im Success-State', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger success
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      // Verify redirect message
      await waitFor(() => {
        expect(screen.getByText('Weiterleitung zur Übersicht...')).toBeInTheDocument();
      });
    }, 10000);
  });

  describe('Test 4: Fehler-Anzeige bei 409 Conflict (AC#8)', () => {
    it('zeigt spezifische Fehlermeldung bei 409 Conflict (Gerät bereits ausgeliehen)', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger 409 error
      const conflictError = new Error('409 Conflict: Device already on loan');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(conflictError);
      });

      // Verify error alert is shown with specific message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText('Fehler beim Ausleihen')).toBeInTheDocument();
      expect(screen.getByText(/Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar/i)).toBeInTheDocument();

      // Verify action buttons
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /schließen/i })).toBeInTheDocument();
    }, 10000);

    it('zeigt 409 Fehlermeldung auch bei "conflict" im Error-Text', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger conflict error without 409
      const conflictError = new Error('Resource conflict detected');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(conflictError);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar/i)).toBeInTheDocument();
    }, 10000);
  });

  describe('Test 5: Fehler-Anzeige bei Network Error (AC#9)', () => {
    it('zeigt spezifische Fehlermeldung bei Network Error', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger network error
      const networkError = new Error('Network error: Failed to fetch');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(networkError);
      });

      // Verify error alert with specific network error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText('Fehler beim Ausleihen')).toBeInTheDocument();
      expect(screen.getByText(/Keine Verbindung zum Server.*Internetverbindung/i)).toBeInTheDocument();
    }, 10000);

    it('zeigt Network Error auch bei "fetch" im Error-Text', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger fetch error
      const fetchError = new Error('fetch failed');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(fetchError);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/Keine Verbindung zum Server/i)).toBeInTheDocument();
    }, 10000);
  });

  describe('Test 6: Form bleibt nach Fehler intakt', () => {
    it('behält Device-Auswahl und Borrower-Name nach Fehler bei', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger error
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify error is shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Verify form is still intact
      const borrowerInputAfterError = screen.getByPlaceholderText(/name eingeben/i);
      expect(borrowerInputAfterError).toHaveValue(TEST_BORROWER_NAME);

      // Verify device is still selected
      const deviceCardAfterError = screen.getByRole('option', { name: new RegExp(TEST_DEVICE_CALLSIGN) });
      expect(deviceCardAfterError).toHaveAttribute('aria-selected', 'true');

      // Verify confirm button is still enabled
      const confirmButtonAfterError = screen.getByRole('button', { name: /gerät ausleihen/i });
      expect(confirmButtonAfterError).toBeEnabled();
    }, 10000);

    it('erlaubt Retry nach Fehler', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger error
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify error is shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
      await user.click(retryButton);

      // Verify error is dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Try submitting again
      const confirmButton = screen.getByRole('button', { name: /gerät ausleihen/i });
      await user.click(confirmButton);

      // Verify mutate was called again (2nd time)
      expect(mockMutate).toHaveBeenCalledTimes(2);
    }, 10000);

    it('erlaubt Schließen des Fehlers und Fortsetzen', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger error
      const testError = new Error('API Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify error is shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByRole('button', { name: /schließen/i });
      await user.click(closeButton);

      // Verify error is dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Verify user can modify name and continue
      const borrowerInputAfterClose = screen.getByPlaceholderText(/name eingeben/i);
      await user.clear(borrowerInputAfterClose);
      await user.type(borrowerInputAfterClose, 'Neuer Name');
      expect(borrowerInputAfterClose).toHaveValue('Neuer Name');
    }, 10000);
  });

  describe('Test 7: Accessibility und ARIA', () => {
    it('Success-State hat role="status" und aria-live="polite"', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger success
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onSuccess(mockLoanResponse);
      });

      // Verify success has correct ARIA attributes
      await waitFor(() => {
        const successStatus = screen.getByRole('status');
        expect(successStatus).toBeInTheDocument();
        expect(successStatus).toHaveAttribute('aria-live', 'polite');
      });
    }, 10000);

    it('Error-State hat role="alert" und aria-live="assertive"', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseCreateLoan.mockReturnValue(
        createMockMutationReturn({ mutate: mockMutate })
      );

      render(<LoanPage />, { wrapper: createWrapper() });

      await completeLoanFlowToConfirm(user);

      // Trigger error
      const testError = new Error('Test Error');
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall?.[1];
      act(() => {
        options.onError(testError);
      });

      // Verify error has correct ARIA attributes
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    }, 10000);

    it('Page hat semantische Struktur mit section und h1/h2', () => {
      render(<LoanPage />, { wrapper: createWrapper() });

      // Verify main heading
      const mainHeading = screen.getByRole('heading', { level: 1, name: /gerät ausleihen/i });
      expect(mainHeading).toBeInTheDocument();

      // Verify section headings
      const deviceSelectionHeading = screen.getByRole('heading', { level: 2, name: /1. Gerät auswählen/i });
      expect(deviceSelectionHeading).toBeInTheDocument();

      const nameInputHeading = screen.getByRole('heading', { level: 2, name: /2. Name eingeben/i });
      expect(nameInputHeading).toBeInTheDocument();

      // Verify sections have aria-label
      const deviceSection = screen.getByLabelText('Geräteauswahl');
      expect(deviceSection).toBeInTheDocument();

      const borrowerSection = screen.getByLabelText('Namenseingabe');
      expect(borrowerSection).toBeInTheDocument();
    });
  });
});
