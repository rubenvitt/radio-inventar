import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from './client';
import { borrowerKeys } from '@/lib/queryKeys';

export const MIN_SUGGESTION_QUERY_LENGTH = 2;

/**
 * Zod Schema for BorrowerSuggestion.
 * IMPORTANT: API returns ISO string for lastUsed, not Date object.
 * Using z.string().datetime() instead of z.date().
 */
const BorrowerSuggestionSchema = z.object({
  name: z.string().min(1).max(100),
  lastUsed: z.string().datetime(),
});

const BorrowerSuggestionsResponseSchema = z.array(BorrowerSuggestionSchema);

/** API Response wrapper - Backend wraps all responses in { data: ... } */
const ApiResponseSchema = z.object({
  data: BorrowerSuggestionsResponseSchema,
});

export type BorrowerSuggestion = z.infer<typeof BorrowerSuggestionSchema>;

/**
 * Hook to fetch borrower name suggestions for autocomplete.
 * Only fetches when query has >= 2 characters.
 *
 * @param query - Search string (min 2 chars to fetch)
 * @param limit - Max results (default 10)
 */
export function useBorrowerSuggestions(query: string, limit: number = 10) {
  return useQuery({
    queryKey: borrowerKeys.suggestion(query),
    queryFn: async (): Promise<BorrowerSuggestion[]> => {
      // Guard: Don't fetch if query too short
      if (query.length < MIN_SUGGESTION_QUERY_LENGTH) return [];

      const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));

      try {
        const response = await apiClient.get<unknown>(
          `/api/borrowers/suggestions?q=${encodeURIComponent(query)}&limit=${safeLimit}`
        );

        // Runtime Type Safety via Zod
        const validated = ApiResponseSchema.safeParse(response);
        if (!validated.success) {
          throw new Error('Invalid suggestions response');
        }

        // Unwrap { data: [...] } wrapper
        return validated.data.data;
      } catch (error) {
        // Re-throw with user-friendly message
        if (error instanceof Error && error.message === 'Invalid suggestions response') {
          throw error;
        }
        throw new Error('Fehler beim Laden der Vorschläge');
      }
    },
    enabled: query.length >= MIN_SUGGESTION_QUERY_LENGTH,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
