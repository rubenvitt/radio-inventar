// apps/frontend/src/api/admin-dashboard.ts
// Story 6.2: Admin Dashboard UI - API Client Layer
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { DashboardStatsSchema, type DashboardStats } from '@radio-inventar/shared';
import { apiClient, ApiError } from './client';
import { adminDashboardKeys } from '@/lib/queryKeys';

// === Constants ===

/** Dashboard data cache time in milliseconds (30 seconds per AC5) */
const DASHBOARD_CACHE_TIME_MS = 30_000;

// === Error Messages (German) ===

const DASHBOARD_API_ERRORS: Record<number, string> = {
  401: 'Authentifizierung erforderlich',
  429: 'Zu viele Anfragen. Bitte kurz warten.',
  500: 'Server-Fehler. Bitte Admin kontaktieren.',
};

/**
 * Maps API errors to user-friendly German messages
 * Handles Network, 401, 429, 500 errors as per AC requirements
 */
export function getDashboardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const customMessage = DASHBOARD_API_ERRORS[error.status];
    if (customMessage) {
      return customMessage;
    }
    if (error.status >= 500) {
      return 'Server-Fehler. Bitte Admin kontaktieren.';
    }
  }

  // Network errors: fetch failed, network error, etc.
  if (error instanceof Error) {
    const message = error.message?.toLowerCase() || '';
    if (
      message.includes('fetch failed') ||
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('network request failed') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout')
    ) {
      return 'Keine Verbindung zum Server';
    }
  }

  return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
}

// === Response Schemas ===

/**
 * CRITICAL FIX #1: Response wrapper schema
 * API returns { data: DashboardStats } but code was parsing response directly
 */
const DashboardResponseSchema = z.object({
  data: DashboardStatsSchema,
});

// === API Functions ===

/**
 * Fetch admin dashboard statistics
 * GET /api/admin/history/dashboard
 *
 * Returns device counts by status and up to 50 active loans
 * Rate limit: 30 req/min
 *
 * @throws {ApiError} On API errors (401, 429, 500)
 * @throws {Error} On validation errors
 */
export async function fetchAdminDashboard(): Promise<DashboardStats> {
  const response = await apiClient.get<unknown>('/api/admin/history/dashboard');

  // CRITICAL FIX #1: Validate response wrapper and return unwrapped data
  // Zod validation with parse (throws on validation error)
  // Validation errors are logged to console and thrown
  try {
    const validated = DashboardResponseSchema.parse(response);
    return validated.data;
  } catch (error) {
    // Log Zod validation errors to console for debugging (dev only)
    if (import.meta.env.DEV) {
      console.error('Dashboard validation error:', error);
    }
    throw new Error('Ungültige Serverantwort. Bitte Admin kontaktieren.');
  }
}

// === React Query Hooks ===

/**
 * HIGH FIX #3: Calculate retry delay with exponential backoff
 * 1st retry: 1000ms, 2nd: 2000ms, 3rd: 4000ms
 */
const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 4000);

/**
 * Hook for fetching admin dashboard statistics
 *
 * Features:
 * - Auto-redirect to /admin/login on 401 (session expired)
 * - 30 second cache (staleTime)
 * - HIGH FIX #3: Exponential backoff retry for 429 errors
 * - Error handling for 401, 429, 500, network errors
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useAdminDashboard();
 * // Component should handle 401 redirect via useEffect or check error
 * ```
 */
export function useAdminDashboard() {
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: adminDashboardKeys.stats(),
    queryFn: fetchAdminDashboard,
    staleTime: DASHBOARD_CACHE_TIME_MS,
    // HIGH FIX #3: Only retry on 429 errors with exponential backoff
    retry: (failureCount, error) => {
      // Only retry on 429 (rate limit) errors
      if (error instanceof ApiError && error.status === 429) {
        // Max 3 retries with exponential backoff
        return failureCount < 3;
      }
      // Don't retry other errors
      return false;
    },
    retryDelay,
  });

  // HIGH FIX #2: Handle 401 redirect outside of query options (React Query v5 compatible)
  // Navigate to login on 401 error
  if (query.error instanceof ApiError && query.error.status === 401) {
    navigate({ to: '/admin/login' });
  }

  return query;
}
