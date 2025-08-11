import { NextRequest, NextResponse } from 'next/server';
import { getCacheStatistics } from '@/lib/cache';

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStatistics();
    
    const response = {
      hits: {
        hot: stats.hits.hot,
        warm: stats.hits.warm,
        total: stats.hits.hot + stats.hits.warm,
      },
      misses: stats.misses,
      evictions: {
        hot: stats.evictions.hot,
        warm: stats.evictions.warm,
        total: stats.evictions.hot + stats.evictions.warm,
      },
      hitRate: (stats.hits.hot + stats.hits.warm) / (stats.hits.hot + stats.hits.warm + stats.misses) || 0,
      totalRequests: stats.hits.hot + stats.hits.warm + stats.misses,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching cache statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}