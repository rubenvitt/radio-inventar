import { BadRequestException } from '@nestjs/common';
import {
  ERROR_MESSAGES,
  DEFAULT_MAX_STRING_LENGTH,
  ABSOLUTE_MAX_STRING_LENGTH,
  getPreTransformMaxLength,
} from '@radio-inventar/shared';

/**
 * Module-level regex for zero-width character detection (compiled once)
 * Matches zero-width and invisible Unicode characters
 */
const ZERO_WIDTH_CHARS_REGEX = /[\u200B-\u200D\uFEFF]/g;

/**
 * Options for string transformation
 */
export interface StringTransformOptions {
  /**
   * Maximum length allowed AFTER normalization
   * If provided, will validate length and throw BadRequestException if exceeded
   */
  maxLength?: number;

  /**
   * If true, empty strings will be converted to null
   * Useful for optional fields with Prisma compatibility
   */
  emptyToNull?: boolean;

  /**
   * If true, converts string to lowercase (Review #2: prevents case-based enumeration)
   * Useful for usernames to prevent "Admin" vs "admin" enumeration attacks
   */
  lowercase?: boolean;
}

/**
 * Sanitizes and normalizes a string value for DTO transformation
 *
 * This function:
 * - Normalizes Unicode to NFC form
 * - Removes zero-width characters
 * - Trims whitespace
 * - Optionally converts empty strings to null
 * - Optionally validates length AFTER normalization
 *
 * @param value - The input value to transform
 * @param options - Transformation options
 * @returns The sanitized string, or null if empty (when emptyToNull is true)
 * @throws BadRequestException if normalized string exceeds maxLength
 *
 * @example
 * // Basic usage
 * Transform(({ value }) => sanitizeString(value))
 *
 * @example
 * // With length validation (addresses unicode normalization length issue)
 * Transform(({ value }) => sanitizeString(value, { maxLength: 100 }))
 *
 * @example
 * // For optional fields that should be null when empty
 * Transform(({ value }) => sanitizeString(value, { maxLength: 200, emptyToNull: true }))
 */
export function sanitizeString(
  value: unknown,
  options: StringTransformOptions = {},
): string | null {
  const { maxLength, emptyToNull = false, lowercase = false } = options;

  // FIX M3: Explicitly return null for non-string values instead of unsafe cast
  if (typeof value !== 'string') {
    return null;
  }

  // FIX H2: DOS protection - check length BEFORE normalization
  // Prevents memory exhaustion from normalizing huge strings
  // FIX M5: Bound maxLength to prevent overflow with Number.MAX_SAFE_INTEGER
  // FIX H1: Use DEFAULT_MAX_STRING_LENGTH instead of magic number 5000
  const boundedMaxLength = Math.min(maxLength ?? DEFAULT_MAX_STRING_LENGTH, ABSOLUTE_MAX_STRING_LENGTH);
  // FIX M6: Use getPreTransformMaxLength() instead of duplicating logic
  const maxInputLength = getPreTransformMaxLength(boundedMaxLength);
  if (value.length > maxInputLength) {
    // FIX M5: Use German error message from shared constants
    throw new BadRequestException(
      `${ERROR_MESSAGES.INPUT_TOO_LONG} (${maxInputLength} Zeichen)`,
    );
  }

  // Unicode normalization to NFC form
  const normalized = value.normalize('NFC');

  // Remove zero-width characters and other invisible characters
  // Note: /g flag is safe in .replace() - regex state resets on each call
  const sanitized = normalized.replace(ZERO_WIDTH_CHARS_REGEX, '');

  // Trim whitespace
  const trimmed = sanitized.trim();

  // Check if empty
  if (trimmed === '') {
    return emptyToNull ? null : trimmed;
  }

  // Apply lowercase if requested (Review #2: prevents case-based enumeration)
  const result = lowercase ? trimmed.toLowerCase() : trimmed;

  // Validate length AFTER normalization (prevents normalization length attacks)
  // Use boundedMaxLength for consistency with pre-normalization check
  if (maxLength !== undefined && result.length > boundedMaxLength) {
    // FIX M5: Use German error message from shared constants
    throw new BadRequestException(
      `${ERROR_MESSAGES.STRING_TOO_LONG_AFTER_NORMALIZATION} (maximal ${boundedMaxLength}, erhalten ${result.length})`,
    );
  }

  return result;
}
