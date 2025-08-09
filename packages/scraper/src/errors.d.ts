/**
 * Custom error classes for scraper operations
 */
export declare class ScraperError extends Error {
    readonly source: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, source: string, originalError?: Error | undefined);
}
export declare class RateLimitError extends ScraperError {
    constructor(source: string, retryAfter?: number);
}
export declare class ParseError extends ScraperError {
    constructor(source: string, reason: string, originalError?: Error);
}
export declare class NetworkError extends ScraperError {
    constructor(source: string, url: string, originalError?: Error);
}
//# sourceMappingURL=errors.d.ts.map