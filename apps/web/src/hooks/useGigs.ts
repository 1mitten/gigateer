'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Gig } from '@gigateer/contracts';
import { TimeRange } from '@/lib/cache';

// Types for the hook
interface GigFilters {
  genre?: string[];
  venue?: string[];
  priceRange?: [number, number];
}

interface GigOptions {
  timeRange?: TimeRange;
  sortBy?: 'date' | 'name' | 'venue';
  filters?: GigFilters;
  limit?: number;
}

interface UseGigsResult {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  cacheHit?: 'hot' | 'warm' | 'miss';
}

interface GigResponse {
  data: Gig[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    city: string;
    timeRange: TimeRange;
    sortBy: string;
    filters?: GigFilters;
    cacheHit: 'hot' | 'warm' | 'miss';
  };
}

// Cache for prefetched data
const prefetchCache = new Map<string, { data: GigResponse; timestamp: number }>();
const PREFETCH_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for fetching gigs with pagination and prefetching
 */
export function useGigs(city: string, options: GigOptions = {}): UseGigsResult {
  const {
    timeRange = 'week',
    sortBy = 'date',
    filters,
    limit = 50,
  } = options;

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [cacheHit, setCacheHit] = useState<'hot' | 'warm' | 'miss' | undefined>();

  // Track loading state to prevent duplicate requests
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate cache key for prefetching
  const getCacheKey = useCallback((pageNum: number) => {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `${city}:${pageNum}:${limit}:${timeRange}:${sortBy}:${filterStr}`;
  }, [city, limit, timeRange, sortBy, filters]);

  // Build query string
  const buildQueryString = useCallback((pageNum: number) => {
    const params = new URLSearchParams({
      page: pageNum.toString(),
      limit: limit.toString(),
      timeRange,
      sortBy,
    });

    if (filters?.genre?.length) {
      params.set('genre', filters.genre.join(','));
    }
    if (filters?.venue?.length) {
      params.set('venue', filters.venue.join(','));
    }
    if (filters?.priceRange) {
      params.set('minPrice', filters.priceRange[0].toString());
      params.set('maxPrice', filters.priceRange[1].toString());
    }

    return params.toString();
  }, [limit, timeRange, sortBy, filters]);

  // Fetch gigs from API
  const fetchGigs = useCallback(async (
    pageNum: number,
    signal?: AbortSignal
  ): Promise<GigResponse> => {
    const cacheKey = getCacheKey(pageNum);
    
    // Check prefetch cache first
    const cached = prefetchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREFETCH_TTL) {
      return cached.data;
    }

    const queryString = buildQueryString(pageNum);
    const response = await fetch(`/api/gigs/city/${city}?${queryString}`, {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gigs: ${response.statusText}`);
    }

    const data: GigResponse = await response.json();
    
    // Cache the response for potential prefetching
    prefetchCache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (prefetchCache.size > 20) {
      const now = Date.now();
      for (const [key, value] of prefetchCache.entries()) {
        if (now - value.timestamp > PREFETCH_TTL) {
          prefetchCache.delete(key);
        }
      }
    }

    return data;
  }, [city, getCacheKey, buildQueryString]);

  // Prefetch next page
  const prefetchNextPage = useCallback(async (currentPage: number) => {
    const nextPage = currentPage + 1;
    const cacheKey = getCacheKey(nextPage);
    
    // Don't prefetch if already cached
    if (prefetchCache.has(cacheKey)) {
      return;
    }

    try {
      // Prefetch in background without blocking
      setTimeout(async () => {
        try {
          await fetchGigs(nextPage);
        } catch (error) {
          // Silently fail prefetch - not critical
          console.warn('Prefetch failed:', error);
        }
      }, 100);
    } catch (error) {
      // Silently fail prefetch
      console.warn('Prefetch failed:', error);
    }
  }, [fetchGigs, getCacheKey]);

  // Load more gigs (pagination)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    setLoading(true);
    loadingRef.current = true;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      const nextPage = page + 1;
      const response = await fetchGigs(nextPage, abortControllerRef.current.signal);
      
      setGigs(prev => [...prev, ...response.data]);
      setPage(nextPage);
      setHasMore(response.pagination.hasMore);
      setTotalCount(response.pagination.totalCount);
      setCacheHit(response.meta.cacheHit);
      setError(null);

      // Prefetch next page for smooth scrolling
      if (response.pagination.hasMore) {
        await prefetchNextPage(nextPage);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err instanceof Error ? err.message : 'Failed to load more gigs');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, fetchGigs, prefetchNextPage]);

  // Refresh gigs (reload from first page)
  const refresh = useCallback(async () => {
    setLoading(true);
    loadingRef.current = true;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      // Clear prefetch cache for this city
      const keysToDelete = Array.from(prefetchCache.keys()).filter(key => key.startsWith(`${city}:`));
      keysToDelete.forEach(key => prefetchCache.delete(key));

      const response = await fetchGigs(1, abortControllerRef.current.signal);
      
      setGigs(response.data);
      setPage(1);
      setHasMore(response.pagination.hasMore);
      setTotalCount(response.pagination.totalCount);
      setCacheHit(response.meta.cacheHit);
      setError(null);

      // Prefetch page 2 if there's more data
      if (response.pagination.hasMore) {
        await prefetchNextPage(1);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err instanceof Error ? err.message : 'Failed to refresh gigs');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [city, fetchGigs, prefetchNextPage]);

  // Initial load
  useEffect(() => {
    refresh();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [city, timeRange, sortBy, JSON.stringify(filters)]); // Depend on serialized filters

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    gigs,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refresh,
    cacheHit,
  };
}

/**
 * Hook for single page gig fetching (no pagination)
 */
export function useGigsPage(
  city: string,
  page: number,
  options: GigOptions = {}
): Omit<UseGigsResult, 'loadMore' | 'page'> {
  const {
    timeRange = 'week',
    sortBy = 'date',
    filters,
    limit = 50,
  } = options;

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [cacheHit, setCacheHit] = useState<'hot' | 'warm' | 'miss' | undefined>();

  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        timeRange,
        sortBy,
      });

      if (filters?.genre?.length) {
        params.set('genre', filters.genre.join(','));
      }
      if (filters?.venue?.length) {
        params.set('venue', filters.venue.join(','));
      }
      if (filters?.priceRange) {
        params.set('minPrice', filters.priceRange[0].toString());
        params.set('maxPrice', filters.priceRange[1].toString());
      }

      const response = await fetch(`/api/gigs/city/${city}?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch gigs: ${response.statusText}`);
      }

      const data: GigResponse = await response.json();
      
      setGigs(data.data);
      setHasMore(data.pagination.hasMore);
      setTotalCount(data.pagination.totalCount);
      setCacheHit(data.meta.cacheHit);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch gigs');
    } finally {
      setLoading(false);
    }
  }, [city, page, limit, timeRange, sortBy, filters]);

  useEffect(() => {
    refresh();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refresh]);

  return {
    gigs,
    loading,
    error,
    hasMore,
    totalCount,
    refresh,
    cacheHit,
  };
}