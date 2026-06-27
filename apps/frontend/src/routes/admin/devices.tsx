// apps/frontend/src/routes/admin/devices.tsx
// Read-only device list. Devices are managed in radio-admin; this page only
// displays the loanable devices (with their composed status).
import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { DeviceTable } from '@/components/features/admin/DeviceTable';
import { PrintTemplateButton } from '@/components/features/admin/PrintTemplateButton';
import { useAdminDevices } from '@/api/admin-devices';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';
import { RefreshCw, AlertCircle, Info } from 'lucide-react';

export const Route = createFileRoute('/admin/devices')({
  component: AdminDevicesPage,
});

function DevicesErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const errorMessage = getUserFriendlyErrorMessage(error instanceof Error ? error : null);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Fehler beim Laden</h2>
        <p className="text-muted-foreground max-w-md">{errorMessage}</p>
      </div>
      <Button onClick={resetErrorBoundary} className="min-h-16">
        <RefreshCw className="mr-2 h-4 w-4" />
        Erneut versuchen
      </Button>
    </div>
  );
}

function AdminDevicesPage() {
  return (
    <ErrorBoundary FallbackComponent={DevicesErrorFallback}>
      <DevicesContent />
    </ErrorBoundary>
  );
}

function DevicesContent() {
  const { data: devices = [], isLoading, isFetching, refetch, isError, error } = useAdminDevices();

  if (isError) {
    throw error; // Thrown in render → Error Boundary catches
  }

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Geräte</h1>
        <div className="flex items-center gap-2">
          <PrintTemplateButton disabled={isFetching} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            className="min-h-16 min-w-16"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div
        className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
      >
        <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Die Geräte werden zentral in <span className="font-medium text-foreground">radio-admin</span> verwaltet
          und hier nur angezeigt. Es werden die als ausleihbar markierten Funkgeräte dargestellt.
        </p>
      </div>

      <ErrorBoundary FallbackComponent={DevicesErrorFallback}>
        <DeviceTable devices={devices} isLoading={isLoading} isFetching={isFetching} />
      </ErrorBoundary>
    </div>
  );
}
