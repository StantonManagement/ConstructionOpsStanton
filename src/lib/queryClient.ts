'use client';

import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults for performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests
      retry: 2,
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Background refetch interval (30 seconds)
      refetchInterval: 30000,
    },
    mutations: {
      retry: 1,
    },
  },
});