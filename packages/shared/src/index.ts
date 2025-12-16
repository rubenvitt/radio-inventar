/**
 * @radio-inventar/shared
 *
 * Shared TypeScript types and Zod validation schemas for the Radio-Inventar application.
 * This package provides type-safe data models for devices, loans, and borrowers.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { DeviceSchema, Device, CreateDeviceSchema, CreateDevice } from '@radio-inventar/shared';
 *
 * // Validate incoming data for device creation
 * const result = CreateDeviceSchema.safeParse(data);
 * if (result.success) {
 *   // result.data is typed as CreateDevice - validated and ready to send to API
 *   const newDevice: CreateDevice = result.data;
 *   // Now use newDevice to create the device in your backend
 *   console.log('Creating device:', newDevice.callSign);
 * } else {
 *   // Handle validation errors
 *   console.error('Validation failed:', result.error.errors);
 * }
 * ```
 *
 * ## Exported Modules
 *
 * ### Device Schemas and Types
 * - `DeviceStatusEnum` - Zod enum constant for device status values (AVAILABLE/ON_LOAN/DEFECT/MAINTENANCE)
 * - `DeviceSchema` - Complete device record validation schema
 * - `CreateDeviceSchema` - Schema for validating new device creation
 * - `UpdateDeviceSchema` - Schema for validating device updates (PATCH operations)
 * - `Device` - TypeScript type for device records
 * - `CreateDevice` - TypeScript type for device creation
 * - `UpdateDevice` - TypeScript type for device updates
 * - `DeviceStatus` - TypeScript type for device status
 * - `DEVICE_FIELD_LIMITS` - Configuration object with field length constraints:
 *   - `CALL_SIGN_MAX`: 50
 *   - `SERIAL_NUMBER_MAX`: 100
 *   - `DEVICE_TYPE_MAX`: 100
 *   - `NOTES_MAX`: 500
 *
 * ### Loan Schemas and Types
 * - `LoanSchema` - Complete loan record validation schema
 * - `CreateLoanSchema` - Schema for validating new loan creation
 * - `UpdateLoanSchema` - Schema for validating loan updates (PATCH operations)
 * - `ReturnLoanSchema` - Schema for validating device returns
 * - `Loan` - TypeScript type for loan records
 * - `CreateLoan` - TypeScript type for loan creation
 * - `UpdateLoan` - TypeScript type for loan updates
 * - `ReturnLoan` - TypeScript type for loan returns
 * - `LOAN_FIELD_LIMITS` - Configuration object with field length constraints (used in LoanSchema validation AND for frontend form validation):
 *   - `BORROWER_NAME_MAX`: 100 (same as BORROWER_FIELD_LIMITS.NAME_MAX for consistency)
 *   - `RETURN_NOTE_MAX`: 500
 *
 * ### Borrower Schemas and Types
 * - `BorrowerSuggestionSchema` - Schema for borrower autocomplete validation
 * - `BorrowerSuggestion` - TypeScript type for borrower suggestions
 * - `BORROWER_FIELD_LIMITS` - Configuration object with field length constraints:
 *   - `NAME_MAX`: 100 (for borrower entity - same value as LOAN_FIELD_LIMITS.BORROWER_NAME_MAX for data consistency)
 *
 * Note: LOAN_FIELD_LIMITS.BORROWER_NAME_MAX and BORROWER_FIELD_LIMITS.NAME_MAX both equal 100
 * because they represent the same database column constraint. The duplication exists to provide
 * context-appropriate naming: LOAN uses "borrowerName" (relationship context), BORROWER uses "name" (entity context).
 */

// Device schemas and types
export * from './schemas/device.schema';

// Loan schemas and types
export * from './schemas/loan.schema';

// Borrower schemas and types
export * from './schemas/borrower.schema';
