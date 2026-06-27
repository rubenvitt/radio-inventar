import { z } from 'zod';
import { DeviceStatusEnum, type DeviceStatus } from './device.schema.js';

/**
 * Shape of a single loanable device as returned by radio-admin's public loan
 * API (`GET /api/v1/loan-devices`). radio-admin is the master for device data;
 * radio-inventar consumes this read-only and keys loans on the immutable `id`
 * (a cuid2). `status` is free text in radio-admin (no enum), so it is validated
 * loosely and mapped to {@link DeviceStatus} via {@link mapRadioAdminStatus}.
 *
 * @see mapRadioAdminStatus
 */
export const RadioAdminLoanDeviceSchema = z.object({
  id: z.string().min(1),
  issi: z.string(),
  opta: z.string().nullable(),
  rufname: z.string().nullable(),
  status: z.string().nullable(),
  location: z.string().nullable(),
  deviceType: z.string().nullable(),
  serialNumber: z.string().nullable(),
  hersteller: z.string().nullable(),
  bedieneinheit: z.string().nullable(),
  funktion: z.string().nullable(),
});

/** The radio-admin loan API returns a bare array of these. */
export const RadioAdminLoanDeviceListSchema = z.array(RadioAdminLoanDeviceSchema);

/** A loanable device as delivered by radio-admin. */
export type RadioAdminLoanDevice = z.infer<typeof RadioAdminLoanDeviceSchema>;

/**
 * Compose the radio-inventar {@link DeviceStatus} for a device sourced from
 * radio-admin.
 *
 * Availability (ON_LOAN vs AVAILABLE) is owned by radio-inventar and derived
 * from its own active loans — it is never written back to radio-admin. An active
 * loan therefore takes precedence: a device that is currently lent out reads as
 * `ON_LOAN`. Otherwise the device condition comes from radio-admin's free-text
 * `status` field (`defekt` → DEFECT, `wartung` → MAINTENANCE, matched
 * case-insensitively after trimming); anything else — including `null`,
 * `Einsatzbereit` and a stale `Ausgeliehen` — maps to AVAILABLE.
 *
 * @param raStatus - radio-admin's free-text status (may be null)
 * @param hasActiveLoan - whether radio-inventar has an open loan for this device
 */
export function mapRadioAdminStatus(raStatus: string | null, hasActiveLoan: boolean): DeviceStatus {
  if (hasActiveLoan) return DeviceStatusEnum.enum.ON_LOAN;
  switch (raStatus?.trim().toLowerCase()) {
    case 'defekt':
      return DeviceStatusEnum.enum.DEFECT;
    case 'wartung':
      return DeviceStatusEnum.enum.MAINTENANCE;
    default:
      return DeviceStatusEnum.enum.AVAILABLE;
  }
}
