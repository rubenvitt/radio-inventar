// apps/frontend/src/components/features/admin/ActiveLoansList.tsx
// Story 6.2: Admin Dashboard UI - Active Loans List Component
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeForDisplay } from '@/lib/sanitize';
import type { DashboardStats } from '@radio-inventar/shared';

// Extract the ActiveLoan type from DashboardStats
type ActiveLoan = DashboardStats['activeLoans'][number];

interface ActiveLoansListProps {
  loans: ActiveLoan[];
  maxDisplay?: number;
}

interface LoanItemProps {
  loan: ActiveLoan;
}

/**
 * LoanItem sub-component
 * Displays a single active loan with device info, borrower, and relative time
 * Touch-optimized with min-height 64px per AC6
 */
function LoanItem({ loan }: LoanItemProps) {
  const formattedTime = formatDistanceToNow(new Date(loan.borrowedAt), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 min-h-[64px] items-center"
      data-testid="active-loan-item"
    >
      {/* Device Info + Borrower */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold" data-testid="loan-callsign">
            {loan.device.callSign}
          </span>
          <span className="text-sm text-muted-foreground" data-testid="loan-devicetype">
            {loan.device.deviceType}
          </span>
        </div>
        <div className="text-sm" data-testid="loan-borrower">
          {loan.borrowerName}
        </div>
      </div>

      {/* Time */}
      <div className="text-sm text-muted-foreground whitespace-nowrap" data-testid="loan-time">
        {formattedTime}
      </div>
    </div>
  );
}

/**
 * ActiveLoansList Component
 *
 * Displays list of active loans with XSS protection
 *
 * Features:
 * - Empty state when no loans
 * - Max display limit (default 50)
 * - German date formatting with date-fns
 * - XSS protection with useMemo sanitization
 * - Touch-optimized (64px min height per row)
 * - "...und X weitere" link if more than maxDisplay
 *
 * @param loans - Array of active loans from dashboard API
 * @param maxDisplay - Maximum number of loans to display (default: 50)
 */
export function ActiveLoansList({ loans, maxDisplay = 50 }: ActiveLoansListProps) {
  // CRITICAL: XSS Protection with useMemo
  // Sanitize all user-generated content before rendering
  // Memoized to avoid re-sanitizing on every render (performance)
  const sanitizedLoans = useMemo(
    () => loans.map(loan => ({
      ...loan,
      device: {
        callSign: sanitizeForDisplay(loan.device.callSign),
        deviceType: sanitizeForDisplay(loan.device.deviceType),
      },
      borrowerName: sanitizeForDisplay(loan.borrowerName),
    })),
    [loans]
  );

  // Empty state (AC2)
  if (sanitizedLoans.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Keine Geräte ausgeliehen</p>
        </CardContent>
      </Card>
    );
  }

  // Loans list with max display limit
  const displayedLoans = sanitizedLoans.slice(0, maxDisplay);
  const remainingCount = sanitizedLoans.length - maxDisplay;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktuell ausgeliehen ({sanitizedLoans.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedLoans.map(loan => (
            <LoanItem key={loan.id} loan={loan} />
          ))}
          {remainingCount > 0 && (
            <div className="text-center pt-4 text-muted-foreground">
              ...und {remainingCount} weitere
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
