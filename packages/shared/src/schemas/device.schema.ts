import { z } from 'zod';
import { germanErrorMap } from '../lib/zod-error-map.js';

// Konfiguriere Zod mit deutschen Fehlermeldungen
z.setErrorMap(germanErrorMap);

/**
 * Maximum length constraints for device fields.
 * These limits match the database column constraints to ensure data integrity.
 *
 * [AI-Review][MEDIUM] WONTFIX - Object.freeze() + as const:
 * Both serve different purposes and are intentionally used together:
 * - `as const`: Type-level immutability (TypeScript) - prevents type widening, makes properties readonly
 * - `Object.freeze()`: Runtime immutability (JavaScript) - prevents accidental modifications at runtime
 * This dual approach ensures immutability at both compile-time and runtime.
 *
 * @example
 * // Using field limits in validation
 * const callSign = userInput.slice(0, DEVICE_FIELD_LIMITS.CALL_SIGN_MAX);
 *
 * @example
 * // Checking if input exceeds limits
 * if (notes.length > DEVICE_FIELD_LIMITS.NOTES_MAX) {
 *   throw new Error(`Notes exceed maximum length of ${DEVICE_FIELD_LIMITS.NOTES_MAX} characters`);
 * }
 *
 * @see {@link DeviceSchema} - Uses these limits for field validation
 * @see {@link CreateDeviceSchema} - Uses these limits for input validation
 */
export const DEVICE_FIELD_LIMITS = Object.freeze({
  CALL_SIGN_MAX: 50,
  SERIAL_NUMBER_MAX: 100,
  DEVICE_TYPE_MAX: 100,
  NOTES_MAX: 500,
} as const);

/**
 * Creates a Zod transform pipeline for nullable string fields.
 * Converts empty strings and whitespace-only strings to null, trims non-empty strings.
 *
 * FIXED [AI-Review][CRITICAL]: Previous implementation had `.pipe(z.string().max().nullable())`
 * which failed when transform returned null. The issue: z.string() validates BEFORE .nullable()
 * is applied, so null values were rejected with "Expected string, received null".
 * Solution: Use z.union([z.string().max(), z.null()]) to handle both types correctly in pipe.
 *
 * SECURITY [DOS-Protection]: Uses generous pre-transform limit (maxLength * 2 + 50) to prevent
 * DOS attacks while allowing whitespace padding. Without this, an attacker could send GB-sized
 * payloads that would be copied into memory during .trim() operation before validation.
 *
 * FIXED [AI-Review][HIGH]: Double validation bug - Previous implementation validated .max()
 * both before AND after trim. This rejected whitespace-padded inputs like "  abc  " (7 chars)
 * with max 5 even though trimmed result "abc" (3 chars) is valid. Now uses generous pre-transform
 * limit for DOS protection and exact limit in pipe for output validation.
 *
 * @param maxLength - Maximum allowed string length
 * @returns Zod schema that transforms and validates nullable strings
 *
 * @example
 * // Usage in schema definition
 * const schema = z.object({
 *   notes: createNullableStringTransform(500)
 * });
 */
const createNullableStringTransform = (maxLength: number) =>
  z
    .string()
    .max(maxLength * 2 + 50) // Generous buffer for whitespace padding, prevents DOS
    .nullable()
    .transform(val => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    })
    .pipe(z.union([z.string().max(maxLength), z.null()]));

/**
 * Creates a Zod transform pipeline for nullish string fields (accepts undefined).
 * Converts empty strings, whitespace-only strings, and undefined to null.
 * Better DX for input DTOs where fields may be omitted entirely.
 *
 * FIXED [AI-Review][CRITICAL]: Same bug as createNullableStringTransform.
 * Previous `.pipe(z.string().max().nullable())` failed when transform returned null.
 * Solution: Use z.union([z.string().max(), z.null()]) to handle both types correctly.
 *
 * SECURITY [DOS-Protection]: Uses generous pre-transform limit (maxLength * 2 + 50) to prevent
 * DOS attacks while allowing whitespace padding. Without this, an attacker could send GB-sized
 * payloads that would be copied into memory during .trim() operation before validation.
 *
 * FIXED [AI-Review][HIGH]: Double validation bug - Previous implementation validated .max()
 * both before AND after trim. This rejected whitespace-padded inputs like "  abc  " (7 chars)
 * with max 5 even though trimmed result "abc" (3 chars) is valid. Now uses generous pre-transform
 * limit for DOS protection and exact limit in pipe for output validation.
 *
 * @param maxLength - Maximum allowed string length
 * @returns Zod schema that transforms and validates nullish strings
 *
 * @example
 * // Usage in schema definition
 * const schema = z.object({
 *   serialNumber: createNullishStringTransform(100)
 * });
 */
const createNullishStringTransform = (maxLength: number) =>
  z
    .string()
    .max(maxLength * 2 + 50) // Generous buffer for whitespace padding, prevents DOS
    .nullish()
    .transform(val => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    })
    .pipe(z.union([z.string().max(maxLength), z.null()]));

/**
 * Device status enum - indicates current availability of a radio device.
 *
 * @example
 * // Check if device is available
 * const status: DeviceStatus = 'AVAILABLE';
 *
 * @example
 * // All possible values as object (both .enum and .Enum return the same object)
 * DeviceStatusEnum.enum // { AVAILABLE: 'AVAILABLE', ON_LOAN: 'ON_LOAN', DEFECT: 'DEFECT', MAINTENANCE: 'MAINTENANCE' }
 * DeviceStatusEnum.Enum // same as above - Zod provides both aliases
 *
 * @example
 * // All possible values as array (use .options for array)
 * DeviceStatusEnum.options // ['AVAILABLE', 'ON_LOAN', 'DEFECT', 'MAINTENANCE']
 *
 * @example
 * // Validate status value
 * const result = DeviceStatusEnum.safeParse('AVAILABLE');
 * if (result.success) {
 *   console.log('Valid status:', result.data);
 * }
 *
 * @see {@link DeviceSchema} - DeviceSchema has a `status` property of type DeviceStatus
 * @see {@link Device} - TypeScript type with status property of type DeviceStatus
 */
export const DeviceStatusEnum = z.enum(['AVAILABLE', 'ON_LOAN', 'DEFECT', 'MAINTENANCE']);

/**
 * Admin-settable device status enum.
 * Excludes ON_LOAN which is managed by the loan system.
 */
export const DeviceStatusAdminUpdateEnum = z.enum(['AVAILABLE', 'DEFECT', 'MAINTENANCE']);

/**
 * Schema for radio device data.
 * Represents a complete radio device with all database fields.
 * Note: Uses .nullable() for optional fields to match database schema where NULL is allowed.
 *
 * IMPORTANT: .nullable() accepts string | null but REJECTS undefined.
 * This can cause runtime errors when using partial database selects that return undefined.
 * For schemas that should accept undefined, use .nullish() instead (see CreateDeviceSchema).
 * Empty strings are transformed to null for nullable fields.
 *
 * @property {string} id - Unique identifier in CUID2 format, auto-generated by the database (default length 24 characters, configurable 2-32 chars, base36 lowercase alphanumeric, URL-safe)
 * @property {string} callSign - Radio call sign identifier (e.g., "Florian 4-23"), required, 1-50 characters (whitespace trimmed; .min(1) after trim rejects whitespace-only strings)
 * @property {string | null} serialNumber - Device serial number for tracking and warranty purposes, optional, max 100 characters (empty strings converted to null)
 * @property {string} deviceType - Type/model of the radio device (e.g., "Handheld", "Mobile", "Base Station"), required, 1-100 characters (whitespace trimmed; .min(1) after trim rejects whitespace-only strings)
 * @property {DeviceStatus} status - Current availability status of the device, defaults to 'AVAILABLE' when created
 * @property {string | null} notes - Additional information or remarks about the device condition or usage, optional, max 500 characters (empty strings converted to null)
 * @property {Date} createdAt - Timestamp when the device record was created in the database
 * @property {Date} updatedAt - Timestamp when the device record was last modified in the database
 *
 * @throws {ZodError} Throws validation error if data doesn't match schema constraints when using .parse()
 *
 * @example
 * // Parse a complete device object
 * const device = DeviceSchema.parse({
 *   id: 'cmb8qvznl0000lk08ahhef0nm',
 *   callSign: 'Florian 4-23',
 *   serialNumber: 'SN-2024-001',
 *   deviceType: 'Handheld',
 *   status: 'AVAILABLE',
 *   notes: 'New device, in excellent condition',
 *   createdAt: new Date('2025-01-01'),
 *   updatedAt: new Date('2025-01-01')
 * });
 *
 * @example
 * // Safe parse with error handling
 * const result = DeviceSchema.safeParse(data);
 * if (result.success) {
 *   console.log('Valid device:', result.data);
 * } else {
 *   console.error('Validation failed:', result.error);
 * }
 *
 * @see {@link CreateDeviceSchema} - Schema for creating new devices without auto-generated fields
 * @see {@link Device} - TypeScript type inferred from this schema
 * @see {@link DeviceStatusEnum} - Enum defining valid status values
 */
export const DeviceSchema = z.object({
  id: z.string().cuid2(),
  // [AI-Review][HIGH] WONTFIX - Inconsistent transform logic is INTENTIONAL:
  // Required fields use .trim().min(1) to REJECT whitespace-only strings with validation error
  callSign: z.string().trim().min(1).max(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX),
  // Optional nullable fields use transform pipeline to CONVERT whitespace-only to null
  serialNumber: createNullableStringTransform(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX),
  // Required field - rejects whitespace-only strings
  deviceType: z.string().trim().min(1).max(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX),
  status: DeviceStatusEnum.default('AVAILABLE'),
  // Optional nullable field - converts whitespace-only to null
  notes: createNullableStringTransform(DEVICE_FIELD_LIMITS.NOTES_MAX),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Schema for creating a new device.
 * Omits auto-generated fields (id, timestamps, status) from the full DeviceSchema.
 * Uses .nullish() for optional fields to improve DX - accepts null, undefined, or a value.
 *
 * @property {string} callSign - Radio call sign identifier (e.g., "Florian 4-23"), required, 1-50 characters
 * @property {string | null | undefined} serialNumber - Device serial number for tracking and warranty purposes, optional, max 100 characters
 * @property {string} deviceType - Type/model of the radio device (e.g., "Handheld", "Mobile", "Base Station"), required, 1-100 characters
 * @property {string | null | undefined} notes - Additional information or remarks about the device condition or usage, optional, max 500 characters
 *
 * @throws {ZodError} Throws validation error if data doesn't match schema constraints when using .parse()
 *
 * @example
 * // Create a new device with all fields
 * const newDevice = CreateDeviceSchema.parse({
 *   callSign: 'Florian 4-42',
 *   serialNumber: 'SN-2025-042',
 *   deviceType: 'Handheld',
 *   notes: 'Purchased December 2025'
 * });
 *
 * @example
 * // Create a device with only required fields (no need to specify null)
 * const minimalDevice = CreateDeviceSchema.parse({
 *   callSign: 'Florian 4-43',
 *   deviceType: 'Mobile'
 * });
 *
 * @see {@link DeviceSchema} - Full schema including auto-generated fields
 * @see {@link CreateDevice} - TypeScript type inferred from this schema
 */
export const CreateDeviceSchema = DeviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
}).extend({
  // Override with nullish transforms for better input DTO DX (accepts undefined)
  serialNumber: createNullishStringTransform(DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX),
  notes: createNullishStringTransform(DEVICE_FIELD_LIMITS.NOTES_MAX),
});

/**
 * Type representing a complete radio device with all fields.
 * Inferred from DeviceSchema.
 *
 * @example
 * // Type annotation for a device record
 * const device: Device = {
 *   id: "cmb8qvznl0000lk08ahhef0nm",
 *   callSign: "Florian 4-23",
 *   serialNumber: "SN-2024-001",
 *   deviceType: "Handheld",
 *   status: "AVAILABLE",
 *   notes: "New device, in excellent condition",
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 */
export type Device = z.infer<typeof DeviceSchema>;

/**
 * Type representing data required to create a new device.
 * Inferred from CreateDeviceSchema.
 *
 * @example
 * // Type annotation for device creation with all fields
 * const newDevice: CreateDevice = {
 *   callSign: "Florian 4-42",
 *   serialNumber: "SN-2025-042",
 *   deviceType: "Handheld",
 *   notes: "Purchased December 2025"
 * };
 *
 * @example
 * // Type annotation for device creation with minimal fields
 * const minimalDevice: CreateDevice = {
 *   callSign: "Florian 4-43",
 *   deviceType: "Mobile"
 * };
 */
export type CreateDevice = z.infer<typeof CreateDeviceSchema>;

/**
 * Schema for updating an existing device.
 * All fields are optional - only provided fields will be updated.
 * Uses .partial() to make all fields optional for PATCH operations.
 *
 * INTENTIONAL DESIGN: Empty updates ({}) are allowed and result in no-op at the application layer.
 * This is a common REST API pattern for PATCH endpoints where clients may conditionally send updates.
 * The application layer is responsible for detecting empty updates and avoiding unnecessary database writes.
 * This pattern maintains API consistency across all update endpoints (see UpdateLoanSchema for similar behavior).
 *
 * [AI-Review][HIGH] WONTFIX - Empty Object Bypass:
 * Empty updates are intentionally allowed for API consistency with standard REST PATCH semantics.
 * Alternative would be .refine(obj => Object.keys(obj).length > 0) but adds complexity without clear benefit.
 * Application layer already handles no-op updates efficiently via Prisma's update behavior.
 *
 * @property {string} [callSign] - Radio call sign identifier (e.g., "Florian 4-23"), optional, 1-50 characters when provided
 * @property {string | null | undefined} [serialNumber] - Device serial number for tracking and warranty purposes, optional, max 100 characters when provided
 * @property {string} [deviceType] - Type/model of the radio device (e.g., "Handheld", "Mobile", "Base Station"), optional, 1-100 characters when provided
 * @property {string | null | undefined} [notes] - Additional information or remarks about the device condition or usage, optional, max 500 characters when provided
 *
 * @throws {ZodError} Throws validation error if data doesn't match schema constraints when using .parse()
 *
 * @example
 * // Update only the call sign
 * const update1 = UpdateDeviceSchema.parse({
 *   callSign: 'Florian 4-99'
 * });
 *
 * @example
 * // Update multiple fields
 * const update2 = UpdateDeviceSchema.parse({
 *   callSign: 'Florian 4-88',
 *   notes: 'Updated maintenance notes'
 * });
 *
 * @example
 * // Clear a nullable field by setting to null
 * const update3 = UpdateDeviceSchema.parse({
 *   serialNumber: null,
 *   notes: null
 * });
 *
 * @example
 * // Empty update (all fields optional) - intentionally allowed, results in no-op
 * const noUpdate = UpdateDeviceSchema.parse({});
 * // Application layer can check: Object.keys(noUpdate).length === 0
 *
 * @see {@link CreateDeviceSchema} - Schema for creating new devices
 * @see {@link UpdateDevice} - TypeScript type inferred from this schema
 * @see {@link UpdateLoanSchema} - Similar pattern with optional fields allowing empty updates
 */
export const UpdateDeviceSchema = CreateDeviceSchema.partial();

/**
 * Type representing data for updating an existing device.
 * Inferred from UpdateDeviceSchema.
 *
 * @example
 * // Type annotation for device update
 * const updateData: UpdateDevice = {
 *   callSign: "Florian 4-99",
 *   notes: "Updated maintenance notes"
 * };
 *
 * @example
 * // Type annotation for clearing nullable fields
 * const clearData: UpdateDevice = {
 *   serialNumber: null,
 *   notes: null
 * };
 */
export type UpdateDevice = z.infer<typeof UpdateDeviceSchema>;

/**
 * Type representing the status of a device.
 * Inferred from DeviceStatusEnum.
 *
 * @example
 * // Type annotation for device status
 * const status: DeviceStatus = 'AVAILABLE';
 *
 * @example
 * // Using in function signature
 * function updateDeviceStatus(deviceId: string, newStatus: DeviceStatus): void {
 *   // Implementation
 * }
 */
export type DeviceStatus = z.infer<typeof DeviceStatusEnum>;

/**
 * Type representing an admin-settable device status.
 */
export type DeviceStatusAdminUpdate = z.infer<typeof DeviceStatusAdminUpdateEnum>;
