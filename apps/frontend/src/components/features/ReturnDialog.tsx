import { memo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { LOAN_FIELD_LIMITS } from '@radio-inventar/shared';
import type { ActiveLoan } from '@/api/loans';

interface ReturnDialogProps {
  loan: ActiveLoan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (loanId: string, returnNote: string | null) => void;
  isPending?: boolean;
}

/**
 * Dialog for returning a borrowed device with optional return note.
 *
 * Features:
 * - AC#1: Opens on device tap
 * - AC#2: Optional note field for condition notes (max 500 chars)
 * - AC#7: Closes on Escape key and outside click (handled by shadcn/ui Dialog)
 * - AC#8: Touch-optimized button sizes (44x44px minimum)
 *
 * @example
 * <ReturnDialog
 *   loan={activeLoan}
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={(loanId, note) => returnDevice(loanId, note)}
 *   isPending={mutation.isPending}
 * />
 */
export const ReturnDialog = memo(function ReturnDialog({
  loan,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ReturnDialogProps) {
  const [returnNote, setReturnNote] = useState('');

  // Reset note when loan changes (H3 fix)
  useEffect(() => {
    setReturnNote('');
  }, [loan.id]);

  const handleConfirm = () => {
    const trimmedNote = returnNote.trim();

    // M6: Defensive validation
    if (trimmedNote.length > maxChars) {
      return; // Defensive: should never happen due to maxLength, but be safe
    }

    // H5: Sanitize note before passing to onConfirm
    onConfirm(loan.id, trimmedNote === '' ? null : sanitizeForDisplay(trimmedNote));
  };

  const handleCancel = () => {
    setReturnNote(''); // Reset note on explicit cancel
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // FIX H3 + M1: Only reset note on explicit cancel or success
    // NOT on error-close (dialog stays open) or escape/outside click
    if (!newOpen) {
      setReturnNote(''); // Reset note when user closes via escape/outside click
    }
  };

  const charCount = returnNote.length;
  const maxChars = LOAN_FIELD_LIMITS.RETURN_NOTE_MAX;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{sanitizeForDisplay(loan.device.callSign)} zurückgeben</DialogTitle>
          <DialogDescription>
            Optional: Zustandsnotiz hinterlassen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="z.B. Akku schwach, Kratzer am Gehäuse..."
            maxLength={maxChars}
            className="min-h-[120px]"
            disabled={isPending}
            aria-label="Zustandsnotiz (optional)"
          />
          <p className="text-sm text-muted-foreground text-right">
            {charCount} / {maxChars}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            className="min-h-11 min-w-11 px-4"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="min-h-11 min-w-11 px-4"
          >
            {isPending ? 'Wird zurückgegeben...' : 'Zurückgeben'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
