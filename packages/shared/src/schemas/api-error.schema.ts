import { z } from 'zod';

/**
 * Schema for field-level validation errors.
 * Used to provide specific feedback about which fields failed validation and why.
 *
 * @example
 * const fieldError: FieldError = {
 *   field: 'callSign',
 *   message: 'callSign must not be empty'
 * };
 */
export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/**
 * API error response format per Architecture specification.
 * Consistent error format for all API endpoints.
 *
 * @property {number} statusCode - HTTP status code (400, 404, 500, etc.)
 * @property {string} message - Human-readable error message
 * @property {string} [error] - Error type/category (e.g., "Bad Request", "Not Found")
 * @property {FieldError[]} [errors] - Array of field-level validation errors
 * @property {string} [timestamp] - ISO timestamp (development only)
 * @property {string} [path] - Request path (development only)
 *
 * @example
 * // Validation error response
 * const error: ApiError = {
 *   statusCode: 400,
 *   message: 'Validation failed',
 *   error: 'Bad Request',
 *   errors: [
 *     { field: 'callSign', message: 'callSign must not be empty' },
 *     { field: 'deviceType', message: 'deviceType is required' }
 *   ]
 * };
 *
 * @example
 * // Not found error response
 * const error: ApiError = {
 *   statusCode: 404,
 *   message: 'Device not found',
 *   error: 'Not Found'
 * };
 */
export const ApiErrorSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.string(),
  error: z.string().optional(),
  errors: z.array(FieldErrorSchema).optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

/**
 * Type representing a field-level validation error.
 */
export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * Type representing an API error response.
 */
export type ApiError = z.infer<typeof ApiErrorSchema>;
