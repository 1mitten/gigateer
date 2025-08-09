/**
 * Custom error classes for scraper operations
 */

export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ScraperError";
  }
}

export class RateLimitError extends ScraperError {
  constructor(source: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${source}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`,
      source
    );
    this.name = "RateLimitError";
  }
}

export class ParseError extends ScraperError {
  constructor(source: string, reason: string, originalError?: Error) {
    super(`Failed to parse data from ${source}: ${reason}`, source, originalError);
    this.name = "ParseError";
  }
}

export class NetworkError extends ScraperError {
  constructor(source: string, url: string, originalError?: Error) {
    super(`Network request failed for ${source} at ${url}`, source, originalError);
    this.name = "NetworkError";
  }
}