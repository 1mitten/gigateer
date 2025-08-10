'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { Gig } from '@gigateer/contracts';
import { GigsResponse } from '../types/api';
import { APP_CONFIG } from '../config/app.config';

interface UseGigsInfiniteQueryParams {
  sortBy?: 'date' | 'name' | 'venue';
  sortOrder?: 'asc' | 'desc';
  city?: string;
  tags?: string;
  venue?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseGigsInfiniteQueryReturn {
  gigs: Gig[];
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  refresh: () => void;
  totalCount: number;
  meta: GigsResponse['meta'] | null;
}

async function fetchGigs({
  pageParam = 1,
  queryKey,
}: {
  pageParam?: number;
  queryKey: readonly [string, UseGigsInfiniteQueryParams];
}): Promise<GigsResponse> {
  const [, params] = queryKey;
  
  // TEMP DEBUG: Log fetch attempt
  if (process.env.NODE_ENV === 'development') {
    console.log(`[fetchGigs] Called with pageParam: ${pageParam}, params:`, params);
  }
  
  const queryParams = new URLSearchParams();
  
  // Add all parameters
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.city) queryParams.set('city', params.city);
  if (params.tags) queryParams.set('tags', params.tags);
  if (params.venue) queryParams.set('venue', params.venue);
  if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.set('dateTo', params.dateTo);
  if (params.q) queryParams.set('q', params.q);
  
  queryParams.set('page', pageParam.toString());
  queryParams.set('limit', (params.limit || APP_CONFIG.pagination.DEFAULT_LIMIT).toString());
  
  const url = `/api/gigs?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch gigs');
  }
  
  return response.json();
}

export function useGigsInfiniteQuery({
  sortBy = 'date',
  sortOrder = 'asc',
  city,
  tags,
  venue,
  dateFrom,
  dateTo,
  q,
  limit = APP_CONFIG.pagination.DEFAULT_LIMIT,
  enabled = true,
}: UseGigsInfiniteQueryParams = {}): UseGigsInfiniteQueryReturn {
  // TEMP DEBUG: Log when hook is called
  if (process.env.NODE_ENV === 'development') {
    console.log(`[useGigsInfiniteQuery] Hook called - enabled: ${enabled}, sortBy: ${sortBy}, sortOrder: ${sortOrder}, dateFrom: "${dateFrom}", dateTo: "${dateTo}"`);
  }
  const queryKey = ['gigs', {
    sortBy,
    sortOrder,
    city,
    tags,
    venue,
    dateFrom,
    dateTo,
    q,
    limit,
  }] as const;
  
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchGigs,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    enabled,
    staleTime: 30000, // Keep data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: (failureCount, error) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useGigsInfiniteQuery] Query retry ${failureCount}, error:`, error);
      }
      return failureCount < 3;
    },
    // When parameters change, we want to refetch from the beginning
    // React Query handles this automatically based on queryKey changes
  });

  // TEMP DEBUG: Log query state changes
  if (process.env.NODE_ENV === 'development') {
    console.log(`[useGigsInfiniteQuery] Query state - isPending: ${isPending}, isFetching: ${isFetching}, enabled: ${enabled}, hasData: ${!!data}, dataLength: ${data?.pages?.length || 0}, error: ${error?.message || 'none'}`);
  }
  
  // Flatten all pages into a single array of gigs
  const gigs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);
  
  // Get total count from the first page
  const totalCount = data?.pages?.[0]?.pagination?.total || 0;
  
  // Get meta from the first page
  const meta = data?.pages?.[0]?.meta || null;
  
  // TEMP: Force a refetch after initial render to trigger the query
  React.useEffect(() => {
    if (enabled && process.env.NODE_ENV === 'development') {
      console.log('[useGigsInfiniteQuery] Attempting to force refetch...');
      const timer = setTimeout(() => {
        refetch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [enabled, refetch]);

  return {
    gigs,
    loading: isPending || (isFetching && !isFetchingNextPage),
    error: error as Error | null,
    hasNextPage: !!hasNextPage,
    fetchNextPage: () => {
      if (!isFetchingNextPage && hasNextPage) {
        fetchNextPage();
      }
    },
    isFetchingNextPage,
    refresh: () => refetch(),
    totalCount,
    meta,
  };
}