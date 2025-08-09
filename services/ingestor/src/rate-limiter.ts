import Bottleneck from "bottleneck";
import type { Logger } from "./logger.js";

export class RateLimiter {
  private limiters: Map<string, Bottleneck> = new Map();
  
  constructor(private readonly logger: Logger) {}

  /**
   * Gets or creates a rate limiter for a specific source
   */
  getLimiter(source: string, rateLimitPerMin: number): Bottleneck {
    if (!this.limiters.has(source)) {
      const limiter = new Bottleneck({
        reservoir: rateLimitPerMin,
        reservoirRefreshAmount: rateLimitPerMin,
        reservoirRefreshInterval: 60 * 1000, // 1 minute in milliseconds
        maxConcurrent: 1, // One request at a time per source
      });

      limiter.on("failed", (error, jobInfo) => {
        this.logger.warn(
          { source, error: error.message, jobInfo },
          "Rate limited request failed"
        );
      });

      limiter.on("retry", (error, jobInfo) => {
        this.logger.info(
          { source, error: (error as any)?.message || String(error), jobInfo },
          "Retrying rate limited request"
        );
      });

      this.limiters.set(source, limiter);
      
      this.logger.debug(
        { source, rateLimitPerMin },
        "Created rate limiter"
      );
    }

    return this.limiters.get(source)!;
  }

  /**
   * Schedules a function to run with rate limiting
   */
  async schedule<T>(
    source: string,
    rateLimitPerMin: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const limiter = this.getLimiter(source, rateLimitPerMin);
    return limiter.schedule(fn);
  }

  /**
   * Cleans up all limiters
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.limiters.values()).map(limiter => 
      limiter.stop({ dropWaitingJobs: true })
    );
    await Promise.all(promises);
    this.limiters.clear();
  }
}