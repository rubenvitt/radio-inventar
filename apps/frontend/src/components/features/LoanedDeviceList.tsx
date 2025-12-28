import { memo } from 'react';
import { LoanedDeviceCard } from './LoanedDeviceCard';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import type { ActiveLoan } from '@/api/loans';

interface LoanedDeviceListProps {
  loans: ActiveLoan[];
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  onLoanClick?: (loan: ActiveLoan) => void;
}

/**
 * LoanedDeviceList Component
 *
 * Displays a list of loaned devices with loading, error, and empty states.
 *
 * Features:
 * - Reuses LoadingState and ErrorState components for consistency
 * - Empty state message: "Keine Geraete ausgeliehen" (AC#3)
 * - Grid layout for device cards
 * - Touch-optimized spacing
 * - memo() wrapped to prevent unnecessary re-renders
 *
 * @param loans - Array of active loans to display
 * @param isLoading - Whether data is loading
 * @param error - Error object if fetch failed
 * @param onRetry - Callback to retry fetching data
 */
export const LoanedDeviceList = memo(function LoanedDeviceList({
  loans,
  isLoading,
  error,
  onRetry,
  onLoanClick,
}: LoanedDeviceListProps) {
  // Loading State
  if (isLoading) {
    return <LoadingState />;
  }

  // Error State - show error even without onRetry (AC#3: benutzerfreundliche Fehlermeldungen)
  if (error) {
    return onRetry ? (
      <ErrorState error={error} onRetry={onRetry} />
    ) : (
      <ErrorState error={error} />
    );
  }

  // Empty State (AC#3)
  if (loans.length === 0) {
    return (
      <div
        className="flex items-center justify-center min-h-[200px] text-muted-foreground"
        role="status"
        aria-label="Keine Geraete ausgeliehen"
      >
        <p className="text-center">Keine Geraete ausgeliehen</p>
      </div>
    );
  }

  // Filled State
  return (
    <div className="grid gap-3" role="list" aria-label="Ausgeliehene Geraete">
      {loans.map((loan) => (
        <div key={loan.id} role="listitem">
          {onLoanClick ? (
            <LoanedDeviceCard
              loan={loan}
              onClick={() => onLoanClick(loan)}
            />
          ) : (
            <LoanedDeviceCard loan={loan} />
          )}
        </div>
      ))}
    </div>
  );
});
