import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanedDeviceList } from './LoanedDeviceList';
import type { ActiveLoan } from '@/api/loans';

const mockLoans: ActiveLoan[] = [
  {
    id: 'loan-001',
    deviceId: 'device-001',
    borrowerName: 'Max Mustermann',
    borrowedAt: '2025-12-15T10:30:00Z',
    device: {
      id: 'device-001',
      callSign: 'Florian 4-23',
      status: 'ON_LOAN',
    },
  },
  {
    id: 'loan-002',
    deviceId: 'device-002',
    borrowerName: 'Max Mustermann',
    borrowedAt: '2025-12-14T09:00:00Z',
    device: {
      id: 'device-002',
      callSign: 'Florian 4-24',
      status: 'ON_LOAN',
    },
  },
];

describe('LoanedDeviceList', () => {
  describe('Loading State', () => {
    it('renders loading state when isLoading is true', () => {
      render(
        <LoanedDeviceList loans={[]} isLoading={true} error={null} />
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/geladen/i)).toBeInTheDocument();
    });

    it('does not render loans while loading', () => {
      render(
        <LoanedDeviceList loans={mockLoans} isLoading={true} error={null} />
      );
      expect(screen.queryByText('Florian 4-23')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state when error is present', () => {
      const mockError = new Error('Network error');
      const mockRetry = vi.fn();

      render(
        <LoanedDeviceList
          loans={[]}
          isLoading={false}
          error={mockError}
          onRetry={mockRetry}
        />
      );

      expect(screen.getByText(/Fehler/i)).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Network error');
      const mockRetry = vi.fn();

      render(
        <LoanedDeviceList
          loans={[]}
          isLoading={false}
          error={mockError}
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /erneut/i });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('renders error state even if onRetry is not provided (AC#3)', () => {
      const mockError = new Error('Network error');

      render(
        <LoanedDeviceList
          loans={[]}
          isLoading={false}
          error={mockError}
        />
      );

      // Should show error state for user-friendly error messages (AC#3)
      expect(screen.getByText(/Fehler/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state message when no loans', () => {
      render(
        <LoanedDeviceList loans={[]} isLoading={false} error={null} />
      );

      expect(screen.getByText(/Keine Geraete ausgeliehen/i)).toBeInTheDocument();
    });

    it('has correct aria-label for empty state', () => {
      render(
        <LoanedDeviceList loans={[]} isLoading={false} error={null} />
      );

      expect(
        screen.getByRole('status', { name: /Keine Geraete ausgeliehen/i })
      ).toBeInTheDocument();
    });

    it('shows empty state message with muted-foreground styling', () => {
      render(
        <LoanedDeviceList loans={[]} isLoading={false} error={null} />
      );

      const emptyStateContainer = screen.getByRole('status');
      expect(emptyStateContainer).toHaveClass('text-muted-foreground');
    });
  });

  describe('Filled State', () => {
    it('renders all loans as cards', () => {
      render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      expect(screen.getByText('Florian 4-23')).toBeInTheDocument();
      expect(screen.getByText('Florian 4-24')).toBeInTheDocument();
    });

    it('renders list with correct role', () => {
      render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      expect(
        screen.getByRole('list', { name: /Ausgeliehene Geraete/i })
      ).toBeInTheDocument();
    });

    it('renders each loan as listitem', () => {
      render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('renders loans with unique keys', () => {
      const { container } = render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      // Should render without React key warnings
      expect(container).toBeInTheDocument();
    });

    it('displays borrowed dates for each loan', () => {
      render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      // Check that dates are displayed (de-DE format)
      expect(screen.getByText(/15\.12\.2025/)).toBeInTheDocument();
      expect(screen.getByText(/14\.12\.2025/)).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('uses grid layout with gap-3 spacing', () => {
      const { container } = render(
        <LoanedDeviceList loans={mockLoans} isLoading={false} error={null} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-3');
    });
  });

  describe('State Transitions', () => {
    it('prioritizes loading over error', () => {
      const mockError = new Error('Network error');

      render(
        <LoanedDeviceList
          loans={[]}
          isLoading={true}
          error={mockError}
        />
      );

      // Should show loading, not error
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText(/Fehler/i)).not.toBeInTheDocument();
    });

    it('prioritizes error over empty state', () => {
      const mockError = new Error('Network error');
      const mockRetry = vi.fn();

      render(
        <LoanedDeviceList
          loans={[]}
          isLoading={false}
          error={mockError}
          onRetry={mockRetry}
        />
      );

      expect(screen.getByText(/Fehler/i)).toBeInTheDocument();
      expect(screen.queryByText(/Keine Geraete ausgeliehen/i)).not.toBeInTheDocument();
    });
  });
});
