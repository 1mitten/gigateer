/**
 * Tiered caching strategy for scalable event data management
 * Handles datasets from 100 to 100,000+ events efficiently
 */

import { LRUCache } from 'lru-cache';
import { Gig } from '@gigateer/contracts';

// Cache configuration
const CACHE_CONFIG = {
  HOT_CACHE_TTL: 5 * 60 * 1000,     // 5 minutes for frequently accessed data
  WARM_CACHE_TTL: 30 * 60 * 1000,   // 30 minutes for moderately accessed data
  COLD_CACHE_TTL: 60 * 60 * 1000,   // 1 hour for rarely accessed data
  MAX_HOT_ITEMS: 100,                // Maximum items in hot cache
  MAX_WARM_ITEMS: 500,               // Maximum items in warm cache
  DEFAULT_PAGE_SIZE: 50,             // Default number of items per page
  MAX_PAGE_SIZE: 100,                // Maximum items per page
  PREFETCH_THRESHOLD: 0.8,           // Prefetch when 80% through current page
};

// Time range definitions
export const TIME_RANGES = {
  today: { hours: 24, label: 'Today' },
  week: { hours: 24 * 7, label: 'This Week' },
  month: { hours: 24 * 30, label: 'This Month' },
  all: { hours: 24 * 365, label: 'All Upcoming' },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  totalCount?: number;
  hasMore?: boolean;
}

// Query options interface
export interface QueryOptions {
  page?: number;
  limit?: number;
  timeRange?: TimeRange;
  sortBy?: 'date' | 'name' | 'venue';
  filters?: {
    genre?: string[];
    venue?: string[];
    priceRange?: [number, number];
  };
}

// Cache key generator
function getCacheKey(city: string, options: QueryOptions): string {
  const { page = 1, limit = CACHE_CONFIG.DEFAULT_PAGE_SIZE, timeRange = 'week', sortBy = 'date', filters } = options;
  const filterKey = filters ? JSON.stringify(filters) : '';
  return `gigs:${city}:${page}:${limit}:${timeRange}:${sortBy}:${filterKey}`;
}

// Level 1: Hot cache for frequently accessed data
const hotCache = new LRUCache<string, CacheEntry<Gig[]>>({
  max: CACHE_CONFIG.MAX_HOT_ITEMS,
  ttl: CACHE_CONFIG.HOT_CACHE_TTL,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

// Level 2: Warm cache for moderately accessed data
const warmCacheInstance = new LRUCache<string, CacheEntry<Gig[]>>({
  max: CACHE_CONFIG.MAX_WARM_ITEMS,
  ttl: CACHE_CONFIG.WARM_CACHE_TTL,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

// Cache statistics for monitoring
export const cacheStats = {
  hits: { hot: 0, warm: 0, cold: 0 },
  misses: 0,
  evictions: { hot: 0, warm: 0 },
  reset() {
    this.hits = { hot: 0, warm: 0, cold: 0 };
    this.misses = 0;
    this.evictions = { hot: 0, warm: 0 };
  },
};

// Note: LRU-Cache doesn't have built-in event listeners for evictions
// Stats will be tracked during cache operations instead

/**
 * Get cached gigs with tiered caching strategy
 */
export async function getCachedGigs(
  city: string,
  options: QueryOptions,
  fetcher: () => Promise<{ data: Gig[]; totalCount: number; hasMore: boolean }>
): Promise<{ data: Gig[]; totalCount: number; hasMore: boolean; cacheHit: 'hot' | 'warm' | 'miss' }> {
  const key = getCacheKey(city, options);
  const { page = 1 } = options;

  // Level 1: Check hot cache (first few pages)
  if (page <= 3) {
    const hotEntry = hotCache.get(key);
    if (hotEntry && !isStale(hotEntry, CACHE_CONFIG.HOT_CACHE_TTL)) {
      cacheStats.hits.hot++;
      return { 
        data: hotEntry.data, 
        totalCount: hotEntry.totalCount || 0, 
        hasMore: hotEntry.hasMore || false, 
        cacheHit: 'hot' 
      };
    }
  }

  // Level 2: Check warm cache (pages 4-10)
  if (page > 3 && page <= 10) {
    const warmEntry = warmCacheInstance.get(key);
    if (warmEntry && !isStale(warmEntry, CACHE_CONFIG.WARM_CACHE_TTL)) {
      cacheStats.hits.warm++;
      // Promote to hot cache if accessed frequently
      if (shouldPromoteToHot(key)) {
        hotCache.set(key, warmEntry);
      }
      return { 
        data: warmEntry.data, 
        totalCount: warmEntry.totalCount || 0, 
        hasMore: warmEntry.hasMore || false, 
        cacheHit: 'warm' 
      };
    }
  }

  // Level 3: Fetch from database
  cacheStats.misses++;
  const result = await fetcher();
  
  // Cache based on access pattern
  const entry: CacheEntry<Gig[]> = {
    data: result.data,
    timestamp: Date.now(),
    totalCount: result.totalCount,
    hasMore: result.hasMore,
  };

  if (page <= 3) {
    hotCache.set(key, entry);
  } else if (page <= 10) {
    warmCacheInstance.set(key, entry);
  }
  // Pages > 10 are not cached (cold data)

  return { ...result, cacheHit: 'miss' };
}

/**
 * Invalidate cache entries for a specific city
 */
export function invalidateCache(city?: string, options?: { partial?: boolean }) {
  if (!city) {
    // Clear all caches
    hotCache.clear();
    warmCacheInstance.clear();
    return;
  }

  // Clear specific city entries
  const pattern = `gigs:${city}:`;
  
  for (const key of hotCache.keys()) {
    if (key.startsWith(pattern)) {
      hotCache.delete(key);
    }
  }

  if (!options?.partial) {
    for (const key of warmCacheInstance.keys()) {
      if (key.startsWith(pattern)) {
        warmCacheInstance.delete(key);
      }
    }
  }
}

/**
 * Prefetch next page for smooth scrolling experience
 */
export async function prefetchNextPage(
  city: string,
  currentOptions: QueryOptions,
  fetcher: () => Promise<{ data: Gig[]; totalCount: number; hasMore: boolean }>
): Promise<void> {
  const nextOptions = { ...currentOptions, page: (currentOptions.page || 1) + 1 };
  const key = getCacheKey(city, nextOptions);

  // Don't prefetch if already cached
  if (hotCache.has(key) || warmCacheInstance.has(key)) {
    return;
  }

  // Prefetch in background
  setTimeout(async () => {
    try {
      await getCachedGigs(city, nextOptions, fetcher);
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }, 100);
}

/**
 * Warm cache for popular cities
 */
export async function warmCacheForPopularCities(
  cities: string[],
  fetcher: (city: string) => Promise<{ data: Gig[]; totalCount: number; hasMore: boolean }>
): Promise<void> {
  const warmupPromises = cities.map(async (city) => {
    try {
      // Warm first 3 pages for each time range
      const timeRanges: TimeRange[] = ['today', 'week', 'month'];
      
      for (const timeRange of timeRanges) {
        for (let page = 1; page <= 3; page++) {
          const options: QueryOptions = { page, timeRange, limit: CACHE_CONFIG.DEFAULT_PAGE_SIZE };
          await getCachedGigs(city, options, () => fetcher(city));
          
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error(`Failed to warm cache for ${city}:`, error);
    }
  });

  await Promise.all(warmupPromises);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStatistics() {
  return {
    ...cacheStats,
    sizes: {
      hot: hotCache.size,
      warm: warmCacheInstance.size,
    },
    memory: {
      hot: hotCache.calculatedSize,
      warm: warmCacheInstance.calculatedSize,
    },
  };
}

// Helper functions
function isStale(entry: CacheEntry<any>, ttl: number): boolean {
  return Date.now() - entry.timestamp > ttl;
}

// Track access frequency for promotion decisions
const accessFrequency = new Map<string, number>();

function shouldPromoteToHot(key: string): boolean {
  const count = (accessFrequency.get(key) || 0) + 1;
  accessFrequency.set(key, count);
  
  // Promote if accessed more than 3 times
  if (count > 3) {
    accessFrequency.delete(key);
    return true;
  }
  
  return false;
}

// Clean up access frequency map periodically
setInterval(() => {
  accessFrequency.clear();
}, CACHE_CONFIG.COLD_CACHE_TTL);

// Helper aliases for easier testing and usage
export const getCacheStats = getCacheStatistics;
export const warmCache = warmCacheForPopularCities;

// Export cache configuration for external use
export { CACHE_CONFIG };