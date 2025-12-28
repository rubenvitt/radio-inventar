import { memo, useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  generateHistoryCSV,
  downloadCSV,
  generateExportFilename,
  fetchAllHistoryPages,
  ExportSizeLimitError
} from '@/lib/csv-export';
import { getHistoryErrorMessage, type HistoryQueryFilters } from '@/api/admin-history';

interface ExportButtonProps {
  filters?: Omit<HistoryQueryFilters, 'page' | 'pageSize'> | undefined;
  deviceCallSign?: string | undefined;
  disabled?: boolean | undefined;
}

/**
 * CSV Export button for admin history page
 * AC1: Export button with Download icon
 * AC6: Loading state with spinner and progress
 * AC7: Error handling with German toasts
 * AC9: Empty results warning
 * AC10: Size limit warning
 * AC11: Partial failure warning
 */
export const ExportButton = memo(function ExportButton({
  filters,
  deviceCallSign,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress('Lade Daten...');

    try {
      const result = await fetchAllHistoryPages(filters);

      // AC9: Empty results
      if (result.data.length === 0) {
        toast.info('Keine Daten zum Exportieren');
        return;
      }

      // AC11: Partial failure warning
      if (result.partial) {
        toast.warning('Export unvollständig - nicht alle Daten geladen');
      }

      setProgress('Erstelle CSV...');
      // H2: Add hint row at end of CSV when partial-failure occurs
      const csv = generateHistoryCSV(result.data, result.partial);
      const filename = generateExportFilename(deviceCallSign);

      downloadCSV(csv, filename);
      // M1: Fix German pluralization ("1 Eintrag" vs "X Einträge")
      const count = result.data.length;
      const pluralSuffix = count === 1 ? 'Eintrag' : 'Einträge';
      toast.success(`${count} ${pluralSuffix} exportiert`);

    } catch (error) {
      // AC10: Size limit
      if (error instanceof ExportSizeLimitError) {
        toast.error(error.message);
      } else if (error instanceof TypeError && error.message?.includes('Blob')) {
        toast.error('Download fehlgeschlagen - Browser unterstützt Export nicht');
      } else {
        // AC7: Error handling
        toast.error(getHistoryErrorMessage(error));
      }
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [filters?.deviceId, filters?.from, filters?.to, deviceCallSign]);

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleExport}
      disabled={disabled || isExporting}
      aria-label="Historie als CSV exportieren"
      className="min-h-16 gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress || 'Exportiere...'}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          CSV Export
        </>
      )}
    </Button>
  );
});
