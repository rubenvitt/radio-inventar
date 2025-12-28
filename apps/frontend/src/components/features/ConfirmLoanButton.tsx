import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useCreateLoan, type CreateLoanResponse } from '@/api/loans';
import { cn } from '@/lib/utils';
import { sanitizeForDisplay } from '@/lib/sanitize';

/** UI Text Constants */
const BUTTON_TEXT = {
  SAVING: 'Wird gespeichert...',
  DEFAULT: 'Gerät ausleihen',
} as const;

interface ConfirmLoanButtonProps {
  /** Device ID to loan (CUID2 format) */
  deviceId: string | null;
  /** Name of the borrower */
  borrowerName: string;
  /** Callback when loan is successfully created */
  onSuccess: (loan: CreateLoanResponse) => void;
  /** Callback when loan creation fails */
  onError: (error: Error) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button to confirm a device loan.
 * Shows loading state during API request.
 * AC#1: Sofort "wird gespeichert" anzeigen (< 100ms via isPending)
 * AC#2: Optimistic UI (Button disabled, Spinner)
 * AC#6: Disabled wenn kein Gerät oder Name
 * AC#7: min-height 44px (via size="lg")
 */
export function ConfirmLoanButton({
  deviceId,
  borrowerName,
  onSuccess,
  onError,
  className,
}: ConfirmLoanButtonProps) {
  const { mutate, isPending } = useCreateLoan();

  const trimmedName = borrowerName.trim();
  const isDisabled = !deviceId || !trimmedName || isPending;

  const handleClick = useCallback(() => {
    if (!deviceId || !trimmedName) return;

    const sanitizedName = sanitizeForDisplay(trimmedName);

    mutate(
      { deviceId, borrowerName: sanitizedName },
      {
        onSuccess: (loan) => onSuccess(loan),
        onError: (error) =>
          onError(error instanceof Error ? error : new Error('Unbekannter Fehler')),
      }
    );
  }, [deviceId, trimmedName, mutate, onSuccess, onError]);

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      size="lg"
      className={cn('w-full gap-2', className)}
      aria-busy={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{BUTTON_TEXT.SAVING}</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>{BUTTON_TEXT.DEFAULT}</span>
        </>
      )}
    </Button>
  );
}
