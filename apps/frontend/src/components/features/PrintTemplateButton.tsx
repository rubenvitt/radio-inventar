import { memo, useCallback, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  downloadPublicPrintTemplate,
  triggerBlobDownload,
  getPrintErrorMessage,
} from '@/api/print';

/**
 * Public Print Template Button for navigation footer
 * Styled to match ThemeToggle (64x64px touch target)
 */
export const PrintTemplateButton = memo(function PrintTemplateButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);

    try {
      const blob = await downloadPublicPrintTemplate();

      // Generate filename with current date (YYYY-MM-DD format)
      const date = new Date().toISOString().split('T')[0];
      const filename = `geraete-liste-${date}.pdf`;

      triggerBlobDownload(blob, filename);
      toast.success('PDF heruntergeladen');
    } catch (error) {
      toast.error(getPrintErrorMessage(error));
      console.error('PDF download error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={cn(
        // Touch-Target: 64x64px (WCAG AAA)
        'flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-lg',
        'transition-colors touch-manipulation',
        'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      aria-label="Druckvorlage als PDF herunterladen"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Printer className="h-6 w-6" />
      )}
      <span className="text-xs mt-1 font-medium">
        {isLoading ? 'Lädt...' : 'Drucken'}
      </span>
    </button>
  );
});
