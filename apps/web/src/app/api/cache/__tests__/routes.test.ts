import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/cache', () => ({
  getCacheStatistics: vi.fn(() => ({
    hits: { hot: 10, warm: 5 },
    misses: 3,
    evictions: { hot: 1, warm: 0 },
    sizes: { hot: 5, warm: 10 },
    memory: { hot: 1024, warm: 2048 },
  })),
  getCacheStats: vi.fn(() => ({
    hits: { hot: 10, warm: 5 },
    misses: 3,
    evictions: { hot: 1, warm: 0 },
    sizes: { hot: 5, warm: 10 },
    memory: { hot: 1024, warm: 2048 },
  })),
  warmCache: vi.fn().mockResolvedValue(undefined),
  warmCacheForPopularCities: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/data', () => ({
  getGigsForCity: vi.fn(),
}));

describe('GET /api/cache/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cache statistics', async () => {
    const { GET } = await import('../stats/route');
    
    const request = new NextRequest('http://localhost/api/cache/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      hits: {
        hot: 10,
        warm: 5,
        total: 15,
      },
      misses: 3,
      evictions: {
        hot: 1,
        warm: 0,
        total: 1,
      },
      hitRate: 15/18, // (10+5)/(10+5+3)
      totalRequests: 18,
    });
  });

  it('should set appropriate cache headers', async () => {
    const { GET } = await import('../stats/route');
    
    const request = new NextRequest('http://localhost/api/cache/stats');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate'
    );
  });

  it('should handle errors gracefully', async () => {
    const { getCacheStatistics } = await import('@/lib/cache');
    (getCacheStatistics as any).mockImplementation(() => {
      throw new Error('Stats error');
    });

    const { GET } = await import('../stats/route');
    const request = new NextRequest('http://localhost/api/cache/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch cache statistics');
  });
});

describe('POST /api/cache/warm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should warm cache for default cities', async () => {
    const { warmCacheForPopularCities } = await import('@/lib/cache');
    const { getGigsForCity } = await import('@/lib/data');
    
    const mockGig = {
      id: 'test-1',
      title: 'Test Event',
      venue: { city: 'Bristol' },
    };
    
    (getGigsForCity as any).mockResolvedValue([mockGig]);

    const { POST } = await import('../warm/route');
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Cache warming initiated');
    expect(data.cities).toEqual(['bristol', 'london', 'manchester']);
    expect(warmCacheForPopularCities).toHaveBeenCalledWith(
      ['bristol', 'london', 'manchester'],
      expect.any(Function)
    );
  });

  it('should warm cache for specified cities', async () => {
    const { warmCacheForPopularCities } = await import('@/lib/cache');
    const { getGigsForCity } = await import('@/lib/data');
    
    (getGigsForCity as any).mockResolvedValue([]);

    const { POST } = await import('../warm/route');
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({ cities: ['edinburgh', 'glasgow'] }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(data.cities).toEqual(['edinburgh', 'glasgow']);
    expect(warmCacheForPopularCities).toHaveBeenCalledWith(
      ['edinburgh', 'glasgow'],
      expect.any(Function)
    );
  });

  it('should validate cities array', async () => {
    const { POST } = await import('../warm/route');
    
    // Test invalid cities format
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({ cities: 'not-an-array' }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid cities parameter');
  });

  it('should limit number of cities', async () => {
    const { POST } = await import('../warm/route');
    
    const tooManyCities = Array.from({ length: 11 }, (_, i) => `city${i}`);
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({ cities: tooManyCities }),
    });
    
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Too many cities (max 10)');
  });

  it('should handle cache warming errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { warmCacheForPopularCities } = await import('@/lib/cache');
    (warmCacheForPopularCities as any).mockRejectedValue(new Error('Warming failed'));

    const { POST } = await import('../warm/route');
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(request);
    const data = await response.json();

    // The route returns 200 but logs the error in background
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Cache warming initiated');
    
    // Give it a moment for the promise to reject and log the error
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(consoleSpy).toHaveBeenCalledWith('Cache warming failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should set no-cache headers', async () => {
    const { warmCacheForPopularCities } = await import('@/lib/cache');
    const { getGigsForCity } = await import('@/lib/data');
    
    (getGigsForCity as any).mockResolvedValue([]);
    (warmCacheForPopularCities as any).mockResolvedValue(undefined);

    const { POST } = await import('../warm/route');
    const request = new NextRequest('http://localhost/api/cache/warm', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate'
    );
  });
});

describe('GET /api/cache/warm', () => {
  it('should return method not allowed for GET requests', async () => {
    const { GET } = await import('../warm/route');
    
    // If GET is not exported, this test should verify that
    expect(GET).toBeUndefined();
  });
});