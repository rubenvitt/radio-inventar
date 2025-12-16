import { z } from 'zod';

/**
 * Maximum length constraints for borrower fields.
 * These limits match the database column constraints to ensure data integrity.
 *
 * Note: NAME_MAX equals LOAN_FIELD_LIMITS.BORROWER_NAME_MAX (both 100) because they reference
 * the same database column. The separate constants provide context-appropriate naming:
 * - BORROWER_FIELD_LIMITS.NAME_MAX: For borrower entity context (autocomplete suggestions)
 * - LOAN_FIELD_LIMITS.BORROWER_NAME_MAX: For loan relationship context (loan forms)
 *
 * @example
 * // Using field limits in validation
 * const borrowerName = userInput.slice(0, BORROWER_FIELD_LIMITS.NAME_MAX);
 *
 * @example
 * // Checking if input exceeds limits
 * if (name.length > BORROWER_FIELD_LIMITS.NAME_MAX) {
 *   throw new Error(`Name exceeds maximum length of ${BORROWER_FIELD_LIMITS.NAME_MAX} characters`);
 * }
 *
 * @see {@link BorrowerSuggestionSchema} - Uses these limits for field validation
 * @see {@link ../schemas/loan.schema.ts#LOAN_FIELD_LIMITS} - Same NAME_MAX value as BORROWER_NAME_MAX for consistency
 */
export const BORROWER_FIELD_LIMITS = Object.freeze({
  NAME_MAX: 100,
} as const);

/**
 * Schema for borrower suggestions based on previous loans.
 * Used to provide autocomplete suggestions when creating new loans.
 *
 * Note: The 'name' field maps to 'borrowerName' in CreateLoanSchema and LoanSchema.
 * This naming difference is intentional - 'name' represents the borrower entity,
 * while 'borrowerName' represents the loan relationship.
 *
 * @property name - Name of the borrower, 1-100 characters (maps to borrowerName in API)
 * @property lastUsed - Timestamp of the most recent loan by this borrower (provides context for sorting suggestions by recency)
 * @example { name: "John Doe", lastUsed: new Date("2025-12-14") }
 */
export const BorrowerSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(BORROWER_FIELD_LIMITS.NAME_MAX),
  lastUsed: z.date(),
});

/**
 * Type representing a borrower suggestion for autocomplete.
 * Used in UI components to suggest previously used borrower names when creating new loans,
 * improving user experience by reducing manual input and ensuring consistency.
 *
 * @example
 * // Using borrower suggestions in autocomplete
 * const suggestions: BorrowerSuggestion[] = [
 *   { name: "John Doe", lastUsed: new Date("2025-12-14") },
 *   { name: "Jane Smith", lastUsed: new Date("2025-12-10") }
 * ];
 *
 * @example
 * // Filtering suggestions by search term
 * const searchTerm = "John";
 * const filtered = suggestions.filter(s =>
 *   s.name.toLowerCase().includes(searchTerm.toLowerCase())
 * );
 *
 * @see {@link BorrowerSuggestionSchema} - Zod schema for validating borrower suggestions
 */
export type BorrowerSuggestion = z.infer<typeof BorrowerSuggestionSchema>;
