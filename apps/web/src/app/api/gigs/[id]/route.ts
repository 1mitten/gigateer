import { NextRequest } from 'next/server';
import { withRateLimit } from '../../../../lib/rate-limiter';
import { getGigById } from '../../../../lib/catalog';
import { ErrorResponse } from '../../../../types/api';

async function handleGigDetailRequest(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;
    
    // Validate that ID is provided and not empty
    if (!id || typeof id !== 'string' || id.trim() === '') {
      const errorResponse: ErrorResponse = {
        error: 'Invalid gig ID',
        code: 'INVALID_GIG_ID'
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the specific gig
    const gig = await getGigById(id.trim());
    
    if (!gig) {
      const errorResponse: ErrorResponse = {
        error: 'Gig not found',
        code: 'GIG_NOT_FOUND'
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Prepare response
    const response = {
      data: gig
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600' // Cache for 10 minutes (individual gigs change less frequently)
      }
    });
    
  } catch (error) {
    console.error('Error in /api/gigs/[id]:', error);
    
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
export const GET = withRateLimit(handleGigDetailRequest);