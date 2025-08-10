'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GigsResponse, GigDetailResponse, ErrorResponse } from '../types/api';
import { Gig } from '@gigateer/contracts';
import { APP_CONFIG } from '../config/app.config';

interface UseGigsApiState {
  data: Gig[];
  pagination: GigsResponse['pagination'] | null;
  meta: GigsResponse['meta'] | null;
  loading: boolean;
  error: string | null;
}

export function useGigsApi(params: Record<string, string>) {
  const [state, setState] = useState<UseGigsApiState>({
    data: [],
    pagination: null,
    meta: null,
    loading: false, // Start as false to prevent hydration mismatch
    error: null,
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = APP_CONFIG.api.RETRY_ATTEMPTS;
  const loadingTimeoutMs = APP_CONFIG.api.LOADING_TIMEOUT;

  // Handle hydration issues
  useEffect(() => {
    setMounted(true);
    // Start loading only after component is mounted
    setState(prev => ({ ...prev, loading: true }));
  }, []);

  const fetchGigs = useCallback(async (isRetry: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set loading timeout
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Request timed out. Please try refreshing the page.',
      }));
    }, loadingTimeoutMs);

    try {
      const queryParams = new URLSearchParams();
      
      // Add non-empty params
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.set(key, value);
        }
      });

      const url = `/api/gigs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      // Create manual abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, APP_CONFIG.api.TIMEOUT);

      const response = await fetch(url, {
        signal: abortController.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gigs');
      }

      const result: GigsResponse = await response.json();
      
      setState({
        data: result.data,
        pagination: result.pagination,
        meta: result.meta,
        loading: false,
        error: null,
      });
      
      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Reset retry count on success
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error fetching gigs:', error);
      
      // Retry logic for connection issues
      const shouldRetry = retryCount < maxRetries && (
        error instanceof Error && (
          error.name === 'TimeoutError' ||
          error.name === 'AbortError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('connection') ||
          error.message.includes('aborted')
        )
      );
      
      if (shouldRetry && !isRetry) {
        // Retrying request with exponential backoff
        setRetryCount(prev => prev + 1);
        // Exponential backoff: 1s, 2s, 4s
        setTimeout(() => fetchGigs(true), Math.pow(2, retryCount) * 1000);
        return;
      }
      
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  }, [params, retryCount, maxRetries, loadingTimeoutMs]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Fetch data when params change, but only after component is mounted
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useGigsApi] Effect called - mounted: ${mounted}, params:`, params);
    }
    if (mounted) {
      console.log(`[useGigsApi] Starting fetch...`);
      fetchGigs();
    }
  }, [fetchGigs, mounted]);

  return {
    ...state,
    refetch: () => fetchGigs(false),
  };
}

interface UseGigDetailState {
  data: Gig | null;
  loading: boolean;
  error: string | null;
}

export function useGigDetail(id: string) {
  const [state, setState] = useState<UseGigDetailState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchGig = useCallback(async () => {
    if (!id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/gigs/${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gig');
      }

      const result: GigDetailResponse = await response.json();
      
      setState({
        data: result.data,
        loading: false,
        error: null,
      });
      
    } catch (error) {
      console.error('Error fetching gig:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  }, [id]);

  useEffect(() => {
    fetchGig();
  }, [fetchGig]);

  return {
    ...state,
    refetch: fetchGig,
  };
}

// Hook for managing sort options
export function useGigSort() {
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'venue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortGigs = useCallback((gigs: Gig[]) => {
    const sorted = [...gigs].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'venue':
          comparison = a.venue.name.localeCompare(b.venue.name);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }, [sortBy, sortOrder]);

  const toggleSort = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy]);

  return {
    sortBy,
    sortOrder,
    sortGigs,
    toggleSort,
  };
}