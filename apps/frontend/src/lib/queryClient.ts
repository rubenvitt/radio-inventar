import { QueryClient } from '@tanstack/react-query';

// Custom retry logic for offline support
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message === 'Failed to fetch' ||
      error.message.includes('Network') ||
      error.message.includes('fetch')
    );
  }
  return false;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - reduces unnecessary refetches
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep unused data in cache for offline access
      retry: (failureCount, error) => {
        // Don't retry on network errors when offline
        if (!navigator.onLine && isNetworkError(error)) {
          return false;
        }
        // Otherwise retry up to 2 times
        return failureCount < 2;
      },
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always', // Refetch when coming back online
      networkMode: 'offlineFirst', // Return cached data immediately, then refetch
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations when offline
        if (!navigator.onLine && isNetworkError(error)) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
  },
});
