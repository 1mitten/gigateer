import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGigsInfiniteQuery } from '../useGigsInfiniteQuery';

// Mock fetch globally
global.fetch = jest.fn();

// Create a wrapper component for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        gcTime: 0, // Disable caching for tests
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useGigsInfiniteQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockGigsResponse = (page: number, sortOrder: 'asc' | 'desc' = 'asc') => {
    const gigs = sortOrder === 'asc' 
      ? [
          { 
            id: `${page}-1`, 
            title: `Early Event Page ${page}`, 
            dateStart: '2025-01-01T19:00:00.000Z', 
            venue: { name: 'Venue A', city: 'Bristol', country: 'UK' },
            artist: 'Artist A',
            tags: ['rock'],
            urls: { event: 'http://example.com' }
          },
          { 
            id: `${page}-2`, 
            title: `Mid Event Page ${page}`, 
            dateStart: '2025-06-01T19:00:00.000Z', 
            venue: { name: 'Venue B', city: 'London', country: 'UK' },
            artist: 'Artist B',
            tags: ['jazz'],
            urls: { event: 'http://example.com' }
          }
        ]
      : [
          { 
            id: `${page}-1`, 
            title: `Late Event Page ${page}`, 
            dateStart: '2026-12-01T19:00:00.000Z', 
            venue: { name: 'Venue A', city: 'Bristol', country: 'UK' },
            artist: 'Artist C',
            tags: ['electronic'],
            urls: { event: 'http://example.com' }
          },
          { 
            id: `${page}-2`, 
            title: `Recent Event Page ${page}`, 
            dateStart: '2026-06-01T19:00:00.000Z', 
            venue: { name: 'Venue B', city: 'London', country: 'UK' },
            artist: 'Artist D',
            tags: ['pop'],
            urls: { event: 'http://example.com' }
          }
        ];

    return {
      data: gigs,
      pagination: {
        page,
        limit: 20,
        total: 100,
        pages: 5
      },
      meta: {
        query: null,
        filters: {},
        sort: {
          sortBy: 'date',
          sortOrder
        }
      }
    };
  };

  describe('Initial Load', () => {
    it('should load first page on mount when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      // Initially should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.gigs).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have loaded first page
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gigs?'),
        expect.any(Object)
      );
      
      // Check URL parameters
      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('sortBy=date');
      expect(callUrl).toContain('sortOrder=asc');
      expect(callUrl).toContain('page=1');

      // Should have gigs from first page
      expect(result.current.gigs).toHaveLength(2);
      expect(result.current.gigs[0].title).toBe('Early Event Page 1');
      expect(result.current.totalCount).toBe(100);
    });

    it('should not load when disabled', async () => {
      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc', enabled: false }),
        { wrapper: createWrapper() }
      );

      // Should not be loading
      expect(result.current.loading).toBe(false);
      expect(result.current.gigs).toEqual([]);

      // Wait a bit to ensure no fetch is called
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have called fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('should reload with new data when sort order changes', async () => {
      // Initial load with ASC
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result, rerender } = renderHook(
        ({ sortOrder }) => useGigsInfiniteQuery({ sortBy: 'date', sortOrder }),
        {
          wrapper: createWrapper(),
          initialProps: { sortOrder: 'asc' as const }
        }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.gigs[0].title).toBe('Early Event Page 1');

      // Change to DESC
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'desc')
      });

      rerender({ sortOrder: 'desc' });

      // Wait for new data
      await waitFor(() => {
        expect(result.current.gigs[0].title).toBe('Late Event Page 1');
      });

      // Should have called fetch again with new params
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const secondCallUrl = (global.fetch as jest.Mock).mock.calls[1][0];
      expect(secondCallUrl).toContain('sortOrder=desc');
    });

    it('should show loading state when parameters change', async () => {
      // Initial load
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result, rerender } = renderHook(
        ({ sortBy }) => useGigsInfiniteQuery({ sortBy, sortOrder: 'asc' }),
        {
          wrapper: createWrapper(),
          initialProps: { sortBy: 'date' as const }
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock delayed response
      let resolvePromise: (value: any) => void;
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => {
          resolvePromise = resolve;
        })
      );

      // Change sort
      rerender({ sortBy: 'name' });

      // Should show loading state
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Pagination', () => {
    it('should load next page and append to existing data', async () => {
      // First page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      expect(result.current.hasNextPage).toBe(true);

      // Load next page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(2, 'asc')
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(4);
      });

      // Should have data from both pages
      expect(result.current.gigs[0].title).toBe('Early Event Page 1');
      expect(result.current.gigs[2].title).toBe('Early Event Page 2');
      
      // Check that page 2 was requested
      const secondCallUrl = (global.fetch as jest.Mock).mock.calls[1][0];
      expect(secondCallUrl).toContain('page=2');
    });

    it('should not fetch next page if already fetching', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockGigsResponse(1, 'asc')
            });
          }, 100);
        })
      );

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      // Mock slow response for next page
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockGigsResponse(2, 'asc')
            });
          }, 1000);
        })
      );

      // Try to fetch next page twice
      act(() => {
        result.current.fetchNextPage();
        result.current.fetchNextPage();
      });

      // Should only have called fetch once more (total 2 times)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should track isFetchingNextPage state', async () => {
      // First page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      expect(result.current.isFetchingNextPage).toBe(false);

      // Mock delayed response
      let resolvePromise: (value: any) => void;
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => {
          resolvePromise = resolve;
        })
      );

      act(() => {
        result.current.fetchNextPage();
      });

      // Should be fetching next page
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(true);
      });

      // Resolve
      resolvePromise!({
        ok: true,
        json: async () => mockGigsResponse(2, 'asc')
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' })
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Server error');
      expect(result.current.gigs).toEqual([]);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('Filtering', () => {
    it('should apply filters correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ 
          sortBy: 'date', 
          sortOrder: 'asc',
          city: 'Bristol',
          tags: 'rock',
          q: 'concert'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check that filters were included in the URL
      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('city=Bristol');
      expect(callUrl).toContain('tags=rock');
      expect(callUrl).toContain('q=concert');
    });
  });

  describe('Refresh', () => {
    it('should refetch data when refresh is called', async () => {
      // Initial load
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result } = renderHook(
        () => useGigsInfiniteQuery({ sortBy: 'date', sortOrder: 'asc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      // Refresh with new data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockGigsResponse(1, 'asc'),
          data: [
            { 
              id: 'new-1', 
              title: 'Refreshed Event', 
              dateStart: '2025-03-01T19:00:00.000Z', 
              venue: { name: 'Venue C', city: 'Manchester', country: 'UK' },
              artist: 'Artist E',
              tags: ['indie'],
              urls: { event: 'http://example.com' }
            }
          ]
        })
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.gigs[0].title).toBe('Refreshed Event');
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});