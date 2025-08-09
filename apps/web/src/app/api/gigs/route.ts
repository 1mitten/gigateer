import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { withRateLimit } from '../../../lib/rate-limiter';
import { getAllGigs, filterGigs, paginateResults } from '../../../lib/catalog';
import { GigsQuerySchema, ErrorResponse } from '../../../types/api';

async function handleGigsRequest(request: NextRequest): Promise<Response> {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    let validatedQuery;
    try {
      validatedQuery = GigsQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse: ErrorResponse = {
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
          details: error.errors.reduce((acc, err) => {
            acc[err.path.join('.')] = err.message;
            return acc;
          }, {} as Record<string, string>)
        };
        
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }
    
    // Get all gigs from catalog
    const allGigs = await getAllGigs();
    
    // Apply filters
    const filteredGigs = filterGigs(allGigs, {
      city: validatedQuery.city,
      genre: validatedQuery.genre,
      dateFrom: validatedQuery.dateFrom,
      dateTo: validatedQuery.dateTo,
      venue: validatedQuery.venue,
      q: validatedQuery.q
    });
    
    // Sort by date (ascending, upcoming first)
    const sortedGigs = filteredGigs.sort((a, b) => 
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );
    
    // Apply pagination
    const paginatedResult = paginateResults(
      sortedGigs,
      validatedQuery.page,
      validatedQuery.limit
    );
    
    // Prepare response
    const response = {
      data: paginatedResult.data,
      pagination: paginatedResult.pagination,
      meta: {
        query: validatedQuery.q,
        filters: {
          city: validatedQuery.city,
          genre: validatedQuery.genre,
          dateFrom: validatedQuery.dateFrom,
          dateTo: validatedQuery.dateTo,
          venue: validatedQuery.venue
        }
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Error in /api/gigs:', error);
    
    let errorResponse: ErrorResponse;
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Catalog file not found')) {
        errorResponse = {
          error: 'Catalog data not available',
          code: 'CATALOG_NOT_FOUND'
        };
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('Invalid catalog')) {
        errorResponse = {
          error: 'Catalog data is corrupted',
          code: 'CATALOG_CORRUPTED'
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
export const GET = withRateLimit(handleGigsRequest);