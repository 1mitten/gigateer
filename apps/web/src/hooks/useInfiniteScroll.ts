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
  const [isResetting, setIsResetting] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');
  const currentApiParamsRef = useRef(apiParams);
  
  // Memoize all gigs from all pages
  const allGigs = useMemo(() => {
    // If we're resetting (params changed), always return empty array to prevent showing stale data
    if (isResetting) {
      // TEMP DEBUG: Log when returning empty due to reset
      if (process.env.NODE_ENV === 'development') {
        console.log('[INFINITE SCROLL] Returning empty gigs due to isResetting=true');
      }
      return [];
    }
    const result = pages.flatMap(page => page.data);
    // TEMP DEBUG: Log first gig when data changes
    if (process.env.NODE_ENV === 'development' && result.length > 0) {
      const firstGig = result[0];
      console.log(`[INFINITE SCROLL] Returning ${result.length} gigs to component`);
      console.log(`[INFINITE SCROLL] First gig: "${firstGig?.title}" on ${new Date(firstGig?.dateStart).toLocaleDateString()}`);
    }
    return result;
  }, [pages, isResetting]);

  // Update current params ref
  useEffect(() => {
    currentApiParamsRef.current = apiParams;
  }, [apiParams]);
  
  // Check if params have changed (for reset detection)
  const paramsString = useMemo(() => {
    // Create a stable string representation of params (excluding page)
    const { page, ...otherParams } = apiParams;
    return JSON.stringify(otherParams);
  }, [apiParams]);

  // Reset when search params change (excluding page)
  useEffect(() => {
    // Handle initial load
    if (lastParamsRef.current === '' && enabled) {
      lastParamsRef.current = paramsString;
      setLoading(true);
      fetchPage(1, true);
      return;
    }
    
    // Handle parameter changes
    if (paramsString !== lastParamsRef.current) {
      // TEMP DEBUG: Log parameter changes
      if (process.env.NODE_ENV === 'development') {
        console.log(`[INFINITE SCROLL] Params changed from "${lastParamsRef.current}" to "${paramsString}"`);
      }
      
      lastParamsRef.current = paramsString;
      setIsResetting(true); // Mark as resetting to clear displayed data immediately
      setPages([]);
      setCurrentPage(1);
      setHasNextPage(true);
      setError(null);
      setTotalCount(0);
      setMeta(null);
      setLoading(true); // Ensure loading state is set during reset
      
      // Fetch first page with new params
      if (enabled) {
        fetchPage(1, true);
      }
    }
  }, [paramsString, enabled]); // Removed fetchPage to avoid dependency cycle

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
      
      // Use current params from ref to avoid closure issues
      const currentParams = currentApiParamsRef.current;
      
      // Add all params except page (we control page here)
      Object.entries(currentParams).forEach(([key, value]) => {
        if (key !== 'page') {
          // Always include sortBy and sortOrder even if they're default values
          if (key === 'sortBy' || key === 'sortOrder' || value) {
            queryParams.set(key, value);
          }
        }
      });
      
      // Set the specific page we want
      queryParams.set('page', page.toString());
      queryParams.set('limit', (currentParams.limit || APP_CONFIG.pagination.DEFAULT_LIMIT.toString()).toString());

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
      
      // TEMP DEBUG: Log what we received from API
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FETCH PAGE] URL: ${url}`);
        if (result.data.length > 0) {
          console.log(`[FETCH PAGE] Received ${result.data.length} gigs, first: "${result.data[0]?.title}" (${new Date(result.data[0]?.dateStart).toLocaleDateString()})`);
          console.log(`[FETCH PAGE] Sort params: sortBy=${(result.meta as any)?.sort?.sortBy} sortOrder=${(result.meta as any)?.sort?.sortOrder}`);
        }
      }
      
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
      
      // Clear isResetting flag after successfully loading new data
      if (isReset) {
        setIsResetting(false);
      }
      
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
  }, []); // Using ref instead of direct dependency

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