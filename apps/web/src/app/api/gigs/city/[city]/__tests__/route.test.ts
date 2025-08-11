import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { Gig } from '@gigateer/contracts';

// Mock dependencies
vi.mock('@/lib/cache', () => ({
  getCachedGigs: vi.fn(),
  invalidateCache: vi.fn(),
  TIME_RANGES: {
    day: { hours: 24, label: 'Today' },
    week: { hours: 168, label: 'This Week' },
    month: { hours: 720, label: 'This Month' },
  },
}));

vi.mock('@/lib/data', () => ({
  getGigsForCity: vi.fn(),
}));

describe('GET /api/gigs/city/[city]', () => {
  const mockGig: Gig = {
    id: 'test-1',
    source: 'test',
    title: 'Test Event',
    artists: ['Artist 1'],
    tags: ['rock', 'live'],
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated gigs with default parameters', async () => {
    const { getCachedGigs } = await import('@/lib/cache');
    
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'miss' };
    });

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue([mockGig]);

    const request = new NextRequest('http://localhost/api/gigs/city/bristol');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('meta');
    expect(data.data).toEqual([mockGig]);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(50);
    expect(data.meta.city).toBe('bristol');
    expect(data.meta.cacheHit).toBe('miss');
  });

  it('should handle pagination parameters', async () => {
    const gigs = Array.from({ length: 150 }, (_, i) => ({
      ...mockGig,
      id: `test-${i}`,
      title: `Event ${i}`,
    }));

    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'hot' };
    });

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue(gigs);

    const request = new NextRequest('http://localhost/api/gigs/city/bristol?page=2&limit=10');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(data.data).toHaveLength(10);
    expect(data.data[0].id).toBe('test-10'); // Second page starts at index 10
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.totalCount).toBe(150);
    expect(data.pagination.totalPages).toBe(15);
    expect(data.pagination.hasMore).toBe(true);
  });

  it('should filter by time range', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    const gigs = [
      { ...mockGig, id: '1', dateStart: tomorrow.toISOString() },
      { ...mockGig, id: '2', dateStart: nextWeek.toISOString() },
    ];

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue(gigs);

    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'warm' };
    });

    const request = new NextRequest('http://localhost/api/gigs/city/bristol?timeRange=day');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    // The fetcher should filter to only tomorrow's event
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe('1');
    expect(data.meta.timeRange).toBe('day');
  });

  it('should sort by different fields', async () => {
    const gigs = [
      { ...mockGig, id: '1', title: 'B Event', venue: { ...mockGig.venue, name: 'A Venue' } },
      { ...mockGig, id: '2', title: 'A Event', venue: { ...mockGig.venue, name: 'B Venue' } },
      { ...mockGig, id: '3', title: 'C Event', venue: { ...mockGig.venue, name: 'C Venue' } },
    ];

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue(gigs);

    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'hot' };
    });

    // Test sorting by name
    const nameRequest = new NextRequest('http://localhost/api/gigs/city/bristol?sortBy=name');
    const nameResponse = await GET(nameRequest, { params: { city: 'bristol' } });
    const nameData = await nameResponse.json();

    expect(nameData.data.map((g: any) => g.id)).toEqual(['2', '1', '3']);

    // Test sorting by venue
    const venueRequest = new NextRequest('http://localhost/api/gigs/city/bristol?sortBy=venue');
    const venueResponse = await GET(venueRequest, { params: { city: 'bristol' } });
    const venueData = await venueResponse.json();

    expect(venueData.data.map((g: any) => g.id)).toEqual(['1', '2', '3']);
  });

  it('should filter by genre (tags)', async () => {
    const gigs = [
      { ...mockGig, id: '1', tags: ['rock'] },
      { ...mockGig, id: '2', tags: ['pop'] },
      { ...mockGig, id: '3', tags: ['rock', 'pop'] },
    ];

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue(gigs);

    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'hot' };
    });

    const request = new NextRequest('http://localhost/api/gigs/city/bristol?genre=rock');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    expect(data.data.map((g: any) => g.id)).toEqual(['1', '3']);
  });

  it('should filter by venue', async () => {
    const gigs = [
      { ...mockGig, id: '1', venue: { ...mockGig.venue, name: 'Venue A' } },
      { ...mockGig, id: '2', venue: { ...mockGig.venue, name: 'Venue B' } },
      { ...mockGig, id: '3', venue: { ...mockGig.venue, name: 'Venue A' } },
    ];

    const { getGigsForCity } = await import('@/lib/data');
    (getGigsForCity as any).mockResolvedValue(gigs);

    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockImplementation(async (city, options, fetcher) => {
      const result = await fetcher();
      return { ...result, cacheHit: 'hot' };
    });

    const request = new NextRequest('http://localhost/api/gigs/city/bristol?venue=Venue%20A');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    expect(data.data.map((g: any) => g.id)).toEqual(['1', '3']);
  });

  it('should set appropriate cache headers based on cache hit', async () => {
    const { getCachedGigs } = await import('@/lib/cache');
    const { getGigsForCity } = await import('@/lib/data');
    
    (getGigsForCity as any).mockResolvedValue([mockGig]);

    // Test hot cache
    (getCachedGigs as any).mockResolvedValueOnce({
      data: [mockGig],
      totalCount: 1,
      hasMore: false,
      cacheHit: 'hot',
    });

    const hotRequest = new NextRequest('http://localhost/api/gigs/city/bristol');
    const hotResponse = await GET(hotRequest, { params: { city: 'bristol' } });

    expect(hotResponse.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
    );
    expect(hotResponse.headers.get('X-Cache-Hit')).toBe('hot');

    // Test warm cache
    (getCachedGigs as any).mockResolvedValueOnce({
      data: [mockGig],
      totalCount: 1,
      hasMore: false,
      cacheHit: 'warm',
    });

    const warmRequest = new NextRequest('http://localhost/api/gigs/city/bristol');
    const warmResponse = await GET(warmRequest, { params: { city: 'bristol' } });

    expect(warmResponse.headers.get('Cache-Control')).toBe(
      'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600'
    );
    expect(warmResponse.headers.get('X-Cache-Hit')).toBe('warm');

    // Test cache miss
    (getCachedGigs as any).mockResolvedValueOnce({
      data: [mockGig],
      totalCount: 1,
      hasMore: false,
      cacheHit: 'miss',
    });

    const missRequest = new NextRequest('http://localhost/api/gigs/city/bristol');
    const missResponse = await GET(missRequest, { params: { city: 'bristol' } });

    expect(missResponse.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200'
    );
    expect(missResponse.headers.get('X-Cache-Hit')).toBe('miss');
  });

  it('should handle invalid time range', async () => {
    const request = new NextRequest('http://localhost/api/gigs/city/bristol?timeRange=invalid');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid time range');
  });

  it('should handle errors gracefully', async () => {
    const { getCachedGigs } = await import('@/lib/cache');
    (getCachedGigs as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/gigs/city/bristol');
    const response = await GET(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch gigs');
  });
});

describe('POST /api/gigs/city/[city]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WEBHOOK_SECRET;
  });

  it('should invalidate cache for a city', async () => {
    const { invalidateCache } = await import('@/lib/cache');

    const request = new NextRequest('http://localhost/api/gigs/city/bristol', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Cache invalidated for bristol');
    expect(invalidateCache).toHaveBeenCalledWith('bristol', { partial: false });
  });

  it('should support partial cache invalidation', async () => {
    const { invalidateCache } = await import('@/lib/cache');

    const request = new NextRequest('http://localhost/api/gigs/city/bristol', {
      method: 'POST',
      body: JSON.stringify({ partial: true }),
    });

    const response = await POST(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(data.partial).toBe(true);
    expect(invalidateCache).toHaveBeenCalledWith('bristol', { partial: true });
  });

  it('should verify webhook secret when configured', async () => {
    process.env.WEBHOOK_SECRET = 'test-secret';

    const request = new NextRequest('http://localhost/api/gigs/city/bristol', {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': 'wrong-secret',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should accept valid webhook secret', async () => {
    process.env.WEBHOOK_SECRET = 'test-secret';
    const { invalidateCache } = await import('@/lib/cache');

    const request = new NextRequest('http://localhost/api/gigs/city/bristol', {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': 'test-secret',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: { city: 'bristol' } });

    expect(response.status).toBe(200);
    expect(invalidateCache).toHaveBeenCalled();
  });

  it('should handle errors during invalidation', async () => {
    const { invalidateCache } = await import('@/lib/cache');
    (invalidateCache as any).mockImplementation(() => {
      throw new Error('Cache error');
    });

    const request = new NextRequest('http://localhost/api/gigs/city/bristol', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: { city: 'bristol' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to invalidate cache');
  });
});