import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useDevices } from '@/api/devices';
import { DeviceCard } from './DeviceCard';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { TouchButton } from '@/components/ui/touch-button';
import { PackageOpen, RefreshCw, AlertCircle, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';

// Constants
const EMPTY_STATE_MIN_HEIGHT = 'min-h-[200px]';
const ERROR_AUTO_DISMISS_MS = 5000;

export function DeviceList() {
  const navigate = useNavigate();
  const { data: devices, isLoading, isFetching, isError, error, refetch } = useDevices();
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigate to loan page when a device is selected for borrowing
  const handleDeviceSelect = useCallback((deviceId: string) => {
    navigate({ to: '/loan', search: { deviceId } });
  }, [navigate]);

  // Handler with error handling for refresh button
  const handleRefresh = useCallback(async () => {
    // Clear any existing timeout to prevent race conditions
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setRefreshError(null);
    try {
      await refetch();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed');
      setRefreshError(error);
      // Clear error after 5 seconds
      timeoutRef.current = setTimeout(() => setRefreshError(null), ERROR_AUTO_DISMISS_MS);
    }
  }, [refetch]);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  // Empty state when no devices exist
  if (!devices || devices.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-4", EMPTY_STATE_MIN_HEIGHT)}>
        <PackageOpen className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">Keine Geräte vorhanden</p>
        <p className="text-sm text-muted-foreground text-center">
          Es wurden noch keine Geräte im System erfasst.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="flex justify-between items-center px-4 py-3">
        <h1 className="text-xl font-semibold">Geräte</h1>
        <div className="flex items-center gap-2">
          <TouchButton
            touchSize="lg"
            variant="outline"
            asChild
            className="text-muted-foreground/50 hover:text-foreground"
          >
            <Link to="/admin" aria-label="Admin-Bereich">
              <Lock className="h-5 w-5" />
            </Link>
          </TouchButton>
          <TouchButton
            touchSize="lg"
            variant="outline"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Geräteliste aktualisieren"
          >
            <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
          </TouchButton>
        </div>
      </header>
      {refreshError && (
        <div
          className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Aktualisierung fehlgeschlagen</p>
            <p className="text-sm text-destructive/90 mt-1">{getUserFriendlyErrorMessage(refreshError)}</p>
          </div>
          <TouchButton
            type="button"
            onClick={() => setRefreshError(null)}
            variant="ghost"
            touchSize="md"
            className="text-destructive hover:text-destructive/80"
            aria-label="Fehlermeldung schließen"
          >
            <X className="h-5 w-5" />
          </TouchButton>
        </div>
      )}
      {/* Screen Reader Announcement */}
      <div role="status" className="sr-only">
        {!isFetching && devices && `${devices.length} Geräte geladen`}
      </div>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4"
        data-testid="device-list"
      >
        {devices.map(device => (
          <DeviceCard key={device.id} device={device} onSelect={handleDeviceSelect} />
        ))}
      </div>
    </>
  );
}
