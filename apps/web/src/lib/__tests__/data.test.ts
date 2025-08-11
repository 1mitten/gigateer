import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGigsForCity, getUpcomingGigsForCity } from '../data';
import { Gig } from '@gigateer/contracts';

// Mock dependencies
vi.mock('../catalog', () => ({
  getAllGigs: vi.fn(),
  filterGigs: vi.fn(),
}));

vi.mock('../database', () => ({
  isDatabaseEnabled: vi.fn(),
  getWebDatabaseService: vi.fn(),
}));

describe('Data Layer', () => {
  const mockGig: Gig = {
    id: 'test-1',
    source: 'test',
    title: 'Test Event',
    artists: ['Artist 1'],
    tags: ['rock'],
    dateStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    venue: {
      name: 'Test Venue',
      city: 'Bristol',
    },
    status: 'scheduled',
    images: [],
    updatedAt: new Date().toISOString(),
    hash: 'test-hash',
  };

  const bristolGig: Gig = {
    ...mockGig,
    id: 'bristol-1',
    venue: { name: 'Bristol Venue', city: 'Bristol' },
  };

  const londonGig: Gig = {
    ...mockGig,
    id: 'london-1',
    venue: { name: 'London Venue', city: 'London' },
  };

  const pastGig: Gig = {
    ...mockGig,
    id: 'past-1',
    dateStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  };

  const futureGig: Gig = {
    ...bristolGig,
    id: 'future-1',
    dateStart: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGigsForCity', () => {
    it('should use database when enabled', async () => {
      const { isDatabaseEnabled, getWebDatabaseService } = await import('../database');
      const mockDbService = {
        getGigs: vi.fn().mockResolvedValue({
          gigs: [mockGig],
          pagination: { total: 1 },
        }),
      };

      (isDatabaseEnabled as any).mockReturnValue(true);
      (getWebDatabaseService as any).mockReturnValue(mockDbService);

      const result = await getGigsForCity('bristol');

      expect(mockDbService.getGigs).toHaveBeenCalledWith({
        filters: {
          city: 'bristol',
          showPastEvents: false,
        },
        sort: {
          field: 'dateStart',
          order: 1,
        },
      });
      expect(result).toEqual([mockGig]);
    });

    it('should fallback to file-based catalog when database disabled', async () => {
      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue([bristolGig, londonGig, pastGig, futureGig]);
      (filterGigs as any).mockImplementation((gigs, filters) => {
        return gigs.filter(g => {
          // Filter by city (case insensitive)
          if (filters.city && g.venue.city.toLowerCase() !== filters.city.toLowerCase()) return false;
          // Filter out past events if showPastEvents is false
          if (!filters.showPastEvents) {
            return new Date(g.dateStart) >= new Date();
          }
          return true;
        });
      });

      const result = await getGigsForCity('bristol');

      expect(getAllGigs).toHaveBeenCalled();
      expect(filterGigs).toHaveBeenCalledWith(
        [bristolGig, londonGig, pastGig, futureGig],
        { city: 'bristol', showPastEvents: false }
      );
      expect(result).toHaveLength(2); // Only future events for Bristol
      expect(result.map(g => g.id)).toEqual(['bristol-1', 'future-1']);
    });

    it('should handle database errors gracefully', async () => {
      const { isDatabaseEnabled, getWebDatabaseService } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      const mockDbService = {
        getGigs: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      };

      (isDatabaseEnabled as any).mockReturnValue(true);
      (getWebDatabaseService as any).mockReturnValue(mockDbService);
      (getAllGigs as any).mockResolvedValue([mockGig]);
      (filterGigs as any).mockReturnValue([mockGig]);

      // Should not throw, but log error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(getGigsForCity('bristol')).rejects.toThrow('DB connection failed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching gigs for city bristol:'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should filter by city correctly', async () => {
      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue([bristolGig, londonGig]);
      (filterGigs as any).mockImplementation((gigs, filters) => {
        return gigs.filter(g => {
          // Filter by city (case insensitive)
          if (filters.city && g.venue.city.toLowerCase() !== filters.city.toLowerCase()) return false;
          // Filter out past events if showPastEvents is false
          if (!filters.showPastEvents) {
            return new Date(g.dateStart) >= new Date();
          }
          return true;
        });
      });

      const result = await getGigsForCity('bristol');

      expect(result).toHaveLength(1);
      expect(result[0].venue.city).toBe('Bristol');
    });

    it('should sort by date ascending', async () => {
      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      const gig1 = { ...mockGig, id: '1', dateStart: '2024-12-25T20:00:00Z' };
      const gig2 = { ...mockGig, id: '2', dateStart: '2024-12-24T20:00:00Z' };
      const gig3 = { ...mockGig, id: '3', dateStart: '2024-12-26T20:00:00Z' };

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue([gig1, gig2, gig3]);
      (filterGigs as any).mockReturnValue([gig1, gig2, gig3]);

      const result = await getGigsForCity('bristol');

      expect(result.map(g => g.id)).toEqual(['2', '1', '3']);
    });
  });

  describe('getUpcomingGigsForCity', () => {
    it('should return only events within specified timeframe', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const gigs = [
        { ...mockGig, id: '1', dateStart: tomorrow.toISOString() },
        { ...mockGig, id: '2', dateStart: nextWeek.toISOString() },
        { ...mockGig, id: '3', dateStart: nextMonth.toISOString() },
      ];

      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue(gigs);
      (filterGigs as any).mockReturnValue(gigs);

      // Get events for next 10 days
      const result = await getUpcomingGigsForCity('bristol', 10);

      expect(result).toHaveLength(2); // Tomorrow and next week
      expect(result.map(g => g.id)).toEqual(['1', '2']);
    });

    it('should use default 7 days if not specified', async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const gigs = [
        { ...mockGig, id: '1', dateStart: in3Days.toISOString() },
        { ...mockGig, id: '2', dateStart: in10Days.toISOString() },
      ];

      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue(gigs);
      (filterGigs as any).mockReturnValue(gigs);

      const result = await getUpcomingGigsForCity('bristol');

      expect(result).toHaveLength(1); // Only within 7 days
      expect(result[0].id).toBe('1');
    });

    it('should exclude past events', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const gigs = [
        { ...mockGig, id: 'past', dateStart: yesterday.toISOString() },
        { ...mockGig, id: 'future', dateStart: tomorrow.toISOString() },
      ];

      const { isDatabaseEnabled } = await import('../database');
      const { getAllGigs, filterGigs } = await import('../catalog');

      (isDatabaseEnabled as any).mockReturnValue(false);
      (getAllGigs as any).mockResolvedValue(gigs);
      (filterGigs as any).mockReturnValue(gigs);

      const result = await getUpcomingGigsForCity('bristol', 7);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('future');
    });
  });
});