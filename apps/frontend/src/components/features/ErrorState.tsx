import { TouchButton } from '@/components/ui/touch-button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-destructive text-center">Fehler beim Laden der Geräte</p>
      <p className="text-muted-foreground text-sm text-center">{getUserFriendlyErrorMessage(error)}</p>
      {onRetry && (
        <TouchButton onClick={onRetry} touchSize="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut versuchen
        </TouchButton>
      )}
    </div>
  );
}
