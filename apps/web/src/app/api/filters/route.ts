import { NextRequest } from 'next/server';
import { withRateLimit } from '../../../lib/rate-limiter';
import { getWebDatabaseService, isDatabaseEnabled } from '../../../lib/database';
import { getAllGigs } from '../../../lib/catalog';
import { ErrorResponse } from '../../../types/api';

async function handleFiltersRequest(request: NextRequest): Promise<Response> {
  try {
    let filterOptions;
    
    if (isDatabaseEnabled()) {
      // Use database to get filter options efficiently
      const dbService = getWebDatabaseService();
      filterOptions = await dbService.getFilterOptions();
    } else {
      // Fallback to catalog-based filtering
      const allGigs = await getAllGigs();
      
      // Extract unique filter values from all gigs
      const cities = [...new Set(allGigs.map(gig => gig.venue.city).filter(Boolean))].sort();
      const tags = [...new Set(allGigs.flatMap(gig => gig.tags || (gig as any).genre || []).filter(Boolean))].sort();
      const venues = [...new Set(allGigs.map(gig => gig.venue.name).filter(Boolean))].sort();
      const sources = [...new Set(allGigs.map(gig => gig.source).filter(Boolean))].sort();
      
      filterOptions = {
        cities,
        tags,
        venues,
        sources
      };
    }
    
    const response = {
      data: filterOptions
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour (filter options change infrequently)
      }
    });
    
  } catch (error) {
    console.error('Error in /api/filters:', error);
    
    let errorResponse: ErrorResponse;
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Catalog file not found')) {
        errorResponse = {
          error: 'Data not available',
          code: 'DATA_NOT_FOUND'
        };
        statusCode = 503;
      } else if (error.message.includes('Database')) {
        errorResponse = {
          error: 'Database connection error',
          code: 'DATABASE_ERROR'
        };
        statusCode = 503;
      } else {
        errorResponse = {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        };
      }
    } else {
      errorResponse = {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      };
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(handleFiltersRequest);