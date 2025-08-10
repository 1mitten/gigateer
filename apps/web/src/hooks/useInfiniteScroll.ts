'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Gig } from '@gigateer/contracts';
import { GigsResponse } from '../types/api';
import { APP_CONFIG } from '../config/app.config';

interface UseInfiniteScrollParams {
  apiParams: Record<string, string>;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refresh: () => void;
  totalCount: number;
  currentPage: number;
  meta: GigsResponse['meta'] | null;
}

export function useInfiniteScroll({ 
  apiParams, 
  enabled = true 
}: UseInfiniteScrollParams): UseInfiniteScrollReturn {
  const [pages, setPages] = useState<GigsResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState<GigsResponse['meta'] | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');
  
  // Memoize all gigs from all pages
  const allGigs = useMemo(() => {
    return pages.flatMap(page => page.data);
  }, [pages]);

  // Check if params have changed (for reset detection)
  const paramsString = useMemo(() => {
    // Create a stable string representation of params (excluding page)
    const { page, ...otherParams } = apiParams;
    return JSON.stringify(otherParams);
  }, [apiParams]);

  // Reset when search params change (excluding page)
  useEffect(() => {
    if (paramsString !== lastParamsRef.current) {
      lastParamsRef.current = paramsString;
      setPages([]);
      setCurrentPage(1);
      setHasNextPage(true);
      setError(null);
      setTotalCount(0);
      setMeta(null);
      
      // Fetch first page with new params
      if (enabled) {
        fetchPage(1, true);
      }
    }
  }, [paramsString, enabled]);

  const fetchPage = useCallback(async (page: number, isReset: boolean = false) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    if (isReset) {
      setError(null);
    }

    try {
      const queryParams = new URLSearchParams();
      
      // Add all params except page (we control page here)
      Object.entries(apiParams).forEach(([key, value]) => {
        if (key !== 'page' && value) {
          queryParams.set(key, value);
        }
      });
      
      // Set the specific page we want
      queryParams.set('page', page.toString());
      queryParams.set('limit', (apiParams.limit || APP_CONFIG.pagination.DEFAULT_LIMIT.toString()).toString());

      const url = `/api/gigs?${queryParams.toString()}`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gigs');
      }

      const result: GigsResponse = await response.json();
      
      // Update state based on whether this is a reset or additional page
      setPages(prevPages => {
        if (isReset) {
          return [result];
        } else {
          // Check if we already have this page (avoid duplicates)
          const existingPageIndex = prevPages.findIndex(p => p.pagination.page === result.pagination.page);
          if (existingPageIndex >= 0) {
            // Replace existing page
            const newPages = [...prevPages];
            newPages[existingPageIndex] = result;
            return newPages;
          } else {
            // Add new page
            return [...prevPages, result];
          }
        }
      });
      
      setCurrentPage(result.pagination.page);
      setTotalCount(result.pagination.total);
      setMeta(result.meta);
      setHasNextPage(result.pagination.page < result.pagination.pages);
      setError(null);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching page:', error);
      }
      setError(error instanceof Error ? error.message : 'Failed to load more gigs');
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || loading) {
      return;
    }
    
    const nextPage = currentPage + 1;
    fetchPage(nextPage);
  }, [hasNextPage, loading, currentPage, fetchPage]);

  const refresh = useCallback(() => {
    setPages([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setError(null);
    fetchPage(1, true);
  }, [fetchPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load first page when enabled
  useEffect(() => {
    if (enabled && pages.length === 0 && !loading) {
      fetchPage(1, true);
    }
  }, [enabled, pages.length, loading, fetchPage]);

  return {
    gigs: allGigs,
    loading,
    error,
    hasNextPage,
    fetchNextPage,
    refresh,
    totalCount,
    currentPage,
    meta,
  };
}