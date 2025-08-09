/**
 * Rate limiter implementation with exponential backoff
 */
interface RateLimiterOptions {
    requestsPerMinute: number;
    burstLimit?: number;
    backoffMultiplier?: number;
    maxBackoffMs?: number;
}
export declare class RateLimiter {
    private requests;
    private backoffDelayMs;
    private readonly options;
    constructor(options: RateLimiterOptions);
    /**
     * Wait until the next request is allowed
     */
    waitForRequest(): Promise<void>;
    /**
     * Record a failed request and apply exponential backoff
     */
    recordFailure(): void;
    /**
     * Reset the backoff delay (call on successful request)
     */
    recordSuccess(): void;
    private sleep;
    /**
     * Get current status information
     */
    getStatus(): {
        recentRequests: number;
        remainingRequests: number;
        backoffDelayMs: number;
        isThrottled: boolean;
    };
}
export {};
//# sourceMappingURL=rate-limiter.d.ts.map