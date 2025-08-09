import type { Gig } from "./gig";

/**
 * Metadata about a scraper source
 */
export interface ScraperPluginMeta {
  /** Human-readable name of the source */
  name: string;
  /** Maximum requests per minute to avoid rate limiting */
  rateLimitPerMin: number;
  /** Default cron schedule for automatic runs */
  defaultSchedule: string;
  /** Optional description of the source */
  description?: string;
  /** Optional website URL */
  website?: string;
  /** Trust score for merge conflicts (higher = more trusted) */
  trustScore?: number;
}

/**
 * Interface that all scraper plugins must implement
 */
export interface ScraperPlugin {
  /** Metadata about this scraper */
  upstreamMeta: ScraperPluginMeta;
  
  /** Fetch raw data from the source */
  fetchRaw(): Promise<unknown[]>;
  
  /** Normalize raw data to Gig[] format */
  normalize(rawData: unknown[]): Promise<Gig[]>;
  
  /** Optional cleanup method */
  cleanup?(): Promise<void>;
}

/**
 * Statistics from a scraper run
 */
export interface ScraperRunStats {
  /** Name of the source that was scraped */
  source: string;
  /** When the run started */
  startTime: string;
  /** When the run completed */
  endTime?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Whether the run was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Array of error messages */
  errors?: string[];
  /** Number of errors encountered */
  errorCount?: number;
  /** Number of raw items fetched */
  rawCount: number;
  /** Number of normalized gigs */
  normalizedCount: number;
  /** Number of new gigs found */
  newCount: number;
  /** Number of updated gigs */
  updatedCount: number;
  /** Memory usage in MB */
  memoryUsage?: number;
  /** Processing rate (gigs per second) */
  gigPerSecond?: number;
}

/**
 * Configuration for the ingestor service
 */
export interface IngestorConfig {
  /** Development or production mode */
  mode: "development" | "production";
  /** Data directory path */
  dataDir: string;
  /** Raw data directory path */
  rawDataDir: string;
  /** Normalized data directory path */
  normalizedDataDir: string;
  /** Log directory path */  
  logDir: string;
  /** How long to keep old logs (days) */
  logRetentionDays: number;
  /** PID file path */
  pidFile: string;
  /** Default rate limit per minute */
  defaultRateLimitPerMin: number;
  /** Global rate limit per minute */
  globalRateLimitPerMin?: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Stagger scraper runs by this many minutes */
  staggerMinutes: number;
  /** Sources configuration */
  sources: {
    [sourceName: string]: {
      enabled: boolean;
      schedule?: string;
      rateLimitPerMin?: number;
    };
  };
}