/**
 * Custom error classes for scraper operations
 */
export class ScraperError extends Error {
    source;
    originalError;
    constructor(message, source, originalError) {
        super(message);
        this.source = source;
        this.originalError = originalError;
        this.name = "ScraperError";
    }
}
export class RateLimitError extends ScraperError {
    constructor(source, retryAfter) {
        super(`Rate limit exceeded for ${source}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`, source);
        this.name = "RateLimitError";
    }
}
export class ParseError extends ScraperError {
    constructor(source, reason, originalError) {
        super(`Failed to parse data from ${source}: ${reason}`, source, originalError);
        this.name = "ParseError";
    }
}
export class NetworkError extends ScraperError {
    constructor(source, url, originalError) {
        super(`Network request failed for ${source} at ${url}`, source, originalError);
        this.name = "NetworkError";
    }
}
//# sourceMappingURL=errors.js.map