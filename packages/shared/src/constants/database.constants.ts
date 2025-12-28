/**
 * Database operation configuration constants.
 */
export const DATABASE = {
  /**
   * Default transaction timeout in milliseconds.
   * Used for Prisma transactions to prevent long-running operations.
   */
  TRANSACTION_TIMEOUT_MS: 5000,
} as const;

export type DatabaseConfig = typeof DATABASE;

/**
 * Buffer multiplier for pre-transform validation.
 * Unicode normalization (NFD→NFC) can change string length.
 * We allow 2x the max length + 100 chars buffer before transformation.
 */
export const PRE_TRANSFORM_LENGTH_MULTIPLIER = 2;

/**
 * Fixed buffer for pre-transform validation to accommodate
 * edge cases in unicode normalization and combining characters.
 */
export const PRE_TRANSFORM_LENGTH_BUFFER = 100;

/**
 * Calculate pre-transform max length for DOS protection.
 *
 * This function calculates the maximum allowed input length before transformation
 * to prevent Denial-of-Service attacks while allowing for unicode normalization
 * changes. The buffer accounts for cases where unicode normalization (NFD→NFC)
 * may temporarily increase string length during processing.
 *
 * @param maxLength - The actual business limit after transformation
 * @returns Maximum allowed input length before transformation
 *
 * @example
 * ```typescript
 * // For a field with max 100 chars after normalization
 * const preTransformMax = getPreTransformMaxLength(100);
 * // Returns: 100 * 2 + 100 = 300
 * ```
 */
export function getPreTransformMaxLength(maxLength: number): number {
  return maxLength * PRE_TRANSFORM_LENGTH_MULTIPLIER + PRE_TRANSFORM_LENGTH_BUFFER;
}

/**
 * Default maximum string length for sanitizeString when no maxLength is provided.
 * This is a safety limit to prevent processing extremely large strings.
 * Applications should provide explicit maxLength for each field based on business requirements.
 */
export const DEFAULT_MAX_STRING_LENGTH = 5000;

/**
 * Absolute maximum string length to prevent overflow attacks.
 * Even with explicit maxLength, we cap at this value to prevent memory exhaustion.
 */
export const ABSOLUTE_MAX_STRING_LENGTH = 10000;
