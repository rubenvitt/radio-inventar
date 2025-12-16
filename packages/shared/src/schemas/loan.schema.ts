import { z } from 'zod';

/**
 * Maximum length constraints for loan fields.
 * These limits are intended to match the database column constraints to ensure data integrity.
 * Note: Constraint consistency is maintained manually - there is no automated verification against the actual database schema.
 *
 * [AI-Review][MEDIUM] WONTFIX - Object.freeze() + as const:
 * Both serve different purposes and are intentionally used together:
 * - `as const`: Type-level immutability (TypeScript) - prevents type widening, makes properties readonly
 * - `Object.freeze()`: Runtime immutability (JavaScript) - prevents accidental modifications at runtime
 * This dual approach ensures immutability at both compile-time and runtime.
 *
 * @example
 * // Using field limits in validation
 * const borrowerName = userInput.slice(0, LOAN_FIELD_LIMITS.BORROWER_NAME_MAX);
 *
 * @example
 * // Checking if input exceeds limits
 * if (returnNote.length > LOAN_FIELD_LIMITS.RETURN_NOTE_MAX) {
 *   throw new Error(`Return note exceeds maximum length of ${LOAN_FIELD_LIMITS.RETURN_NOTE_MAX} characters`);
 * }
 *
 * @see {@link LoanSchema} - Uses these limits for field validation
 * @see {@link CreateLoanSchema} - Uses these limits for input validation
 * @see {@link ReturnLoanSchema} - Uses these limits for return note validation
 */
export const LOAN_FIELD_LIMITS = Object.freeze({
  BORROWER_NAME_MAX: 100,
  RETURN_NOTE_MAX: 500,
} as const);

/**
 * Creates a Zod transform pipeline for nullable string fields.
 * Converts empty strings and whitespace-only strings to null, trims non-empty strings.
 *
 * FIXED [AI-Review][CRITICAL]: DRY VIOLATION - This function was duplicated from device.schema.ts.
 * Also fixed the NULL-HANDLING BUG: Previous `.pipe(z.string().max().nullable())` failed when
 * transform returned null because z.string() validates BEFORE .nullable() is applied.
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
 * Note: Kept local to avoid cross-module dependencies within the schemas package.
 * If more schemas need this, consider extracting to a shared schema-utils module.
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
 * Schema for loan records tracking device borrowing.
 * Represents a complete loan record with all database fields.
 *
 * Note: This is a read schema for database records. Fields use `.nullable()` to match
 * the database nullable columns (e.g., returnedAt, returnNote are NULL until device is returned).
 * Date validation is minimal since dates come from the database and are trusted.
 * IMPORTANT: .nullable() rejects undefined - only null or string values are accepted.
 * Empty strings are transformed to null for nullable returnNote field.
 *
 * Date Ordering: This schema does NOT validate that returnedAt >= borrowedAt.
 * Rationale: LoanSchema is a read schema for database records where date consistency
 * is enforced by database constraints and application logic during loan creation/return.
 * The schema trusts that dates from the database are already valid.
 *
 * @property id - Unique identifier (CUID2 format, default 24 chars, base36 lowercase alphanumeric, URL-safe)
 * @property deviceId - ID of the borrowed device (CUID2 format, default 24 chars, base36 lowercase alphanumeric, URL-safe)
 * @property borrowerName - Name of the person borrowing the device (1-100 characters, whitespace trimmed)
 * @property borrowedAt - Timestamp when device was borrowed
 * @property returnedAt - Timestamp when device was returned (null if still on loan)
 * @property returnNote - Optional note added when returning the device (null if not provided, max 500 characters, empty strings converted to null)
 */
export const LoanSchema = z.object({
  id: z.string().cuid2(),
  deviceId: z.string().cuid2(),
  borrowerName: z.string().trim().min(1).max(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX),
  borrowedAt: z.date(),
  returnedAt: z.date().nullable(),
  returnNote: createNullableStringTransform(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX),
});

/**
 * Schema for creating a new loan.
 * Uses `.max()` for input validation to prevent excessively long values.
 *
 * @property deviceId - ID of the device to borrow (CUID2 format, default 24 chars, base36 lowercase alphanumeric, URL-safe)
 * @property borrowerName - Name of the person borrowing the device (1-100 characters, whitespace trimmed via .trim())
 * @example { deviceId: "cmb8qvznl0000lk08ahhef0nm", borrowerName: "John Doe" }
 */
export const CreateLoanSchema = z.object({
  deviceId: z.string().cuid2(),
  borrowerName: z.string().trim().min(1).max(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX),
});

/**
 * Schema for returning a loaned device.
 * Uses `.optional()` for input DTOs where the field may not be provided by the client,
 * but transforms to null for Prisma compatibility (Prisma IGNORES undefined in updates).
 *
 * FIXED [AI-Review][HIGH]: Previous implementation transformed to undefined, which Prisma
 * treats as "not set" (skips the field in updates). Changed to transform to null so that
 * empty/omitted returnNote explicitly sets the database field to NULL.
 *
 * SECURITY [DOS-Protection]: Added .max() before .optional() to prevent DOS attacks.
 * Without this, an attacker could send GB-sized strings that get processed by .trim()
 * before being rejected, causing memory exhaustion.
 *
 * Input accepts: string | undefined (field can be omitted)
 * Output type: string | null (for Prisma compatibility)
 *
 * @property returnNote - Optional note about the device condition or return (max 500 characters when provided, empty/whitespace/omitted strings converted to null)
 * @example { returnNote: "Device returned in good condition" }
 */
export const ReturnLoanSchema = z.object({
  returnNote: z
    .string()
    .max(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX * 2 + 50) // DOS protection with generous buffer for whitespace
    .optional()
    .transform(val => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    })
    .pipe(z.union([z.string().max(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX), z.null()])),
});

/**
 * Type representing a complete loan record.
 * Inferred from LoanSchema.
 *
 * @example
 * // Type annotation for a loan record
 * const loan: Loan = {
 *   id: "cmb8qvznl0000lk08ahhef0nm",
 *   deviceId: "cmb8qvznl0000lk08ahhef0nm",
 *   borrowerName: "John Doe",
 *   borrowedAt: new Date(),
 *   returnedAt: null,
 *   returnNote: null
 * };
 */
export type Loan = z.infer<typeof LoanSchema>;

/**
 * Type representing data required to create a new loan.
 * Inferred from CreateLoanSchema.
 *
 * @example
 * // Type annotation for loan creation
 * const newLoan: CreateLoan = {
 *   deviceId: "cmb8qvznl0000lk08ahhef0nm",
 *   borrowerName: "Jane Smith"
 * };
 */
export type CreateLoan = z.infer<typeof CreateLoanSchema>;

/**
 * Type representing data for returning a loaned device.
 * Inferred from ReturnLoanSchema.
 *
 * @example
 * // Type annotation for device return with note
 * const returnData: ReturnLoan = {
 *   returnNote: "Device returned in good condition"
 * };
 *
 * @example
 * // Type annotation for device return without note
 * const returnDataNoNote: ReturnLoan = {};
 */
export type ReturnLoan = z.infer<typeof ReturnLoanSchema>;

/**
 * Schema for updating an existing loan.
 * Currently only borrowerName can be updated (before device is returned).
 *
 * INTENTIONAL DESIGN: Empty updates ({}) are allowed and result in no-op at the application layer.
 * This is a common REST API pattern for PATCH endpoints where clients may conditionally send updates.
 * The application layer is responsible for detecting empty updates and avoiding unnecessary database writes.
 * This pattern maintains API consistency across all update endpoints (see UpdateDeviceSchema for similar behavior).
 *
 * [AI-Review][HIGH] WONTFIX - Empty Object Bypass:
 * Empty updates are intentionally allowed for API consistency with standard REST PATCH semantics.
 * Alternative would be .refine(obj => Object.keys(obj).length > 0) but adds complexity without clear benefit.
 * Application layer already handles no-op updates efficiently via Prisma's update behavior.
 *
 * @property {string} [borrowerName] - Name of the person borrowing the device (1-100 characters when provided, whitespace trimmed)
 *
 * @throws {ZodError} Throws validation error if data doesn't match schema constraints when using .parse()
 *
 * @example
 * // Update borrower name
 * const update = UpdateLoanSchema.parse({
 *   borrowerName: "Jane Doe"
 * });
 *
 * @example
 * // Empty update (all fields optional) - intentionally allowed, results in no-op
 * const noUpdate = UpdateLoanSchema.parse({});
 * // Application layer can check: Object.keys(noUpdate).length === 0
 *
 * @see {@link CreateLoanSchema} - Schema for creating new loans
 * @see {@link UpdateLoan} - TypeScript type inferred from this schema
 * @see {@link UpdateDeviceSchema} - Similar pattern with optional fields allowing empty updates
 */
export const UpdateLoanSchema = z.object({
  borrowerName: z.string().trim().min(1).max(LOAN_FIELD_LIMITS.BORROWER_NAME_MAX).optional(),
});

/**
 * Type representing data for updating an existing loan.
 * Inferred from UpdateLoanSchema.
 *
 * @example
 * // Type annotation for loan update
 * const updateData: UpdateLoan = {
 *   borrowerName: "Jane Doe"
 * };
 *
 * @example
 * // Type annotation for empty update
 * const noUpdate: UpdateLoan = {};
 */
export type UpdateLoan = z.infer<typeof UpdateLoanSchema>;
