import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from './client';
import { deviceKeys } from '@/lib/queryKeys';
import { DeviceStatusEnum, type Device, type DeviceStatus } from '@radio-inventar/shared';
import { ActiveLoanSchema, type ActiveLoan } from './loans';

/** Extended Device type with loan information for UI display */
export interface DeviceWithLoanInfo extends Device {
  borrowerName?: string | undefined;
  borrowedAt?: Date | undefined;
}

/**
 * Schema for parsing Device from API response.
 * API returns dates as ISO strings, so we use z.coerce.date() to transform them.
 */
const DeviceApiSchema = z.object({
  id: z.string().cuid2(),
  callSign: z.string(),
  serialNumber: z.string().nullable(),
  deviceType: z.string(),
  status: DeviceStatusEnum,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Zod schema for API response validation
const DevicesResponseSchema = z.object({
  data: z.array(DeviceApiSchema),
});

const ActiveLoansResponseSchema = z.object({
  data: z.array(ActiveLoanSchema),
});

/**
 * Status priority for sorting devices in the UI.
 * Lower number = higher priority (shown first).
 * Order: AVAILABLE → ON_LOAN → DEFECT → MAINTENANCE
 */
const STATUS_PRIORITY: Record<DeviceStatus, number> = {
  AVAILABLE: 1,
  ON_LOAN: 2,
  DEFECT: 3,
  MAINTENANCE: 4,
};

/**
 * Fetches all devices from the API with Zod validation
 */
async function fetchDevices(): Promise<Device[]> {
  const response = await apiClient.get<unknown>('/api/devices');
  const validated = DevicesResponseSchema.safeParse(response);

  if (!validated.success) {
    const errorMsg = import.meta.env.DEV
      ? `Invalid API response: ${validated.error.message}`
      : 'Invalid API response format';
    throw new Error(errorMsg);
  }

  return validated.data.data;
}

/**
 * Fetches all active loans from the API with Zod validation
 */
async function fetchActiveLoans(): Promise<ActiveLoan[]> {
  const response = await apiClient.get<unknown>('/api/loans/active');
  const validated = ActiveLoansResponseSchema.safeParse(response);

  if (!validated.success) {
    const errorMsg = import.meta.env.DEV
      ? `Invalid API response: ${validated.error.message}`
      : 'Invalid API response format';
    throw new Error(errorMsg);
  }

  return validated.data.data;
}

/**
 * Hook to fetch and combine devices with their active loan information.
 * Devices are sorted by status priority: AVAILABLE → ON_LOAN → DEFECT → MAINTENANCE
 *
 * Handles partial failures gracefully:
 * - If devices fetch fails, the entire query fails (critical data)
 * - If loans fetch fails, devices are still shown without loan info (degraded mode)
 */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.lists(),
    staleTime: 30_000, // 30 seconds - prevent unnecessary refetches
    queryFn: async (): Promise<DeviceWithLoanInfo[]> => {
      // Fetch devices (critical - must succeed)
      const devices = await fetchDevices();

      // Fetch loans (non-critical - graceful degradation on failure)
      let activeLoans: ActiveLoan[] = [];
      try {
        activeLoans = await fetchActiveLoans();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to fetch active loans, showing devices without loan info');
        }
        // Graceful degradation - continue with empty loans
      }

      // Create a map of deviceId -> loan info for quick lookup
      const loanMap = new Map(
        activeLoans.map(loan => [
          loan.deviceId,
          {
            borrowerName: loan.borrowerName,
            borrowedAt: new Date(loan.borrowedAt),
          },
        ])
      );

      // Combine devices with loan information
      const devicesWithLoanInfo: DeviceWithLoanInfo[] = devices.map(device => {
        const loanInfo = loanMap.get(device.id);
        return {
          ...device,
          borrowerName: loanInfo?.borrowerName,
          borrowedAt: loanInfo?.borrowedAt,
        };
      });

      // Validate status values before sorting (runs once, not O(n log n))
      if (import.meta.env.DEV) {
        const unknownStatuses = new Set(
          devicesWithLoanInfo
            .map(d => d.status)
            .filter(s => STATUS_PRIORITY[s] === undefined)
        );
        if (unknownStatuses.size > 0) {
          console.warn('Unknown device statuses found:', Array.from(unknownStatuses));
        }
      }

      // Sort by status priority (create new array to avoid mutation)
      const sorted = [...devicesWithLoanInfo].sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.status];
        const priorityB = STATUS_PRIORITY[b.status];
        return (priorityA ?? 999) - (priorityB ?? 999);
      });

      return sorted;
    },
    placeholderData: keepPreviousData,
  });
}
