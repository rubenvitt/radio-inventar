// apps/frontend/src/routes/admin/history.tsx
// Story 6.3: Admin Historie UI mit Filter - Route Component
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HistoryFilters } from '@/components/features/admin/HistoryFilters';
import { HistoryTable } from '@/components/features/admin/HistoryTable';
import { HistoryPagination } from '@/components/features/admin/HistoryPagination';
import { ExportButton } from '@/components/features/admin/ExportButton';
import {
  useAdminHistory,
  useDevicesForFilter,
  getHistoryErrorMessage,
  type HistoryQueryFilters,
} from '@/api/admin-history';
import { RefreshCw, AlertCircle } from 'lucide-react';

// === URL Search Params Schema (AC5) ===

// [AI-Review Fix] CRITICAL: Added CUID validation for deviceId
// [AI-Review Fix] HIGH: Added datetime validation for date strings
const historySearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().catch(1),
  pageSize: z.coerce.number().int().min(1).max(1000).optional().catch(100),
  deviceId: z.string().cuid().optional().catch(undefined),
  from: z.string().datetime().optional().catch(undefined),
  to: z.string().datetime().optional().catch(undefined),
});

// Type is inferred from validateSearch, no need for explicit type alias

// === Route Definition ===

export const Route = createFileRoute('/admin/history')({
  validateSearch: historySearchSchema,
  component: AdminHistoryPage,
});

// === Skeleton Component (AC6) ===

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter Skeleton */}
      <div className="flex gap-4 flex-wrap">
        <Skeleton className="h-16 w-[200px]" />
        <Skeleton className="h-16 w-[160px]" />
        <Skeleton className="h-16 w-[160px]" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-2 border rounded-md p-4">
        <Skeleton className="h-12 w-full" /> {/* Header */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

// === Error Component (AC7) ===

interface HistoryErrorProps {
  error: unknown;
  onRetry: () => void;
}

function HistoryError({ error, onRetry }: HistoryErrorProps) {
  const errorMessage = getHistoryErrorMessage(error);

  return (
    <Card className="p-8">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" aria-hidden="true" />
        <p className="text-lg">{errorMessage}</p>
        <Button onClick={onRetry} size="lg" className="min-h-16">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Erneut versuchen
        </Button>
      </div>
    </Card>
  );
}

// === Empty State with Filter Context (AC8) ===

interface EmptyStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
}

function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  return (
    <Card className="p-8">
      <div className="text-center space-y-4">
        <p className="text-lg text-muted-foreground">
          {hasFilters
            ? 'Keine Ausleihen für die gewählten Filter.'
            : 'Keine Ausleihen gefunden'}
        </p>
        {hasFilters && (
          <Button variant="outline" onClick={onResetFilters} size="lg" className="min-h-16">
            Filter zurücksetzen?
          </Button>
        )}
      </div>
    </Card>
  );
}

// === Error Boundary Fallback ===
// [AI-Review Fix] CRITICAL: ErrorBoundary fallback now properly resets and triggers refetch
// The resetErrorBoundary clears the error state, allowing HistoryContent to remount and refetch

function HistoryErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  // resetErrorBoundary clears the error boundary state
  // This causes HistoryContent to remount, which triggers useAdminHistory to refetch
  return <HistoryError error={error} onRetry={resetErrorBoundary} />;
}

// === Main Page Component ===

function AdminHistoryPage() {
  return (
    <ErrorBoundary FallbackComponent={HistoryErrorFallback}>
      <HistoryContent />
    </ErrorBoundary>
  );
}

// === Content Component ===

function HistoryContent() {
  const navigate = useNavigate();
  // [AI-Review Fix] HIGH: Remove type cast - TanStack Router provides type-safe validation via validateSearch
  const search = useSearch({ from: '/admin/history' });

  // Build filters from URL params (AC5)
  const filters: HistoryQueryFilters = {
    page: search.page || 1,
    pageSize: search.pageSize || 100,
    deviceId: search.deviceId,
    from: search.from,
    to: search.to,
  };

  // Check if any filters are active
  const hasActiveFilters = Boolean(filters.deviceId || filters.from || filters.to);

  // Fetch history data
  const { data, isLoading, error, refetch, isFetching } = useAdminHistory(filters);

  // Fetch devices to get callSign for export filename (Story 6.4)
  const { data: devices = [] } = useDevicesForFilter();
  const selectedDeviceCallSign = filters.deviceId
    ? devices.find(d => d.id === filters.deviceId)?.callSign
    : undefined;

  // Handle filter changes - update URL and reset to page 1 (AC5)
  // [AI-Review Fix] CRITICAL: Only preserve page when ONLY page is changing
  const handleFilterChange = (newFilters: Partial<HistoryQueryFilters>) => {
    const isOnlyPageChange = Object.keys(newFilters).length === 1 && 'page' in newFilters;

    navigate({
      to: '/admin/history',
      search: {
        ...filters,
        ...newFilters,
        // Reset to page 1 when filters change (except when ONLY changing page)
        page: isOnlyPageChange ? newFilters.page : 1,
      },
    });
  };

  // Reset all filters
  // [AI-Review Fix] MEDIUM: Explicitly set deviceId/from/to to undefined to clear filters
  const handleResetFilters = () => {
    navigate({
      to: '/admin/history',
      search: {
        page: 1,
        pageSize: filters.pageSize,
        deviceId: undefined,
        from: undefined,
        to: undefined,
      },
    });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader onRefresh={refetch} isFetching={isFetching} />
        <HistoryError error={error} onRetry={refetch} />
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader onRefresh={refetch} isFetching={true} />
        <HistorySkeleton />
      </div>
    );
  }

  // Handle empty state
  // [AI-Review Fix] HIGH: Only check isEmpty when data exists to prevent layout shift
  const isEmpty = data && data.data.length === 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader onRefresh={refetch} isFetching={isFetching} />

      {/* Filters and Export Button (AC2, AC3, AC4, Story 6.4) */}
      {/* [AI-Review Fix] CRITICAL: Use isFetching to disable during refetch, preventing race conditions */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <HistoryFilters
          filters={filters}
          onChange={handleFilterChange}
          disabled={isFetching}
        />
        {/* Story 6.4: CSV Export Button (AC1) */}
        <ExportButton
          filters={{
            deviceId: filters.deviceId,
            from: filters.from,
            to: filters.to,
          }}
          deviceCallSign={selectedDeviceCallSign}
          disabled={isFetching}
        />
      </div>

      {/* Content - [AI-Review Fix] HIGH: Proper null check for data to prevent layout shift */}
      {isEmpty ? (
        <EmptyState hasFilters={hasActiveFilters} onResetFilters={handleResetFilters} />
      ) : data ? (
        <>
          {/* Table (AC1) */}
          <HistoryTable data={data.data} isFetching={isFetching} />

          {/* Pagination (AC5) */}
          <HistoryPagination
            meta={data.meta}
            onPageChange={handlePageChange}
            disabled={isFetching}
          />
        </>
      ) : null}
    </div>
  );
}

// === Page Header Component ===

interface PageHeaderProps {
  onRefresh: () => void;
  isFetching: boolean;
}

function PageHeader({ onRefresh, isFetching }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center flex-wrap gap-4">
      <h1 className="text-2xl font-bold">Ausleihe-Historie</h1>
      <Button
        onClick={() => onRefresh()}
        disabled={isFetching}
        size="lg"
        variant="outline"
        className="min-h-16"
        aria-label="Aktualisieren"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {isFetching ? 'Lädt...' : 'Aktualisieren'}
      </Button>
    </div>
  );
}
