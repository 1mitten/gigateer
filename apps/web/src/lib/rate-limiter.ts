import { NextRequest } from 'next/server';
import { ErrorResponse, RateLimitHeaders } from '../types/api';

// In-memory store for rate limiting
// In production, you'd want to use Redis or a similar external store
const rateLimitStore = new Map<string, { count: number; resetTime: number; burstCount: number; burstResetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute
const BURST_LIMIT_WINDOW = 1000; // 1 second in milliseconds  
const BURST_LIMIT_MAX_REQUESTS = 10; // 10 requests per second

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default IP for development
  return request.ip || '127.0.0.1';
}

/**
 * Check and update rate limit for an IP address
 */
function checkRateLimit(ip: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record) {
    // First request from this IP
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      burstCount: 1,
      burstResetTime: now + BURST_LIMIT_WINDOW
    });
    return {
      allowed: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }
  
  // Check if we need to reset the burst window
  if (now > record.burstResetTime) {
    record.burstCount = 0;
    record.burstResetTime = now + BURST_LIMIT_WINDOW;
  }
  
  // Check if we need to reset the rate limit window
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  // Check burst limit first
  if (record.burstCount >= BURST_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count),
      resetTime: record.resetTime
    };
  }
  
  // Check rate limit
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  
  // Update counters
  record.count++;
  record.burstCount++;
  rateLimitStore.set(ip, record);
  
  return {
    allowed: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response> | Response
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const ip = getClientIP(request);
    const { allowed, limit, remaining, resetTime } = checkRateLimit(ip);
    
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    };
    
    if (!allowed) {
      const errorResponse: ErrorResponse = {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Call the actual handler
    const response = await handler(request, ...args);
    
    // Add rate limit headers to successful responses
    const newHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime && now > record.burstResetTime) {
      rateLimitStore.delete(ip);
    }
  }
}

// Clean up every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}