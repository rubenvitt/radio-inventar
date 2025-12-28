// apps/frontend/src/api/admin-history.ts
// Story 6.3: Admin Historie UI mit Filter - API Client Layer
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import {
  HistoryResponseSchema,
  type HistoryFilters,
  type HistoryResponse,
  type HistoryItem,
} from '@radio-inventar/shared';
import { apiClient, ApiError } from './client';
// [AI-Review Fix] HIGH: Import HistoryQueryFilters from queryKeys.ts to avoid type duplication (DRY)
import { adminHistoryKeys, adminDeviceKeys, type HistoryQueryFilters } from '@/lib/queryKeys';

// Re-export types for convenience
export type { HistoryFilters, HistoryResponse, HistoryItem };

// === CONSTANTS ===

/** Cache time for history data (30 seconds) */
const HISTORY_CACHE_TIME_MS = 30_000;

/** Cache time for device filter options (60 seconds) */
const DEVICE_FILTER_CACHE_TIME_MS = 60_000;

// === ERROR MESSAGES (AC7) ===

/**
 * German error messages for history API errors
 * Maps HTTP status codes to user-friendly German messages
 * Note: 500 errors are handled by the fallback in getHistoryErrorMessage
 */
export const HISTORY_API_ERRORS: Record<number, string> = {
  400: 'Ungültige Filterparameter',
  401: 'Authentifizierung erforderlich',
  429: 'Zu viele Anfragen. Bitte kurz warten.',
};

/**
 * Maps API errors to user-friendly German messages (AC7)
 * Handles ApiError, network errors, and generic errors
 */
export function getHistoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const customMessage = HISTORY_API_ERRORS[error.status];
    if (customMessage) return customMessage;
    if (error.status >= 500) {
      return 'Server-Fehler. Bitte Admin kontaktieren.';
    }
  }

  // Network error detection
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

  return 'Historie konnte nicht geladen werden';
}

// === FILTER TYPES ===

// Re-export HistoryQueryFilters for convenience (imported from queryKeys.ts above)
export type { HistoryQueryFilters };

/**
 * Device option for filter dropdown
 */
export interface DeviceOption {
  id: string;
  callSign: string;
}

// === RETRY LOGIC ===

/**
 * Retry configuration with exponential backoff for rate limits
 * Only retries on 429 errors, max 3 retries
 *
 * NOTE: This retry logic is intentionally duplicated from admin-devices.ts
 * Extracting to shared module would add unnecessary complexity for only 2 files.
 * If more API modules need retry logic, consider extracting to @/lib/retry-utils.ts
 */
const retryWithBackoff = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status === 429) {
    return failureCount < 3;
  }
  return false;
};

/**
 * Calculate retry delay with exponential backoff
 * 1st retry: 1000ms, 2nd: 2000ms, 3rd: 4000ms
 */
const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 4000);

// === API FUNCTIONS (Task 1.2) ===

/**
 * Fetch paginated history with optional filters
 * GET /api/admin/history/history
 * AC1, AC2, AC3, AC4, AC5: History with filters and pagination
 */
export async function fetchAdminHistory(filters?: HistoryQueryFilters): Promise<HistoryResponse> {
  const params = new URLSearchParams();

  if (filters?.deviceId) params.append('deviceId', filters.deviceId);
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  params.append('page', String(filters?.page || 1));
  params.append('pageSize', String(filters?.pageSize || 100));
  // H4 FIX: Cache-busting timestamp to bypass React Query cache
  if (filters?._t) params.append('_t', String(filters._t));

  const queryString = params.toString();
  const endpoint = `/api/admin/history/history${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<unknown>(endpoint);
  const validated = HistoryResponseSchema.safeParse(response);

  if (!validated.success) {
    if (process.env.NODE_ENV === 'development') {
      console.error('History response validation error:', validated.error);
      const errorDetail = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid response format from server: ${errorDetail}`);
    }
    // Production: Hide detailed schema errors from user
    throw new Error('Invalid response format from server');
  }

  return validated.data;
}

/**
 * Zod schema for device filter options response validation
 * [AI-Review Fix] CRITICAL: Added Zod validation for runtime safety
 */
const DevicesFilterResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().cuid(),
    callSign: z.string(),
    deviceType: z.string(),
    status: z.string(),
  })),
});

/**
 * Fetch device list for filter dropdown (Task 1.5)
 * Reuses admin devices endpoint to get device options
 * GET /api/admin/devices
 * [AI-Review Fix] CRITICAL: Added Zod validation for response
 */
export async function fetchDevicesForFilter(): Promise<DeviceOption[]> {
  const response = await apiClient.get<unknown>('/api/admin/devices');

  // [AI-Review Fix] CRITICAL: Validate response with Zod schema
  const validated = DevicesFilterResponseSchema.safeParse(response);

  if (!validated.success) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Devices response validation error:', validated.error);
    }
    throw new Error('Invalid device list response from server');
  }

  // Transform to simple options for dropdown
  return validated.data.data.map(device => ({
    id: device.id,
    callSign: device.callSign,
  }));
}

// === REACT QUERY HOOKS (Task 1.3) ===

/**
 * Hook for fetching admin history with filters
 * AC1-AC7: History list with error handling and 401 redirect
 * [AI-Review Fix] HIGH: Use useEffect to prevent race condition and multiple redirects
 */
export function useAdminHistory(filters?: HistoryQueryFilters) {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const query = useQuery({
    queryKey: adminHistoryKeys.list(filters),
    queryFn: () => fetchAdminHistory(filters),
    staleTime: HISTORY_CACHE_TIME_MS,
    retry: retryWithBackoff,
    retryDelay,
  });

  // Handle 401 redirect with useEffect to prevent race conditions and memory leaks
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401 && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate({ to: '/admin/login' });
    }
  }, [query.error, navigate]);

  return query;
}

/**
 * Hook for fetching device options for filter dropdown (Task 1.5)
 * AC2: Device filter dropdown options
 * [AI-Review Fix] HIGH: Added 401 redirect handling for consistency
 */
export function useDevicesForFilter() {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const query = useQuery({
    queryKey: adminDeviceKeys.list(undefined),
    queryFn: fetchDevicesForFilter,
    staleTime: DEVICE_FILTER_CACHE_TIME_MS,
    retry: retryWithBackoff,
    retryDelay,
  });

  // [AI-Review Fix] HIGH: Handle 401 redirect with useEffect to prevent memory leaks
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401 && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate({ to: '/admin/login' });
    }
  }, [query.error, navigate]);

  return query;
}
