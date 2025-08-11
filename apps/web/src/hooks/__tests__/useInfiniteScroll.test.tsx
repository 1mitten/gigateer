import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';
import { APP_CONFIG } from '../../config/app.config';

// Mock fetch globally
global.fetch = vi.fn();

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockGigsResponse = (page: number, sortOrder: 'asc' | 'desc' = 'asc') => {
    const gigs = sortOrder === 'asc' 
      ? [
          { id: `${page}-1`, title: 'Early Event', dateStart: '2025-01-01T19:00:00.000Z', venue: { name: 'Venue A' } },
          { id: `${page}-2`, title: 'Mid Event', dateStart: '2025-06-01T19:00:00.000Z', venue: { name: 'Venue B' } }
        ]
      : [
          { id: `${page}-1`, title: 'Late Event', dateStart: '2026-12-01T19:00:00.000Z', venue: { name: 'Venue A' } },
          { id: `${page}-2`, title: 'Recent Event', dateStart: '2026-06-01T19:00:00.000Z', venue: { name: 'Venue B' } }
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
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1)
      });

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
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
      const callUrl = vi.mocked(global.fetch).mock.calls[0][0];
      expect(callUrl).toContain('sortBy=date');
      expect(callUrl).toContain('sortOrder=asc');
      expect(callUrl).toContain('page=1');

      // Should have gigs from first page
      expect(result.current.gigs).toHaveLength(2);
      expect(result.current.gigs[0].title).toBe('Early Event');
    });

    it('should not load when disabled', async () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: false 
        })
      );

      // The key assertion for disabled hooks is that no fetch should be called
      expect(result.current.gigs).toEqual([]);

      // Wait to ensure no fetch is called
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not have called fetch - this is the main assertion for disabled queries
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.gigs).toEqual([]);
    });
  });

  describe('Sorting', () => {
    it('should reload with new data when sort order changes', async () => {
      // Initial load with ASC
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result, rerender } = renderHook(
        ({ apiParams }) => useInfiniteScroll({ apiParams, enabled: true }),
        {
          initialProps: {
            apiParams: { sortBy: 'date', sortOrder: 'asc' }
          }
        }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.gigs[0].title).toBe('Early Event');

      // Change to DESC
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'desc')
      });

      rerender({
        apiParams: { sortBy: 'date', sortOrder: 'desc' }
      });

      // Should be loading new data
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Wait for new data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have called fetch again with new params
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const secondCallUrl = vi.mocked(global.fetch).mock.calls[1][0];
      expect(secondCallUrl).toContain('sortOrder=desc');

      // Should have new data
      expect(result.current.gigs[0].title).toBe('Late Event');
    });

    it('should clear old data immediately when sort changes', async () => {
      // Initial load
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1, 'asc')
      });

      const { result, rerender } = renderHook(
        ({ apiParams }) => useInfiniteScroll({ apiParams, enabled: true }),
        {
          initialProps: {
            apiParams: { sortBy: 'date', sortOrder: 'asc' }
          }
        }
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      // Mock delayed response
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockGigsResponse(1, 'desc')
            });
          }, 100);
        })
      );

      // Change sort
      rerender({
        apiParams: { sortBy: 'date', sortOrder: 'desc' }
      });

      // Should immediately clear old data
      expect(result.current.gigs).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Pagination', () => {
    it('should load next page and append to existing data', async () => {
      // First page
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1)
      });

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      // Load next page
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(2)
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(4);
      });

      // Should have data from both pages
      expect(result.current.gigs[0].id).toBe('1-1');
      expect(result.current.gigs[2].id).toBe('2-1');
    });

    it('should not fetch next page if already loading', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockGigsResponse(1)
            });
          }, 100);
        })
      );

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
      );

      // Try to fetch next page while loading
      act(() => {
        result.current.fetchNextPage();
      });

      // Should only have called fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' })
      });

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.gigs).toEqual([]);
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Refresh', () => {
    it('should reload from first page when refresh is called', async () => {
      // Initial load
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1)
      });

      const { result } = renderHook(() => 
        useInfiniteScroll({ 
          apiParams: { sortBy: 'date', sortOrder: 'asc' }, 
          enabled: true 
        })
      );

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(2);
      });

      // Load page 2
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(2)
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.gigs).toHaveLength(4);
      });

      // Refresh
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGigsResponse(1)
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
      });

      // Should only have first page data
      expect(result.current.gigs).toHaveLength(2);
    });
  });
});