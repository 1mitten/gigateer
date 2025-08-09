'use client';

import { useState, useEffect, useCallback } from 'react';
import { cacheManager } from '../lib/cache-manager';
import { useOnlineStatus } from '../components/offline-detector';

interface UseCachedDataOptions {
  ttl?: number;
  version?: string;
  forceNetwork?: boolean;
  fallbackToCache?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isFromCache: boolean;
  lastUpdated: Date | null;
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
): UseCachedDataReturn<T> {
  const {
    ttl = 15 * 60 * 1000, // 15 minutes
    version = '1.0.0',
    forceNetwork = false,
    fallbackToCache = true,
    refetchOnMount = true,
    refetchOnReconnect = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isOnline = useOnlineStatus();

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first if not forcing refresh
      if (!forceRefresh && !forceNetwork) {
        const cached = cacheManager.getCached<T>(key, ttl, version);
        if (cached) {
          setData(cached);
          setIsFromCache(true);
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
      }

      const result = await cacheManager.get(key, fetcher, {
        ttl,
        version,
        forceNetwork: forceRefresh || forceNetwork,
        fallbackToCache,
      });

      setData(result);
      setIsFromCache(false);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Try to get stale cache as fallback
      const staleCache = cacheManager.getCached<T>(key, Infinity, version);
      if (staleCache) {
        setData(staleCache);
        setIsFromCache(true);
        setLastUpdated(new Date());
        console.warn('[useCachedData] Using stale cache due to error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, version, forceNetwork, fallbackToCache]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && refetchOnReconnect && data && isFromCache) {
      fetchData(true);
    }
  }, [isOnline, refetchOnReconnect, data, isFromCache, fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isFromCache,
    lastUpdated,
  };
}

export function useCachedGigs(filters?: Record<string, any>) {
  const queryString = filters ? new URLSearchParams(filters).toString() : '';
  const key = `gigs${queryString ? `?${queryString}` : ''}`;
  
  return useCachedData(
    key,
    () => fetch(`/api/gigs${queryString ? `?${queryString}` : ''}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch gigs');
      return res.json();
    }),
    {
      ttl: 15 * 60 * 1000, // 15 minutes
      refetchOnReconnect: true,
    }
  );
}

export function useCachedGig(id: string) {
  return useCachedData(
    `gig-${id}`,
    () => fetch(`/api/gigs/${id}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch gig');
      return res.json();
    }),
    {
      ttl: 30 * 60 * 1000, // 30 minutes (individual gigs change less frequently)
      refetchOnReconnect: true,
    }
  );
}

export function useCachedMeta() {
  return useCachedData(
    'meta',
    () => fetch('/api/meta').then(res => {
      if (!res.ok) throw new Error('Failed to fetch meta');
      return res.json();
    }),
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      refetchOnReconnect: true,
    }
  );
}