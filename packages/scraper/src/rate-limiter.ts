/**
 * Rate limiter implementation with exponential backoff
 */

interface RateLimiterOptions {
  requestsPerMinute: number;
  burstLimit?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private backoffDelayMs = 0;
  private readonly options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      burstLimit: options.requestsPerMinute,
      backoffMultiplier: 2,
      maxBackoffMs: 60000, // 1 minute max backoff
      ...options,
    };
  }

  /**
   * Wait until the next request is allowed
   */
  async waitForRequest(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests (older than 1 minute)
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // Check if we're under the rate limit
    if (this.requests.length < this.options.requestsPerMinute) {
      // Apply exponential backoff if there was a recent failure
      if (this.backoffDelayMs > 0) {
        await this.sleep(this.backoffDelayMs);
        // Reduce backoff for successful requests
        this.backoffDelayMs = Math.max(0, this.backoffDelayMs / 2);
      }
      
      this.requests.push(now);
      return;
    }
    
    // Calculate how long to wait
    const oldestRequest = Math.min(...this.requests);
    const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
    
    await this.sleep(waitTime);
    return this.waitForRequest(); // Recursive call after waiting
  }

  /**
   * Record a failed request and apply exponential backoff
   */
  recordFailure(): void {
    this.backoffDelayMs = Math.min(
      this.options.maxBackoffMs,
      Math.max(1000, this.backoffDelayMs * this.options.backoffMultiplier)
    );
  }

  /**
   * Reset the backoff delay (call on successful request)
   */
  recordSuccess(): void {
    this.backoffDelayMs = Math.max(0, this.backoffDelayMs / 2);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status information
   */
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < 60000).length;
    
    return {
      recentRequests,
      remainingRequests: Math.max(0, this.options.requestsPerMinute - recentRequests),
      backoffDelayMs: this.backoffDelayMs,
      isThrottled: this.backoffDelayMs > 0,
    };
  }
}