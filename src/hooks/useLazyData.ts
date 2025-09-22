'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { appCache } from '@/lib/cache';

interface LazyDataOptions<T> {
  cacheKey?: string;
  cacheTimeMs?: number;
  immediate?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
}

interface LazyDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  reset: () => void;
}

export function useLazyData<T>(
  fetcher: () => Promise<T>,
  options: LazyDataOptions<T> = {}
): LazyDataState<T> {
  const {
    cacheKey,
    cacheTimeMs = 5 * 60 * 1000, // 5 minutes default
    immediate = false,
    retryCount = 2,
    retryDelayMs = 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    if (cacheKey) {
      appCache.delete(cacheKey);
    }
  }, [cacheKey]);

  const fetchData = useCallback(async (attemptCount = 0): Promise<void> => {
    // Check cache first
    if (cacheKey) {
      const cachedData = appCache.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        setError(null);

        // Cache the result
        if (cacheKey) {
          appCache.set(cacheKey, result, cacheTimeMs);
        }
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const error = err instanceof Error ? err : new Error('Unknown error');

        // Retry logic
        if (attemptCount < retryCount) {
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(attemptCount + 1);
          }, retryDelayMs * (attemptCount + 1)); // Exponential backoff
        } else {
          setError(error);
        }
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetcher, cacheKey, cacheTimeMs, retryCount, retryDelayMs]);

  // Auto-fetch on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchData, immediate]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset
  };
}

// Specialized hook for paginated data
export function useLazyPaginatedData<T>(
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number; hasMore: boolean }>,
  options: { pageSize?: number; cachePrefix?: string } = {}
) {
  const { pageSize = 20, cachePrefix = 'paginated' } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { data, loading, error, refetch } = useLazyData(
    () => fetcher(currentPage, pageSize),
    {
      cacheKey: `${cachePrefix}_page_${currentPage}`,
      immediate: false
    }
  );

  useEffect(() => {
    if (data) {
      if (currentPage === 1) {
        setAllData(data.data);
      } else {
        setAllData(prev => [...prev, ...data.data]);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
  }, [data, currentPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setAllData([]);
    setTotal(0);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    loading,
    error,
    total,
    hasMore,
    currentPage,
    loadMore,
    reset: resetPagination,
    refetch: () => {
      resetPagination();
      return refetch();
    }
  };
}