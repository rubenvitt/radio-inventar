// apps/frontend/src/components/features/admin/ActiveLoansList.tsx
// Story 6.2: Admin Dashboard UI - Active Loans List Component
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
function LoanItem({ loan, formattedTime }: LoanItemProps & { formattedTime: string }) {
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
  // CRITICAL: XSS Protection + Date Parsing with useMemo
  // Sanitize all user-generated content AND parse dates before rendering
  // Memoized to avoid re-sanitizing and re-parsing on every render (performance)
  const sanitizedLoansWithTime = useMemo(
    () => loans.map(loan => ({
      ...loan,
      device: {
        callSign: sanitizeForDisplay(loan.device.callSign),
        deviceType: sanitizeForDisplay(loan.device.deviceType),
      },
      borrowerName: sanitizeForDisplay(loan.borrowerName),
      formattedTime: formatDistanceToNow(new Date(loan.borrowedAt), {
        addSuffix: true,
        locale: de,
      }),
    })),
    [loans]
  );

  // Empty state (AC2)
  if (sanitizedLoansWithTime.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Keine Geräte ausgeliehen</p>
        </CardContent>
      </Card>
    );
  }

  // Loans list with max display limit
  const displayedLoans = sanitizedLoansWithTime.slice(0, maxDisplay);
  const remainingCount = sanitizedLoansWithTime.length - maxDisplay;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktuell ausgeliehen ({sanitizedLoansWithTime.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedLoans.map(loan => (
            <LoanItem key={loan.id} loan={loan} formattedTime={loan.formattedTime} />
          ))}
          {remainingCount > 0 && (
            <div className="text-center pt-4">
              <Button variant="outline" asChild>
                <Link to="/admin/history">
                  ...und {remainingCount} {remainingCount === 1 ? 'weiteres Gerät' : 'weitere'} ansehen
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
