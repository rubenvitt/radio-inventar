// apps/frontend/src/routes/admin/index.tsx
// Story 6.2: Admin Dashboard UI - Dashboard Route Component
import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAdminDashboard, getDashboardErrorMessage } from '@/api/admin-dashboard';
import { DashboardStatsCards } from '@/components/features/admin/DashboardStatsCards';
import { ActiveLoansList } from '@/components/features/admin/ActiveLoansList';
import { TouchButton } from '@/components/ui/touch-button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Admin dashboard index route (protected).
 *
 * Story 6.2 - AC1: Dashboard at /admin
 * Story 6.2 - AC2: Statistics cards
 * Story 6.2 - AC3: Active loans list
 * Story 6.2 - AC4: Manual refresh button
 * Story 6.2 - AC5: Loading/error states
 */
export const Route = createFileRoute('/admin/')({
  component: Component,
});

/**
 * Dashboard Skeleton Component
 * Matches final layout exactly to prevent layout shift
 */
function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-16 w-40" /> {/* Refresh button */}
      </div>

      {/* Stats cards skeleton - 4 cards in responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Active loans list skeleton - header + 5 rows */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Error State Component
 * Uses dashboard-specific error messages (getDashboardErrorMessage)
 */
function DashboardError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-destructive text-center" role="alert">
        Dashboard konnte nicht geladen werden
      </p>
      <p className="text-muted-foreground text-sm text-center">
        {getDashboardErrorMessage(error)}
      </p>
      <TouchButton onClick={onRetry} touchSize="lg">
        <RefreshCw className="h-4 w-4 mr-2" />
        Erneut versuchen
      </TouchButton>
    </div>
  );
}

/**
 * Main dashboard component
 * AC1-5: Full dashboard with stats, loans, and refresh
 */
export function Component() {
  const { data, isLoading, error, refetch, isFetching } = useAdminDashboard();

  // AC5: Error state with dashboard-specific error messages
  if (error) return <DashboardError error={error} onRetry={refetch} />;

  // AC5: Loading state
  if (isLoading) return <DashboardSkeleton />;

  // After loading and error guards, data is guaranteed to be defined
  if (!data) return null;

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <DashboardError error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <div className="container mx-auto p-4 space-y-6">
        {/* Header with refresh button - AC4 */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <TouchButton
            onClick={() => refetch()}
            disabled={isFetching}
            touchSize="lg" // 64px height per Story 5.4 standard
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin motion-safe:animate-spin motion-reduce:animate-none' : ''}`} />
            {isFetching ? 'Lädt...' : 'Aktualisieren'}
          </TouchButton>
        </div>

        {/* AC2: Statistics Cards */}
        <DashboardStatsCards stats={data} />

        {/* AC3: Active Loans List */}
        <ActiveLoansList loans={data.activeLoans} />
      </div>
    </ErrorBoundary>
  );
}
