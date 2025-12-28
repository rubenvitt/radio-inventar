/**
 * Default pagination settings for API endpoints.
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,
  MAX_SKIP: 10000,
} as const;

export type PaginationConfig = typeof PAGINATION;

/**
 * Borrower suggestions configuration.
 */
export const BORROWER_SUGGESTIONS = {
  MIN_QUERY_LENGTH: 2,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
} as const;

export type BorrowerSuggestionsConfig = typeof BORROWER_SUGGESTIONS;
