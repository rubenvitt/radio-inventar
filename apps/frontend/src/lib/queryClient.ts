import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - reduces unnecessary refetches
      retry: 2,
      refetchOnWindowFocus: 'always', // Only refetch when data is stale (better mobile UX)
    },
  },
});
