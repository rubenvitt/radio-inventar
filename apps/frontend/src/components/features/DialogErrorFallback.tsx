import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DialogErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const DialogErrorFallback = memo(function DialogErrorFallback({
  error,
  resetErrorBoundary,
}: DialogErrorFallbackProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && resetErrorBoundary()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Fehler</DialogTitle>
          <DialogDescription>
            Der Dialog konnte nicht geladen werden.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4" role="alert" aria-live="assertive">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={resetErrorBoundary}
            className="min-h-11 min-w-11 px-4"
          >
            Erneut versuchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
