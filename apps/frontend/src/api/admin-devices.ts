// apps/frontend/src/api/admin-devices.ts
// Admin device view — READ-ONLY. Devices are managed in radio-admin; this layer
// only lists them (create/update/delete have been removed).
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { DeviceStatusEnum, type DeviceStatus } from '@radio-inventar/shared';
import { apiClient } from './client';
import { adminDeviceKeys } from '@/lib/queryKeys';

export { type DeviceStatus };

/**
 * Device shape as delivered by GET /api/admin/devices. Sourced read-only from
 * radio-admin (no local notes/timestamps); `deviceType` may be null.
 */
export const AdminDeviceSchema = z.object({
  id: z.string().min(1),
  callSign: z.string(),
  serialNumber: z.string().nullable(),
  deviceType: z.string().nullable(),
  status: DeviceStatusEnum,
});

export type AdminDevice = z.infer<typeof AdminDeviceSchema>;

const AdminDeviceListResponseSchema = z.object({
  data: z.array(AdminDeviceSchema),
});

// === Filter Types ===

export interface DeviceFilters {
  status?: DeviceStatus;
  take?: number;
  skip?: number;
}

// === API Functions ===

/**
 * Fetch all devices with optional filters.
 * GET /api/admin/devices
 */
export async function fetchAdminDevices(filters?: DeviceFilters): Promise<AdminDevice[]> {
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
    const errorDetail = validated.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid response format from server: ${errorDetail}`);
  }

  return validated.data.data;
}

// === React Query Hooks ===

/**
 * Hook for fetching the (read-only) admin device list.
 */
export function useAdminDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: adminDeviceKeys.list(filters),
    queryFn: () => fetchAdminDevices(filters),
    staleTime: 30_000,
  });
}
