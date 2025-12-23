// apps/frontend/src/api/admin-dashboard.ts
// Story 6.2: Admin Dashboard UI - API Client Layer
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { DashboardStatsSchema, type DashboardStats } from '@radio-inventar/shared';
import { apiClient, ApiError } from './client';
import { adminDashboardKeys } from '@/lib/queryKeys';

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

  // Zod validation with parse (throws on validation error)
  // Validation errors are logged to console and thrown
  try {
    const validated = DashboardStatsSchema.parse(response);
    return validated;
  } catch (error) {
    // Log Zod validation errors to console for debugging
    console.error('Dashboard validation error:', error);
    throw new Error('Ungültige Serverantwort. Bitte Admin kontaktieren.');
  }
}

// === React Query Hooks ===

/**
 * Hook for fetching admin dashboard statistics
 *
 * Features:
 * - Auto-redirect to /admin/login on 401 (session expired)
 * - 30 second cache (staleTime)
 * - Single retry on failure
 * - Error handling for 401, 429, 500, network errors
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useAdminDashboard();
 * ```
 */
export function useAdminDashboard() {
  const navigate = useNavigate();

  return useQuery({
    queryKey: adminDashboardKeys.stats(),
    queryFn: fetchAdminDashboard,
    staleTime: 30_000, // 30 seconds
    retry: 1, // Retry once on failure
    throwOnError: (error) => {
      // Auto-redirect to /admin/login on 401 (unauthorized)
      if (error instanceof ApiError && error.status === 401) {
        navigate({ to: '/admin/login' });
        return false; // Don't throw after redirect
      }
      return true; // Throw for other errors
    },
  });
}
