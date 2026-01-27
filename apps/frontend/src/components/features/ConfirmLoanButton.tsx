import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useCreateLoan } from '@/api/loans';
import { cn } from '@/lib/utils';
import { sanitizeForDisplay } from '@/lib/sanitize';

/** UI Text Constants */
const BUTTON_TEXT = {
  SAVING: 'Wird gespeichert...',
  DEFAULT: 'Gerät ausleihen',
} as const;

interface ConfirmLoanButtonProps {
  /** Device IDs to loan (CUID2 format) */
  deviceIds: string[];
  /** Name of the borrower */
  borrowerName: string;
  /** Callback when loan is successfully created */
  onSuccess: () => void;
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
  deviceIds,
  borrowerName,
  onSuccess,
  onError,
  className,
}: ConfirmLoanButtonProps) {
  const { mutateAsync } = useCreateLoan();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = borrowerName.trim();
  const isDisabled = deviceIds.length === 0 || !trimmedName || isSubmitting;

  const handleClick = useCallback(async () => {
    if (deviceIds.length === 0 || !trimmedName) return;

    setIsSubmitting(true);
    const sanitizedName = sanitizeForDisplay(trimmedName);

    try {
      await Promise.all(
        deviceIds.map((deviceId) =>
          mutateAsync({ deviceId, borrowerName: sanitizedName })
        )
      );
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unbekannter Fehler'));
    } finally {
      setIsSubmitting(false);
    }
  }, [deviceIds, trimmedName, mutateAsync, onSuccess, onError]);

  const buttonLabel = deviceIds.length > 1 ? 'Geräte ausleihen' : BUTTON_TEXT.DEFAULT;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      size="lg"
      className={cn('w-full gap-2', className)}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{BUTTON_TEXT.SAVING}</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>{buttonLabel}</span>
        </>
      )}
    </Button>
  );
}
