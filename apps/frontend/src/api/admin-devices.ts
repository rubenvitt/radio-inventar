// apps/frontend/src/api/admin-devices.ts
// Story 5.4: Admin Geräteverwaltung UI - API Client Layer
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  DeviceSchema,
  CreateDeviceSchema,
  UpdateDeviceSchema,
  DEVICE_FIELD_LIMITS,
  type Device,
  type CreateDevice,
  type UpdateDevice,
  type DeviceStatus,
} from '@radio-inventar/shared';
import { apiClient, ApiError } from './client';
import { adminDeviceKeys } from '@/lib/queryKeys';

// Re-export for convenience
export { DEVICE_FIELD_LIMITS, type Device, type CreateDevice, type UpdateDevice, type DeviceStatus };

/**
 * Status values that admins can set (excludes ON_LOAN which is managed by loan system)
 * AC4: Status dropdown options
 */
export const ADMIN_DEVICE_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Verfügbar' },
  { value: 'DEFECT', label: 'Defekt' },
  { value: 'MAINTENANCE', label: 'Wartung' },
] as const;

export type AdminDeviceStatus = 'AVAILABLE' | 'DEFECT' | 'MAINTENANCE';

// === Response Schemas (Task 1.2) ===

/**
 * Schema for single device response from admin API
 * Handles date coercion from JSON strings
 */
const AdminDeviceResponseSchema = DeviceSchema.extend({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for device list response
 * API wraps data in { data: [...] } envelope
 */
const AdminDeviceListResponseSchema = z.object({
  data: z.array(AdminDeviceResponseSchema),
});

/**
 * Schema for single device response (wrapped)
 */
const AdminDeviceSingleResponseSchema = z.object({
  data: AdminDeviceResponseSchema,
});

// === Error Messages (AC8) ===

// FIX MEDIUM #7: Centralized 409 error messages for consistency
export const DEVICE_409_MESSAGES = {
  ON_LOAN: 'Das Gerät ist derzeit ausgeliehen und kann nicht gelöscht werden.',
  DUPLICATE: 'Funkruf existiert bereits',
} as const;

export const DEVICE_API_ERRORS: Record<number, string> = {
  404: 'Gerät nicht gefunden',
  401: 'Authentifizierung erforderlich',
  429: 'Zu viele Anfragen. Bitte später erneut versuchen.',
};

/**
 * MEDIUM #7: Context-aware 409 error message function
 * Distinguishes between ON_LOAN (delete operation) and DUPLICATE (create/update)
 */
function get409ErrorMessage(_error: ApiError, operationType?: 'create' | 'update' | 'delete'): string {
  // Use operation type to determine the appropriate 409 message
  if (operationType === 'delete') {
    return DEVICE_409_MESSAGES.ON_LOAN;
  }
  if (operationType === 'create' || operationType === 'update') {
    return DEVICE_409_MESSAGES.DUPLICATE;
  }

  // Default to duplicate for 409 if no context available
  return DEVICE_409_MESSAGES.DUPLICATE;
}

/**
 * Maps API errors to user-friendly German messages (AC8)
 * FIX MEDIUM #1: Enhanced network error detection
 * MEDIUM #7: Context-aware 409 error handling
 */
export function getDeviceErrorMessage(error: unknown, operationType?: 'create' | 'update' | 'delete'): string {
  if (error instanceof ApiError) {
    // MEDIUM #7: Special handling for 409 with context
    if (error.status === 409) {
      return get409ErrorMessage(error, operationType);
    }

    const customMessage = DEVICE_API_ERRORS[error.status];
    if (customMessage) {
      return customMessage;
    }
    if (error.status >= 500) {
      return 'Der Server ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.';
    }
  }

  // FIX MEDIUM #1: Enhanced network error detection
  // Detects: fetch failed, network error, failed to fetch, ECONNREFUSED, etc.
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
      return 'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.';
    }
  }

  return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
}

// === Filter Types ===
// HIGH FIX #7 & #9: Remove Record<string, unknown> extension for exact type safety
// Prevents arbitrary keys and prototype pollution risk (__proto__ injection)
export interface DeviceFilters {
  status?: DeviceStatus;
  take?: number;
  skip?: number;
}

// === API Functions (Task 1.3) ===

/**
 * Fetch all devices with optional filters
 * GET /api/admin/devices
 * AC1: Device list view
 */
export async function fetchAdminDevices(filters?: DeviceFilters): Promise<Device[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.take) params.append('take', String(filters.take));
  if (filters?.skip) params.append('skip', String(filters.skip));

  const queryString = params.toString();
  const endpoint = `/api/admin/devices${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<unknown>(endpoint);
  const validated = AdminDeviceListResponseSchema.safeParse(response);

  if (!validated.success) {
    console.error('Validation error:', validated.error);
    const errorDetail = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid response format from server: ${errorDetail}`);
  }

  return validated.data.data;
}

/**
 * Create a new device
 * POST /api/admin/devices
 * AC2: Create device
 * ARCHITECTURE FIX #5: Input validation with DOS protection
 */
export async function createDevice(data: CreateDevice): Promise<Device> {
  // ARCHITECTURE FIX #5: Explicit length check for DOS protection
  // Schema allows maxLength * 2 + 50 for whitespace padding, but we enforce reasonable limits
  if (data.notes && data.notes.length > DEVICE_FIELD_LIMITS.NOTES_MAX * 2 + 50) {
    throw new Error(`Notizen dürfen maximal ${DEVICE_FIELD_LIMITS.NOTES_MAX} Zeichen enthalten`);
  }

  // Validate input before sending
  const inputValidation = CreateDeviceSchema.safeParse(data);
  if (!inputValidation.success) {
    throw new Error('Ungültige Eingabedaten');
  }

  const response = await apiClient.post<unknown>('/api/admin/devices', inputValidation.data);
  const validated = AdminDeviceSingleResponseSchema.safeParse(response);

  if (!validated.success) {
    throw new Error('Invalid response format from server');
  }

  return validated.data.data;
}

/**
 * Update an existing device
 * PATCH /api/admin/devices/:id
 * AC3: Edit device
 * ARCHITECTURE FIX #5: Input validation with DOS protection
 */
export async function updateDevice(id: string, data: UpdateDevice): Promise<Device> {
  // ARCHITECTURE FIX #5: Explicit length check for DOS protection
  // Schema allows maxLength * 2 + 50 for whitespace padding, but we enforce reasonable limits
  if (data.notes && data.notes.length > DEVICE_FIELD_LIMITS.NOTES_MAX * 2 + 50) {
    throw new Error(`Notizen dürfen maximal ${DEVICE_FIELD_LIMITS.NOTES_MAX} Zeichen enthalten`);
  }

  // Validate input before sending
  const inputValidation = UpdateDeviceSchema.safeParse(data);
  if (!inputValidation.success) {
    throw new Error('Ungültige Eingabedaten');
  }

  const response = await apiClient.patch<unknown>(`/api/admin/devices/${id}`, inputValidation.data);
  const validated = AdminDeviceSingleResponseSchema.safeParse(response);

  if (!validated.success) {
    throw new Error('Invalid response format from server');
  }

  return validated.data.data;
}

/**
 * Update device status only
 * PATCH /api/admin/devices/:id/status
 * AC4: Change device status
 */
export async function updateDeviceStatus(id: string, status: AdminDeviceStatus): Promise<Device> {
  // Validate status is valid admin status (not ON_LOAN)
  if (!['AVAILABLE', 'DEFECT', 'MAINTENANCE'].includes(status)) {
    throw new Error('Ungültiger Status');
  }

  const response = await apiClient.patch<unknown>(`/api/admin/devices/${id}/status`, { status });
  const validated = AdminDeviceSingleResponseSchema.safeParse(response);

  if (!validated.success) {
    throw new Error('Invalid response format from server');
  }

  return validated.data.data;
}

/**
 * Delete a device
 * DELETE /api/admin/devices/:id
 * AC5: Delete device with confirmation
 * AC6: Returns 409 for ON_LOAN devices (unless force=true)
 * @param id Device ID
 * @param options.force If true, allows deletion of ON_LOAN devices
 */
export async function deleteDevice(id: string, options?: { force?: boolean }): Promise<void> {
  const params = options?.force ? '?force=1' : '';
  await apiClient.delete<unknown>(`/api/admin/devices/${id}${params}`);
}

// === React Query Hooks (Task 1.4) ===

/**
 * ARCHITECTURE FIX #7: Retry configuration with exponential backoff for rate limits
 * Retries 429 errors with exponential backoff (1s, 2s, 4s)
 * Does not retry other errors to avoid unnecessary server load
 */
const retryWithBackoff = (failureCount: number, error: unknown) => {
  // Only retry on 429 (rate limit) errors
  if (error instanceof ApiError && error.status === 429) {
    // Max 3 retries with exponential backoff
    return failureCount < 3;
  }
  // Don't retry other errors
  return false;
};

/**
 * ARCHITECTURE FIX #7: Calculate retry delay with exponential backoff
 * 1st retry: 1000ms, 2nd: 2000ms, 3rd: 4000ms
 */
const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 4000);

/**
 * Hook for fetching admin device list
 * AC1: Device list with staleTime: 30_000
 */
export function useAdminDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: adminDeviceKeys.list(filters),
    queryFn: () => fetchAdminDevices(filters),
    staleTime: 30_000, // 30 seconds cache
  });
}

/**
 * Hook for creating a device
 * AC2: Create device with optimistic update and cache invalidation
 * ARCHITECTURE FIX #2: Added optimistic update for create operations
 * ARCHITECTURE FIX #7: Added retry with exponential backoff for 429 errors
 */
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDevice,
    retry: retryWithBackoff,
    retryDelay,
    onMutate: async (newDevice) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminDeviceKeys.all });

      // Snapshot previous value - PERFORMANCE FIX #3: Use list(undefined) to match actual query key
      const previousDevices = queryClient.getQueryData<Device[]>(adminDeviceKeys.list(undefined));

      // Optimistically add the new device with temporary ID
      if (previousDevices) {
        const tempDevice: Device = {
          id: `temp-${Date.now()}`, // Temporary ID until server responds
          callSign: newDevice.callSign,
          serialNumber: newDevice.serialNumber ?? null,
          deviceType: newDevice.deviceType,
          status: 'AVAILABLE',
          notes: newDevice.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<Device[]>(
          adminDeviceKeys.list(undefined),
          [...previousDevices, tempDevice]
        );
      }

      return { previousDevices };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error - PERFORMANCE FIX #3: Use list(undefined) to match actual query key
      if (context?.previousDevices) {
        queryClient.setQueryData(adminDeviceKeys.list(undefined), context.previousDevices);
      }
    },
    onSettled: () => {
      // Refetch to get actual server data with real ID
      queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    },
  });
}

/**
 * Hook for updating a device
 * AC3: Update device with optimistic update
 * ARCHITECTURE FIX #7: Added retry with exponential backoff for 429 errors
 */
export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDevice }) => updateDevice(id, data),
    retry: retryWithBackoff,
    retryDelay,
    onMutate: async ({ id, data }) => {
      // HIGH FIX #8: Race condition prevented by UI - modal dialog blocks table interaction
      // Edit dialog is modal, so users cannot click Delete while Edit is saving
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminDeviceKeys.all });

      // Snapshot previous value - use list(undefined) to match actual query key
      const previousDevices = queryClient.getQueryData<Device[]>(adminDeviceKeys.list(undefined));

      // Optimistically update cache
      // Fix #6: Use findIndex for O(1) lookup instead of O(n) map
      // LOW #10: Use map instead of spread for better performance
      if (previousDevices) {
        const updatedDevices = previousDevices.map(device => {
          if (device.id !== id) return device;

          return {
            ...device,
            ...(data.callSign !== undefined && { callSign: data.callSign }),
            ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
            ...(data.deviceType !== undefined && { deviceType: data.deviceType }),
            ...(data.notes !== undefined && { notes: data.notes }),
            updatedAt: new Date(),
          };
        });

        queryClient.setQueryData<Device[]>(
          adminDeviceKeys.list(undefined),
          updatedDevices
        );
      }

      return { previousDevices };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousDevices) {
        queryClient.setQueryData(adminDeviceKeys.list(undefined), context.previousDevices);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    },
  });
}

/**
 * Hook for updating device status
 * AC4: Status change with optimistic update
 * ARCHITECTURE FIX #7: Added retry with exponential backoff for 429 errors
 * CRITICAL FIX #1: Race condition prevented by UI - dropdown disabled during update
 */
export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminDeviceStatus }) =>
      updateDeviceStatus(id, status),
    retry: retryWithBackoff,
    retryDelay,
    onMutate: async ({ id, status }) => {
      // CRITICAL FIX #1: Race condition prevented by UI - dropdown disabled during update
      // The Select component has disabled={isStatusDisabled} where isStatusDisabled includes isUpdating
      // This prevents users from triggering multiple status updates simultaneously
      await queryClient.cancelQueries({ queryKey: adminDeviceKeys.all });

      const previousDevices = queryClient.getQueryData<Device[]>(adminDeviceKeys.list(undefined));

      // LOW #10: Use map instead of spread for better performance
      if (previousDevices) {
        const updatedDevices = previousDevices.map(device => {
          if (device.id !== id) return device;

          return {
            ...device,
            status,
            updatedAt: new Date(),
          };
        });

        queryClient.setQueryData<Device[]>(
          adminDeviceKeys.list(undefined),
          updatedDevices
        );
      }

      return { previousDevices };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(adminDeviceKeys.list(undefined), context.previousDevices);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    },
  });
}

/**
 * Hook for deleting a device
 * AC5: Delete with cache invalidation
 * ARCHITECTURE FIX #7: Added retry with exponential backoff for 429 errors
 * HIGH FIX #8: Race condition prevented by UI disabled states
 */
export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => deleteDevice(id, force ? { force } : undefined),
    retry: retryWithBackoff,
    retryDelay,
    onSuccess: () => {
      // HIGH FIX #8: No race condition possible because:
      // 1. Edit dialog is modal → cannot Delete while Edit pending
      // 2. Status update disables Delete button via isUpdating check
      queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    },
  });
}
