import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    mutate: vi.fn(),
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
    it('ist disabled wenn deviceId null', () => {
      render(
        <ConfirmLoanButton
          deviceId={null}
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
          deviceId={TEST_DEVICE_ID}
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
          deviceId={TEST_DEVICE_ID}
          borrowerName="   "
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('ist disabled während isPending (AC#2)', () => {
      mockUseCreateLoan.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('ist enabled wenn deviceId und borrowerName vorhanden', () => {
      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
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
    it('zeigt "Wird gespeichert..." während isPending', () => {
      mockUseCreateLoan.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
    });

    it('zeigt Spinner während isPending', () => {
      mockUseCreateLoan.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Loader2 hat animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('zeigt "Gerät ausleihen" wenn nicht loading', () => {
      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Gerät ausleihen')).toBeInTheDocument();
    });

    it('hat aria-busy während Loading', () => {
      mockUseCreateLoan.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Click Handler', () => {
    it('ruft mutate mit deviceId und borrowerName.trim() auf', async () => {
      const mockMutate = vi.fn();
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutate: mockMutate }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName="  Tim Schmidt  "
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      expect(mockMutate).toHaveBeenCalledWith(
        { deviceId: TEST_DEVICE_ID, borrowerName: 'Tim Schmidt' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('ruft onSuccess bei Erfolg auf', async () => {
      const onSuccess = vi.fn();
      const mockLoan = {
        id: 'loan1',
        deviceId: TEST_DEVICE_ID,
        borrowerName: TEST_BORROWER,
        borrowedAt: '2025-12-18T10:00:00.000Z',
        device: { id: TEST_DEVICE_ID, callSign: 'F4-21', status: 'ON_LOAN' },
      };

      const mockMutate = vi.fn((_, options) => {
        options.onSuccess(mockLoan);
      });
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutate: mockMutate }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={onSuccess}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onSuccess).toHaveBeenCalledWith(mockLoan);
    });

    it('ruft onError bei Fehler auf', async () => {
      const onError = vi.fn();
      const testError = new Error('Test error');

      const mockMutate = vi.fn((_, options) => {
        options.onError(testError);
      });
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutate: mockMutate }));

      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={onError}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('verhindert Klick wenn disabled', async () => {
      const mockMutate = vi.fn();
      mockUseCreateLoan.mockReturnValue(createMockReturn({ mutate: mockMutate }));

      render(
        <ConfirmLoanButton
          deviceId={null}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await userEvent.click(screen.getByRole('button'));

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Touch Target (AC#7, NFR11)', () => {
    it('Button hat size="lg" für 44px Touch-Target', () => {
      render(
        <ConfirmLoanButton
          deviceId={TEST_DEVICE_ID}
          borrowerName={TEST_BORROWER}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      // Button with size="lg" gets data-size="lg" attribute
      expect(button).toHaveAttribute('data-size', 'lg');
      // M3: Verify min-h-11 class is present (11 = 44px in Tailwind)
      expect(button.className).toMatch(/min-h-11/);
    });
  });
});
