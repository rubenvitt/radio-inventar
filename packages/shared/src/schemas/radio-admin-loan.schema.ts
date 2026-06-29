import { z } from 'zod';

/**
 * Mirror of radio-admin's loan-API wire shapes. radio-admin is the loan system
 * of record; radio-inventar consumes these read/write S2S endpoints via
 * RadioAdminService and validates every response with these schemas (same
 * discipline as {@link RadioAdminLoanDeviceSchema}).
 *
 * IMPORTANT: timestamps are epoch-ms INTEGERS on the wire. The consuming
 * repositories convert them to JS `Date` (new Date(ms)) so radio-inventar's own
 * DTOs/serialization stay byte-identical for the kiosk frontend.
 */

/** GET /api/v1/active-loans → bare array. */
export const RadioAdminActiveLoanSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  snapshotCallSign: z.string(),
  snapshotDeviceType: z.string().nullable(),
  borrowerName: z.string(),
  borrowedAt: z.number().int(),
});
export const RadioAdminActiveLoanListSchema = z.array(RadioAdminActiveLoanSchema);
export type RadioAdminActiveLoan = z.infer<typeof RadioAdminActiveLoanSchema>;

/** POST /api/v1/loans (201) and PATCH /api/v1/loans/:id (200) → a full loan record. */
export const RadioAdminLoanRecordSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  snapshotCallSign: z.string(),
  snapshotSerialNumber: z.string().nullable(),
  snapshotDeviceType: z.string().nullable(),
  borrowerName: z.string(),
  borrowedAt: z.number().int(),
  returnedAt: z.number().int().nullable(),
  returnNote: z.string().nullable(),
});
export type RadioAdminLoanRecord = z.infer<typeof RadioAdminLoanRecordSchema>;

/** GET /api/v1/loans/history → paginated envelope. */
export const RadioAdminLoanHistorySchema = z.object({
  rows: z.array(RadioAdminLoanRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type RadioAdminLoanHistory = z.infer<typeof RadioAdminLoanHistorySchema>;

/** GET /api/v1/borrowers/suggestions → bare array; lastUsed is epoch-ms. */
export const RadioAdminBorrowerSuggestionSchema = z.object({
  name: z.string(),
  lastUsed: z.number().int(),
});
export const RadioAdminBorrowerSuggestionListSchema = z.array(RadioAdminBorrowerSuggestionSchema);
export type RadioAdminBorrowerSuggestion = z.infer<typeof RadioAdminBorrowerSuggestionSchema>;
