import { z } from 'zod';
import { Gig } from '@gigateer/contracts';

// Query parameters for GET /api/gigs
export const GigsQuerySchema = z.object({
  city: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  venue: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type GigsQuery = z.infer<typeof GigsQuerySchema>;

// Pagination info
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().min(0),
  pages: z.number().int().min(0)
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Meta information about applied filters and query
export const QueryMetaSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    city: z.string().optional(),
    tags: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    venue: z.string().optional()
  }).optional()
});

export type QueryMeta = z.infer<typeof QueryMetaSchema>;

// Response for GET /api/gigs
export const GigsResponseSchema = z.object({
  data: z.array(z.any()), // Will be Gig[] but avoiding circular import
  pagination: PaginationSchema,
  meta: QueryMetaSchema
});

export type GigsResponse = Omit<z.infer<typeof GigsResponseSchema>, 'data'> & {
  data: Gig[];
};

// Response for GET /api/gigs/[id]
export const GigDetailResponseSchema = z.object({
  data: z.any() // Will be Gig but avoiding circular import
});

export type GigDetailResponse = Omit<z.infer<typeof GigDetailResponseSchema>, 'data'> & {
  data: Gig;
};

// Source stats for meta endpoint
export const SourceStatsSchema = z.object({
  name: z.string(),
  lastRun: z.string().datetime(),
  gigCount: z.number().int().min(0),
  status: z.enum(['success', 'error', 'running'])
});

export type SourceStats = z.infer<typeof SourceStatsSchema>;

// Response for GET /api/meta
export const MetaResponseSchema = z.object({
  data: z.object({
    totalGigs: z.number().int().min(0),
    sources: z.array(SourceStatsSchema),
    lastUpdated: z.string().datetime(),
    upcomingGigs: z.number().int().min(0),
    pastGigs: z.number().int().min(0)
  })
});

export type MetaResponse = z.infer<typeof MetaResponseSchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string()).optional(),
  retryAfter: z.number().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Rate limit headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}