import { NextRequest, NextResponse } from 'next/server';
import { warmCacheForPopularCities } from '@/lib/cache';
import { getGigsForCity } from '@/lib/data';

// Popular cities to warm cache for
const POPULAR_CITIES = [
  'bristol',
  'london',
  'manchester',
];

/**
 * POST /api/cache/warm
 * Warm cache for popular cities
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body for custom cities
    let cities = POPULAR_CITIES;
    try {
      const body = await request.json();
      if (body.cities) {
        if (!Array.isArray(body.cities)) {
          return NextResponse.json(
            { error: 'Invalid cities parameter' },
            { status: 400 }
          );
        }
        if (body.cities.length > 10) {
          return NextResponse.json(
            { error: 'Too many cities (max 10)' },
            { status: 400 }
          );
        }
        cities = body.cities;
      }
    } catch {
      // Use default cities if no body provided
    }

    // Wrapper function to match expected type signature
    const wrappedFetcher = async (city: string) => {
      const gigs = await getGigsForCity(city);
      return {
        data: gigs,
        totalCount: gigs.length,
        hasMore: false, // We return all gigs for the city
      };
    };

    // Start warming cache in the background
    const warmingPromise = warmCacheForPopularCities(cities, wrappedFetcher);

    // Don't wait for warming to complete
    warmingPromise.catch(error => {
      console.error('Cache warming failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Cache warming initiated',
      cities,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    return NextResponse.json(
      { error: 'Failed to warm cache' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}