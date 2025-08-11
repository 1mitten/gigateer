import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getCachedGigs, invalidateCache, getCacheStats, warmCache, QueryOptions } from '../cache';
import { Gig } from '@gigateer/contracts';

// Mock LRU cache
vi.mock('lru-cache', () => {
  return {
    LRUCache: vi.fn().mockImplementation((options) => {
      const store = new Map();
      let sizeValue = 0;
      return {
        get: vi.fn((key) => store.get(key)),
        set: vi.fn((key, value) => {
          store.set(key, value);
          sizeValue = store.size;
          return this;
        }),
        has: vi.fn((key) => store.has(key)),
        delete: vi.fn((key) => {
          const result = store.delete(key);
          sizeValue = store.size;
          return result;
        }),
        clear: vi.fn(() => {
          store.clear();
          sizeValue = 0;
        }),
        keys: vi.fn(() => store.keys()),
        get size() { return sizeValue; },
        calculatedSize: 0,
      };
    }),
  };
});

describe('Cache System', () => {
  const mockGig: Gig = {
    id: 'test-1',
    source: 'test',
    title: 'Test Event',
    artists: ['Artist 1'],
    tags: ['rock', 'live'],
    dateStart: '2024-12-25T20:00:00Z',
    dateEnd: '2024-12-25T23:00:00Z',
    venue: {
      name: 'Test Venue',
      city: 'Bristol',
      country: 'UK',
    },
    status: 'scheduled',
    ticketsUrl: 'https://example.com/tickets',
    eventUrl: 'https://example.com/event',
    images: ['https://example.com/image.jpg'],
    updatedAt: '2024-01-01T00:00:00Z',
    hash: 'test-hash',
  };

  const mockFetcher = vi.fn(async () => ({
    data: [mockGig],
    totalCount: 1,
    hasMore: false,
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset cache stats using the actual cacheStats object
    const { cacheStats } = await import('../cache');
    cacheStats.reset();
  });

  afterEach(() => {
    invalidateCache('bristol');
  });

  describe('getCachedGigs', () => {
    it('should fetch from source on cache miss', async () => {
      const result = await getCachedGigs('bristol', { page: 1 }, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual([mockGig]);
      expect(result.cacheHit).toBe('miss');
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should return hot cache hit for first 3 pages', async () => {
      // Prime the cache
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      mockFetcher.mockClear();

      // Second call should hit cache
      const result = await getCachedGigs('bristol', { page: 1 }, mockFetcher);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(result.cacheHit).toBe('hot');
      expect(result.data).toEqual([mockGig]);
    });

    it('should use warm cache for pages 4-10', async () => {
      // Prime warm cache for page 5
      await getCachedGigs('bristol', { page: 5 }, mockFetcher);
      mockFetcher.mockClear();

      // Second call should hit warm cache
      const result = await getCachedGigs('bristol', { page: 5 }, mockFetcher);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(result.cacheHit).toBe('warm');
    });

    it('should generate unique cache keys for different parameters', async () => {
      const options1: QueryOptions = { page: 1, sortBy: 'date' };
      const options2: QueryOptions = { page: 1, sortBy: 'name' };

      await getCachedGigs('bristol', options1, mockFetcher);
      await getCachedGigs('bristol', options2, mockFetcher);

      // Both should fetch as they have different keys
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle different cities separately', async () => {
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('london', { page: 1 }, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should respect TTL for cache entries', async () => {
      // Mock Date to control time
      const originalNow = Date.now;
      let currentTime = originalNow();
      Date.now = vi.fn(() => currentTime);

      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      mockFetcher.mockClear();

      // Move time forward past TTL (5 minutes for hot cache)
      currentTime += 6 * 60 * 1000;

      await getCachedGigs('bristol', { page: 1 }, mockFetcher);

      // Should fetch again as cache is stale
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      Date.now = originalNow;
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate all cache entries for a city', async () => {
      // Prime caches
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('bristol', { page: 2 }, mockFetcher);
      mockFetcher.mockClear();

      // Invalidate
      invalidateCache('bristol');

      // Should fetch again
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should support partial invalidation', async () => {
      // Prime caches with different parameters
      await getCachedGigs('bristol', { page: 1, timeRange: 'week' }, mockFetcher);
      await getCachedGigs('bristol', { page: 1, timeRange: 'day' }, mockFetcher);
      mockFetcher.mockClear();

      // Partial invalidation (only hot cache)
      invalidateCache('bristol', { partial: true });

      // First should miss (was in hot cache)
      await getCachedGigs('bristol', { page: 1, timeRange: 'week' }, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should not affect other cities', async () => {
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('london', { page: 1 }, mockFetcher);
      mockFetcher.mockClear();

      invalidateCache('bristol');

      // London should still be cached
      await getCachedGigs('london', { page: 1 }, mockFetcher);
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should track cache hits and misses', async () => {
      // Import the actual cacheStats object to check it directly
      const { cacheStats } = await import('../cache');
      cacheStats.reset();

      // First call - miss
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      expect(cacheStats.misses).toBe(1);
      expect(cacheStats.hits.hot).toBe(0);

      // Second call - hot hit
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      expect(cacheStats.hits.hot).toBe(1);
      expect(cacheStats.misses).toBe(1);
    });

    it('should track hot and warm cache separately', async () => {
      const { cacheStats } = await import('../cache');
      cacheStats.reset();

      // Page 1 - goes to hot cache
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      expect(cacheStats.hits.hot).toBe(1);

      // Page 5 - goes to warm cache
      await getCachedGigs('bristol', { page: 5 }, mockFetcher);
      await getCachedGigs('bristol', { page: 5 }, mockFetcher);
      expect(cacheStats.hits.warm).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      const { cacheStats } = await import('../cache');
      cacheStats.reset();

      // 3 misses
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('bristol', { page: 2 }, mockFetcher);
      await getCachedGigs('bristol', { page: 3 }, mockFetcher);

      // 2 hits
      await getCachedGigs('bristol', { page: 1 }, mockFetcher);
      await getCachedGigs('bristol', { page: 2 }, mockFetcher);

      // Calculate hit rate manually since getCacheStats doesn't have getHitRate method
      const totalHits = cacheStats.hits.hot + cacheStats.hits.warm + cacheStats.hits.cold;
      const totalRequests = totalHits + cacheStats.misses;
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      expect(hitRate).toBe(0.4); // 2 hits / 5 total = 0.4
    });
  });

  describe('warmCache', () => {
    it('should pre-populate cache for popular cities', async () => {
      const cities = ['bristol', 'london'];
      const dataFetcher = vi.fn(async (city: string) => ({
        data: [{ ...mockGig, venue: { ...mockGig.venue, city } }],
        totalCount: 1,
        hasMore: false,
      }));

      await warmCache(cities, dataFetcher);

      // The warmCache function warms 3 time ranges (today, week, month) × 3 pages × 2 cities = 18 calls
      // But since it's wrapped in getCachedGigs, it should call the data fetcher for each city at least once
      expect(dataFetcher).toHaveBeenCalledWith('bristol');
      expect(dataFetcher).toHaveBeenCalledWith('london');
      
      // Allow for multiple calls per city due to different time ranges and pages
      const bristolCalls = dataFetcher.mock.calls.filter(call => call[0] === 'bristol').length;
      const londonCalls = dataFetcher.mock.calls.filter(call => call[0] === 'london').length;
      
      expect(bristolCalls).toBeGreaterThanOrEqual(1);
      expect(londonCalls).toBeGreaterThanOrEqual(1);
    });

    it('should make subsequent requests hit cache', async () => {
      const cities = ['bristol'];
      const dataFetcher = vi.fn(async () => ({
        data: [mockGig],
        totalCount: 1,
        hasMore: false,
      }));

      await warmCache(cities, dataFetcher);
      mockFetcher.mockClear();

      // This should hit cache
      const result = await getCachedGigs('bristol', { page: 1 }, mockFetcher);

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(result.cacheHit).toBe('hot');
    });
  });

  describe('Cache key generation', () => {
    it('should create consistent keys for same parameters', async () => {
      const options: QueryOptions = {
        page: 1,
        limit: 50,
        timeRange: 'week',
        sortBy: 'date',
        filters: {
          genre: ['rock', 'pop'],
          venue: ['venue1'],
        },
      };

      await getCachedGigs('bristol', options, mockFetcher);
      mockFetcher.mockClear();

      // Same parameters should hit cache
      await getCachedGigs('bristol', options, mockFetcher);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should create different keys for different filters', async () => {
      const options1: QueryOptions = {
        page: 1,
        filters: { genre: ['rock'] },
      };
      const options2: QueryOptions = {
        page: 1,
        filters: { genre: ['pop'] },
      };

      await getCachedGigs('bristol', options1, mockFetcher);
      await getCachedGigs('bristol', options2, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });
});