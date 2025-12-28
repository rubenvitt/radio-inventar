import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ActiveLoan } from '@/api/loans';

interface LoanedDeviceCardProps {
  loan: ActiveLoan;
  className?: string;
  onClick?: () => void;
}

/**
 * LoanedDeviceCard Component
 *
 * Displays a loaned device with call sign and borrowedAt timestamp.
 *
 * Features:
 * - Touch-optimized: min-height 56px for easy interaction
 * - XSS Protection: sanitizeForDisplay() on all user inputs
 * - Dark Mode: Tailwind dark: variants for theme support
 * - Performance: memo() wrapper to prevent unnecessary re-renders
 * - Click Interaction: Optional onClick prop makes card interactive with hover/active states
 * - Accessibility: ARIA role, label, and keyboard support (Enter/Space) when clickable
 *
 * @param loan - The active loan to display
 * @param className - Optional additional CSS classes
 * @param onClick - Optional click handler, makes card interactive
 */
export const LoanedDeviceCard = memo(function LoanedDeviceCard({
  loan,
  className,
  onClick
}: LoanedDeviceCardProps) {
  const isClickable = !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      className={cn(
        'min-h-[56px]',
        isClickable && 'cursor-pointer hover:bg-accent/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${sanitizeForDisplay(loan.device.callSign)} zurückgeben` : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
    >
      <CardContent className="p-4">
        <div className="font-semibold text-foreground dark:text-foreground">
          {sanitizeForDisplay(loan.device.callSign)}
        </div>
        <div className="text-sm text-muted-foreground dark:text-muted-foreground">
          Ausgeliehen am {formatDate(loan.borrowedAt)}
        </div>
      </CardContent>
    </Card>
  );
});
