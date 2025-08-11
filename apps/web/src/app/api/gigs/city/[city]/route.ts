import { NextRequest, NextResponse } from 'next/server';
import { getCachedGigs, QueryOptions, TIME_RANGES, TimeRange, invalidateCache } from '@/lib/cache';
import { getGigsForCity } from '@/lib/data';

// Set revalidation time for ISR (5 minutes for hot data)
export const revalidate = 300;

// Enable dynamic rendering for query parameters
export const dynamic = 'force-dynamic';

/**
 * GET /api/gigs/[city]
 * Fetch paginated gigs for a city with tiered caching
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const timeRange = (searchParams.get('timeRange') || 'week') as TimeRange;
    const sortBy = (searchParams.get('sortBy') || 'date') as QueryOptions['sortBy'];
    
    // Parse filters if provided
    const filters: QueryOptions['filters'] = {};
    const genre = searchParams.get('genre');
    const venue = searchParams.get('venue');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    
    if (genre) filters.genre = genre.split(',');
    if (venue) filters.venue = venue.split(',');
    if (minPrice && maxPrice) {
      filters.priceRange = [parseFloat(minPrice), parseFloat(maxPrice)];
    }

    // Validate time range
    if (!TIME_RANGES[timeRange]) {
      return NextResponse.json(
        { error: 'Invalid time range' },
        { status: 400 }
      );
    }

    // Build query options
    const options: QueryOptions = {
      page,
      limit,
      timeRange,
      sortBy,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };

    // Get cached or fresh data
    const result = await getCachedGigs(
      params.city,
      options,
      async () => {
        // Fetcher function - this is only called on cache miss
        const skip = (page - 1) * limit;
        const timeRangeHours = TIME_RANGES[timeRange].hours;
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + timeRangeHours);

        // Get data from your data source
        const allGigs = await getGigsForCity(params.city);
        
        // Filter by time range
        const now = new Date();
        const filteredGigs = allGigs.filter(gig => {
          const gigDate = new Date(gig.dateStart);
          return gigDate >= now && gigDate <= endDate;
        });

        // Apply additional filters
        let processedGigs = filteredGigs;
        
        if (filters.genre && filters.genre.length > 0) {
          processedGigs = processedGigs.filter(gig => 
            gig.tags?.some(g => filters.genre?.includes(g))
          );
        }
        
        if (filters.venue && filters.venue.length > 0) {
          processedGigs = processedGigs.filter(gig => 
            filters.venue?.includes(gig.venue.name)
          );
        }
        
        if (filters.priceRange) {
          // Price filtering not supported in current schema
          // Skip price filtering for now
          console.log('Price filtering not implemented - gig schema lacks price data');
        }

        // Sort
        switch (sortBy) {
          case 'name':
            processedGigs.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'venue':
            processedGigs.sort((a, b) => a.venue.name.localeCompare(b.venue.name));
            break;
          case 'date':
          default:
            processedGigs.sort((a, b) => 
              new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
            );
        }

        // Paginate
        const paginatedGigs = processedGigs.slice(skip, skip + limit);
        const totalCount = processedGigs.length;
        const hasMore = skip + limit < totalCount;

        return {
          data: paginatedGigs,
          totalCount,
          hasMore,
        };
      }
    );

    // Prepare response headers for optimal caching
    const headers = new Headers();
    
    // Cache control for CDN and browser
    if (result.cacheHit === 'hot') {
      // Hot data - cache for 5 minutes
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    } else if (result.cacheHit === 'warm') {
      // Warm data - cache for 30 minutes
      headers.set('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600');
    } else {
      // Cold data - cache for 1 hour
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200');
    }
    
    // Add metadata headers
    headers.set('X-Total-Count', result.totalCount.toString());
    headers.set('X-Has-More', result.hasMore.toString());
    headers.set('X-Page', page.toString());
    headers.set('X-Limit', limit.toString());
    headers.set('X-Cache-Hit', result.cacheHit);
    
    // Enable CORS if needed
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Has-More, X-Page, X-Limit, X-Cache-Hit');

    return NextResponse.json(
      {
        data: result.data,
        pagination: {
          page,
          limit,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / limit),
          hasMore: result.hasMore,
        },
        meta: {
          city: params.city,
          timeRange,
          sortBy,
          filters,
          cacheHit: result.cacheHit,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching gigs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gigs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gigs/[city]
 * Invalidate cache for a city (webhook endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  try {
    // Verify webhook secret if configured
    const secret = request.headers.get('X-Webhook-Secret');
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse invalidation options
    const body = await request.json();
    const { partial = false } = body;

    // Invalidate cache
    invalidateCache(params.city, { partial });

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for ${params.city}`,
      partial,
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}