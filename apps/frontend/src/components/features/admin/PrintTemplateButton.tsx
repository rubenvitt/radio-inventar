import { memo, useCallback, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  downloadPrintTemplate,
  triggerBlobDownload,
  getPrintErrorMessage,
} from '@/api/admin-print';

interface PrintTemplateButtonProps {
  disabled?: boolean | undefined;
}

/**
 * Story 6.5: Print Template Button for admin device list page
 *
 * AC1: Admin can download PDF from /admin/devices
 * AC5: Error handling with German messages
 */
export const PrintTemplateButton = memo(function PrintTemplateButton({
  disabled = false,
}: PrintTemplateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);

    try {
      const blob = await downloadPrintTemplate();

      // Generate filename with current date (YYYY-MM-DD format)
      const date = new Date().toISOString().split('T')[0];
      const filename = `geraete-liste-${date}.pdf`;

      triggerBlobDownload(blob, filename);
      toast.success('PDF heruntergeladen');
    } catch (error) {
      // AC5: German error messages
      toast.error(getPrintErrorMessage(error));
      console.error('PDF download error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleDownload}
      disabled={disabled || isLoading}
      aria-label="Druckvorlage als PDF herunterladen"
      className="min-h-16 gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Erstelle PDF...
        </>
      ) : (
        <>
          <Printer className="h-4 w-4" />
          Druckvorlage erstellen
        </>
      )}
    </Button>
  );
});
