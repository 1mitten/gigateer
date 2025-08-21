import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { withRateLimit } from '../../../lib/rate-limiter';
import { getAllGigs, filterGigs, paginateResults } from '../../../lib/catalog';
import { getWebDatabaseService, isDatabaseEnabled } from '../../../lib/database';
import { GigsQuerySchema, ErrorResponse } from '../../../types/api';

async function handleGigsRequest(request: NextRequest): Promise<Response> {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // TEMP DEBUG: Log what frontend is requesting
    if (queryParams.sortBy || queryParams.sortOrder) {
      console.log(`[FRONTEND REQUEST] ${new Date().toISOString()} - sortBy:${queryParams.sortBy} sortOrder:${queryParams.sortOrder} page:${queryParams.page} limit:${queryParams.limit}`);
    }
    
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
    
    let gigs;
    let paginatedResult;
    
    // Use database if enabled, otherwise fall back to file-based catalog
    if (isDatabaseEnabled()) {
      try {
        // Using database for gigs query
        const dbService = getWebDatabaseService();
        
        // Build filters for database query
        const filters: any = {};
        if (validatedQuery.city) filters.city = validatedQuery.city;
        if (validatedQuery.tags) filters.tags = validatedQuery.tags;
        if (validatedQuery.dateFrom) filters.dateFrom = new Date(validatedQuery.dateFrom);
        if (validatedQuery.dateTo) {
          const dateTo = new Date(validatedQuery.dateTo);
          // If it's just a date (no time), set to end of day
          if (!validatedQuery.dateTo.includes('T')) {
            dateTo.setHours(23, 59, 59, 999);
          }
          filters.dateTo = dateTo;
        }
        if (validatedQuery.venue) filters.venue = validatedQuery.venue;
        if (validatedQuery.q) filters.search = validatedQuery.q;
        // Show past events only if no date filters are applied (i.e., "All dates" is selected)
        filters.showPastEvents = !validatedQuery.dateFrom && !validatedQuery.dateTo;
        
        // Convert sort parameters
        const getSortField = (sortBy: string): 'dateStart' | 'updatedAt' | 'title' | 'createdAt' => {
          switch (sortBy) {
            case 'name': return 'title';
            case 'venue': return 'title'; // Fallback to title since venue.name sorting not supported
            case 'date':
            default: return 'dateStart';
          }
        };

        // Query database with pagination
        const result = await dbService.getGigs({
          filters,
          sort: { 
            field: getSortField(validatedQuery.sortBy), 
            order: validatedQuery.sortOrder === 'desc' ? -1 : 1 
          },
          pagination: {
            page: validatedQuery.page,
            limit: validatedQuery.limit
          }
        });
        
        paginatedResult = {
          data: result.gigs,
          pagination: result.pagination!
        };
        // Database query successful
      } catch (dbError) {
        console.error('Database query failed, falling back to file-based catalog:', dbError);
        
        // Fallback to file-based catalog on database error
        const allGigs = await getAllGigs();
        
        // Apply filters
        const filteredGigs = filterGigs(allGigs, {
          city: validatedQuery.city,
          tags: validatedQuery.tags,
          dateFrom: validatedQuery.dateFrom,
          dateTo: validatedQuery.dateTo,
          venue: validatedQuery.venue,
          q: validatedQuery.q,
          // Show past events only if no date filters are applied (i.e., "All dates" is selected)
          showPastEvents: !validatedQuery.dateFrom && !validatedQuery.dateTo
        });
        
        // Sort gigs based on query parameters
        const sortedGigs = filteredGigs.sort((a, b) => {
          let comparison = 0;
          
          switch (validatedQuery.sortBy) {
            case 'name':
              comparison = a.title.localeCompare(b.title);
              break;
            case 'venue':
              comparison = a.venue.name.localeCompare(b.venue.name);
              break;
            case 'date':
            default:
              comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
              break;
          }
          
          return validatedQuery.sortOrder === 'desc' ? -comparison : comparison;
        });
        
        // Apply pagination
        paginatedResult = paginateResults(
          sortedGigs,
          validatedQuery.page,
          validatedQuery.limit
        );
        // File-based fallback successful
      }
    } else {
      // Database disabled, using file-based catalog
      // Fallback to file-based catalog
      const allGigs = await getAllGigs();
      
      // Apply filters
      const filteredGigs = filterGigs(allGigs, {
        city: validatedQuery.city,
        tags: validatedQuery.tags,
        dateFrom: validatedQuery.dateFrom,
        dateTo: validatedQuery.dateTo,
        venue: validatedQuery.venue,
        q: validatedQuery.q,
        // Show past events only if no date filters are applied (i.e., "All dates" is selected)
        showPastEvents: !validatedQuery.dateFrom && !validatedQuery.dateTo
      });
      
      // Sort gigs based on query parameters
      const sortedGigs = filteredGigs.sort((a, b) => {
        let comparison = 0;
        
        switch (validatedQuery.sortBy) {
          case 'name':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'venue':
            comparison = a.venue.name.localeCompare(b.venue.name);
            break;
          case 'date':
          default:
            comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
            break;
        }
        
        return validatedQuery.sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      paginatedResult = paginateResults(
        sortedGigs,
        validatedQuery.page,
        validatedQuery.limit
      );
    }
    
    // Prepare response
    const response = {
      data: paginatedResult.data,
      pagination: paginatedResult.pagination,
      meta: {
        query: validatedQuery.q,
        filters: {
          city: validatedQuery.city,
          tags: validatedQuery.tags,
          dateFrom: validatedQuery.dateFrom,
          dateTo: validatedQuery.dateTo,
          venue: validatedQuery.venue
        },
        sort: {
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder
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