import { NextRequest } from 'next/server';
import { withRateLimit } from '../../../lib/rate-limiter';
import { getCatalogMeta } from '../../../lib/catalog';
import { ErrorResponse } from '../../../types/api';

async function handleMetaRequest(request: NextRequest): Promise<Response> {
  try {
    // Get catalog metadata and statistics
    const meta = await getCatalogMeta();
    
    // Prepare response
    const response = {
      data: meta
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Error in /api/meta:', error);
    
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
export const GET = withRateLimit(handleMetaRequest);