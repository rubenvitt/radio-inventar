import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ConfirmLoanButton } from './ConfirmLoanButton';

// Mock useCreateLoan hook
vi.mock('@/api/loans', () => ({
  useCreateLoan: vi.fn(),
}));

import { useCreateLoan } from '@/api/loans';
const mockUseCreateLoan = useCreateLoan as Mock;

// Test data
const TEST_DEVICE_ID = 'clh8u82zq0000r6j10wxy7k01';
const TEST_DEVICE_ID_2 = 'clh8u82zq0000r6j10wxy7k02';
const TEST_BORROWER = 'Tim Schmidt';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createMockReturn(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    ...overrides,
  };
}

describe('ConfirmLoanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateLoan.mockReturnValue(createMockReturn());
  });

  describe('Disabled States (AC#6)', () => {
    it('ist disabled wenn deviceIds leer', () => {
      render(
        <ConfirmLoanButton
          deviceIds={[]}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('ist disabled wenn borrowerName leer', () => {
      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName=""
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('ist disabled wenn borrowerName nur Whitespace', () => {
      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName="   "
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('ist enabled wenn deviceIds und borrowerName vorhanden', () => {
      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeEnabled();
    });
  });

  describe('Loading State (AC#1, AC#2)', () => {
    it('zeigt "Wird gespeichert..." während isSubmitting', async () => {
        // We simulate loading by making mutateAsync promise never resolve immediately or verify state change
        // Since we use local state, we need to trigger the click
        let resolvePromise: (value: unknown) => void;
        const promise = new Promise((resolve) => { resolvePromise = resolve; });
        const mockMutateAsync = vi.fn().mockReturnValue(promise);
        mockUseCreateLoan.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

        render(
            <ConfirmLoanButton
            deviceIds={[TEST_DEVICE_ID]}
            borrowerName={TEST_BORROWER}
            onSuccess={vi.fn()}
            onError={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

        // Cleanup
        await act(async () => {
          resolvePromise!(undefined);
        });
    });


    it('zeigt "Gerät ausleihen" bei einem Gerät', () => {
      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Gerät ausleihen')).toBeInTheDocument();
    });

    it('zeigt "Geräte ausleihen" bei mehreren Geräten', () => {
        render(
          <ConfirmLoanButton
            deviceIds={[TEST_DEVICE_ID, TEST_DEVICE_ID_2]}
            borrowerName={TEST_BORROWER}
            onSuccess={vi.fn()}
            onError={vi.fn()}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText('Geräte ausleihen')).toBeInTheDocument();
      });
  });

  describe('Click Handler', () => {
    it('ruft mutateAsync für alle Geräte auf', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID, TEST_DEVICE_ID_2]}
          borrowerName="  Tim Schmidt  "
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      expect(mockMutateAsync).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID, borrowerName: 'Tim Schmidt' }
      );
      expect(mockMutateAsync).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID_2, borrowerName: 'Tim Schmidt' }
      );
    });

    it('ruft onSuccess bei Erfolg auf', async () => {
      const onSuccess = vi.fn();
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName={TEST_BORROWER}
          onSuccess={onSuccess}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
          expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('ruft onError bei Fehler auf', async () => {
      const onError = vi.fn();
      const testError = new Error('Test error');
      const mockMutateAsync = vi.fn().mockRejectedValue(testError);

      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <ConfirmLoanButton
          deviceIds={[TEST_DEVICE_ID]}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={onError}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(testError);
      });
    });
  });
});
