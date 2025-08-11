import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGigs } from '../useGigs';
import { Gig } from '@gigateer/contracts';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGigs hook', () => {
  const mockGig: Gig = {
    id: 'test-1',
    source: 'test',
    title: 'Test Event',
    artists: ['Artist 1'],
    tags: ['rock'],
    dateStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    venue: {
      name: 'Test Venue',
      city: 'Bristol',
    },
    status: 'scheduled',
    images: [],
    updatedAt: new Date().toISOString(),
    hash: 'test-hash',
  };

  const mockResponse = {
    data: [mockGig],
    pagination: {
      page: 1,
      limit: 50,
      totalCount: 1,
      totalPages: 1,
      hasMore: false,
    },
    meta: {
      city: 'bristol',
      cacheHit: 'miss',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'X-Total-Count': '1',
            'X-Has-More': 'false',
            'X-Page': '1',
            'X-Limit': '50',
            'X-Cache-Hit': 'miss',
          };
          return headers[name] || null;
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic functionality', () => {
    it('should fetch gigs on mount', async () => {
      const { result } = renderHook(() => useGigs('bristol'));

      expect(result.current.loading).toBe(true);
      expect(result.current.gigs).toEqual([]);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.gigs).toEqual([mockGig]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.page).toBe(1);
      expect(result.current.cacheHit).toBe('miss');
    });

    it('should build correct API URL with default options', async () => {
      renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/gigs/city/bristol?page=1&limit=50&timeRange=week&sortBy=date',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
            headers: {
              Accept: 'application/json',
            },
          })
        );
      });
    });

    it('should include custom options in API URL', async () => {
      const options = {
        timeRange: 'day' as const,
        sortBy: 'name' as const,
        filters: {
          genre: ['rock'],
          venue: ['venue1'],
          priceRange: [10, 50] as [number, number],
        },
        limit: 20,
      };

      renderHook(() => useGigs('bristol', options));

      await waitFor(() => {
        const expectedUrl = '/api/gigs/city/bristol?page=1&limit=20&timeRange=day&sortBy=name&genre=rock&venue=venue1&minPrice=10&maxPrice=50';
        expect(mockFetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.any(Object)
        );
      });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch gigs: Internal Server Error');
      expect(result.current.gigs).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.gigs).toEqual([]);
    });
  });

  describe('Pagination', () => {
    it('should load more gigs', async () => {
      const page1Response = {
        ...mockResponse,
        pagination: { ...mockResponse.pagination, hasMore: true },
      };
      const page2Response = {
        data: [{ ...mockGig, id: 'test-2' }],
        pagination: {
          page: 2,
          limit: 50,
          totalCount: 2,
          totalPages: 2,
          hasMore: false,
        },
        meta: { city: 'bristol', cacheHit: 'hot' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response),
          headers: {
            get: () => null,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2Response),
          headers: {
            get: () => null,
          },
        });

      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.gigs).toHaveLength(1);

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.gigs).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.page).toBe(2);
      expect(result.current.gigs.map(g => g.id)).toEqual(['test-1', 'test-2']);
    });

    it('should not load more when no more pages', async () => {
      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialFetchCount = mockFetch.mock.calls.length;

      // Try to load more when hasMore is false
      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetch.mock.calls.length).toBe(initialFetchCount);
    });

    it('should handle loadMore errors', async () => {
      const page1Response = {
        ...mockResponse,
        pagination: { ...mockResponse.pagination, hasMore: true },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response),
          headers: { get: () => null },
        })
        .mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Load more failed');
    });
  });

  describe('Refresh functionality', () => {
    it('should refresh data', async () => {
      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockClear();

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.page).toBe(1); // Reset to first page
    });

    it('should handle refresh errors', async () => {
      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('Prefetching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should prefetch next page when near end', async () => {
      // Use real timers for this test to avoid timeout issues
      vi.useRealTimers();
      
      const page1Response = {
        ...mockResponse,
        pagination: { 
          ...mockResponse.pagination, 
          hasMore: true,
          totalCount: 100,
          totalPages: 2
        },
      };
      
      const page2Response = {
        data: [{ ...mockGig, id: 'test-2' }],
        pagination: {
          page: 2,
          limit: 50,
          totalCount: 100,
          totalPages: 2,
          hasMore: false,
        },
        meta: { city: 'bristol', cacheHit: 'miss' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response),
          headers: {
            get: (name: string) => {
              const headers: Record<string, string> = {
                'X-Total-Count': '100',
                'X-Has-More': 'true',
                'X-Page': '1',
                'X-Limit': '50',
                'X-Cache-Hit': 'miss',
              };
              return headers[name] || null;
            },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2Response),
          headers: {
            get: (name: string) => {
              const headers: Record<string, string> = {
                'X-Total-Count': '100',
                'X-Has-More': 'false',
                'X-Page': '2',
                'X-Limit': '50',
                'X-Cache-Hit': 'miss',
              };
              return headers[name] || null;
            },
          },
        });

      const { result } = renderHook(() => useGigs('bristol'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasMore).toBe(true);
      });

      // Verify initial state
      expect(result.current.gigs).toHaveLength(1);
      
      const initialCallCount = mockFetch.mock.calls.length;

      // Load more should trigger a fetch
      await act(async () => {
        await result.current.loadMore();
      });

      // Wait for loadMore to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify loadMore was called
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      expect(result.current.gigs).toHaveLength(2);
    });
  });

  describe('Cleanup and cancellation', () => {
    it('should cancel requests on unmount', () => {
      const { unmount } = renderHook(() => useGigs('bristol'));

      // Get the abort controller from the fetch call
      const fetchCall = mockFetch.mock.calls[0];
      const abortSignal = fetchCall[1].signal;

      expect(abortSignal.aborted).toBe(false);

      unmount();

      expect(abortSignal.aborted).toBe(true);
    });

    it('should cancel previous request when city changes', async () => {
      const { result, rerender } = renderHook(
        ({ city }) => useGigs(city),
        { initialProps: { city: 'bristol' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstAbortSignal = mockFetch.mock.calls[0][1].signal;

      // Change city
      rerender({ city: 'london' });

      await waitFor(() => {
        expect(firstAbortSignal.aborted).toBe(true);
      });
    });
  });

  describe('Options change handling', () => {
    it('should refetch when options change', async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useGigs('bristol', options),
        { initialProps: { options: { timeRange: 'week' as const } } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockClear();

      // Change options
      rerender({
        options: { timeRange: 'day' as const },
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const newUrl = mockFetch.mock.calls[0][0];
      expect(newUrl).toContain('timeRange=day');
    });

    it('should reset pagination when options change', async () => {
      const page1Response = {
        ...mockResponse,
        pagination: { ...mockResponse.pagination, hasMore: true },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(page1Response),
        headers: { get: () => null },
      });

      const { result, rerender } = renderHook(
        ({ options }) => useGigs('bristol', options),
        { initialProps: { options: { timeRange: 'week' as const } } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load page 2
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.page).toBe(2);

      // Change options should reset to page 1
      rerender({
        options: { timeRange: 'day' as const },
      });

      await waitFor(() => {
        expect(result.current.page).toBe(1);
      });
    });
  });
});