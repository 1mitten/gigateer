import { Db, Collection, CreateIndexesOptions, IndexSpecification, Document } from 'mongodb';
import type { Gig } from '@gigateer/contracts';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'database-schemas' });

/**
 * MongoDB document interface for Gigs
 */
export interface GigDocument extends Omit<Gig, 'id' | 'dateStart' | 'dateEnd' | 'updatedAt' | 'firstSeenAt' | 'lastSeenAt'> {
  /** MongoDB ObjectId - auto-generated */
  _id?: string;
  /** Original Gig ID - kept for compatibility */
  gigId: string;
  /** Start date as Date object for better querying */
  dateStart: Date;
  /** End date as Date object for better querying */
  dateEnd?: Date;
  /** When this gig was last updated - as Date object */
  updatedAt: Date;
  /** When document was first inserted - moved to root for better indexing */
  createdAt: Date;
  /** When this gig was first seen - as Date object for better querying */
  firstSeenAt?: Date;
  /** When this gig was last seen - as Date object for better querying */
  lastSeenAt?: Date;
  /** Database metadata */
  _meta?: {
    /** Schema version for migrations */
    schemaVersion: number;
    /** Insert batch ID for tracking ingestion runs */
    batchId?: string;
  };
}

/**
 * Performance metrics document for tracking scraper performance
 */
export interface PerformanceDocument {
  _id?: string;
  /** Source name */
  source: string;
  /** Timestamp of the run */
  timestamp: Date;
  /** Performance metrics */
  metrics: {
    /** Time to fetch data (ms) */
    fetchDuration: number;
    /** Time to normalize data (ms) */
    normalizeDuration: number;
    /** Time to validate data (ms) */
    validationDuration: number;
    /** Time to save data (ms) */
    saveDuration: number;
    /** Total duration (ms) */
    totalDuration: number;
    /** Memory usage snapshot */
    memoryUsage: NodeJS.MemoryUsage;
    /** Processing throughput (gigs/second) */
    gigThroughput: number;
    /** Number of gigs processed */
    gigCount?: number;
    /** Error count if any */
    errorCount?: number;
  };
}

/**
 * Scraper run log document
 */
export interface ScraperRunDocument {
  _id?: string;
  /** Type of run */
  type: 'ingest_source' | 'ingest_all' | 'scheduled_run' | 'manual_trigger';
  /** Run timestamp */
  timestamp: Date;
  /** Source name (for individual runs) */
  source?: string;
  /** Run results */
  results: {
    /** Number of raw items fetched */
    rawCount: number;
    /** Number of normalized gigs */
    normalizedCount: number;
    /** Number of new gigs */
    newCount: number;
    /** Number of updated gigs */
    updatedCount: number;
    /** Number of errors */
    errorCount: number;
    /** Whether run was successful */
    success: boolean;
    /** Duration in milliseconds */
    duration: number;
    /** Error messages if any */
    errors?: string[];
  };
  /** Summary for bulk runs */
  summary?: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    totalGigs: number;
    totalNew: number;
    totalUpdated: number;
    totalErrors: number;
    totalDuration: number;
  };
}

/**
 * Error log document
 */
export interface ErrorLogDocument {
  _id?: string;
  /** Error timestamp */
  timestamp: Date;
  /** Source name */
  source: string;
  /** Error message */
  error: string;
  /** Stack trace if available */
  stack?: string;
  /** Additional context */
  context?: Record<string, any>;
  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether error was resolved */
  resolved?: boolean;
  /** Resolution notes */
  resolutionNotes?: string;
}

/**
 * Collection names as constants
 */
export const COLLECTIONS = {
  GIGS: 'gigs',
  PERFORMANCE_METRICS: 'performance_metrics',
  SCRAPER_RUNS: 'scraper_runs',
  ERROR_LOGS: 'error_logs'
} as const;

/**
 * Database schema manager for creating collections and indexes
 */
export class DatabaseSchema {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Initialize all collections and indexes
   */
  async initializeSchema(): Promise<void> {
    logger.info('Initializing database schema...');

    try {
      // Create collections if they don't exist
      await this.createCollections();
      
      // Create indexes for optimal querying
      await this.createIndexes();
      
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Create all collections
   */
  private async createCollections(): Promise<void> {
    const collections = await this.db.listCollections().toArray();
    const existingNames = collections.map(col => col.name);

    for (const collectionName of Object.values(COLLECTIONS)) {
      if (!existingNames.includes(collectionName)) {
        await this.db.createCollection(collectionName);
        logger.info(`Created collection: ${collectionName}`);
      } else {
        logger.debug(`Collection already exists: ${collectionName}`);
      }
    }
  }

  /**
   * Create indexes for optimal performance
   */
  private async createIndexes(): Promise<void> {
    // Gigs collection indexes
    await this.createGigsIndexes();
    
    // Performance metrics indexes
    await this.createPerformanceIndexes();
    
    // Scraper runs indexes
    await this.createScraperRunsIndexes();
    
    // Error logs indexes
    await this.createErrorLogsIndexes();
  }

  /**
   * Create indexes for the gigs collection
   */
  private async createGigsIndexes(): Promise<void> {
    const collection = this.db.collection<GigDocument>(COLLECTIONS.GIGS);
    
    const indexes: Array<{
      spec: IndexSpecification;
      options?: CreateIndexesOptions;
      name: string;
    }> = [
      {
        spec: { gigId: 1 },
        options: { unique: true, background: true },
        name: 'gigId_unique'
      },
      {
        spec: { source: 1 },
        options: { background: true },
        name: 'source_index'
      },
      {
        spec: { hash: 1 },
        options: { background: true },
        name: 'hash_index'
      },
      {
        spec: { dateStart: 1 },
        options: { background: true },
        name: 'dateStart_index'
      },
      {
        spec: { 'venue.city': 1 },
        options: { background: true },
        name: 'venue_city_index'
      },
      {
        spec: { artists: 1 },
        options: { background: true },
        name: 'artists_index'
      },
      {
        spec: { tags: 1 },
        options: { background: true },
        name: 'tags_index'
      },
      {
        spec: { status: 1 },
        options: { background: true },
        name: 'status_index'
      },
      {
        spec: { updatedAt: -1 },
        options: { background: true },
        name: 'updatedAt_desc'
      },
      {
        spec: { createdAt: -1 },
        options: { background: true },
        name: 'createdAt_desc'
      },
      {
        spec: { firstSeenAt: -1 },
        options: { background: true, sparse: true },
        name: 'firstSeenAt_desc'
      },
      {
        spec: { lastSeenAt: -1 },
        options: { background: true, sparse: true },
        name: 'lastSeenAt_desc'
      },
      // Compound indexes for common queries
      {
        spec: { source: 1, dateStart: 1 },
        options: { background: true },
        name: 'source_dateStart'
      },
      {
        spec: { 'venue.city': 1, dateStart: 1 },
        options: { background: true },
        name: 'city_dateStart'
      },
      // Text search index for full-text search on titles and artists
      {
        spec: { 
          title: 'text', 
          artists: 'text', 
          'venue.name': 'text',
          description: 'text' 
        },
        options: { background: true },
        name: 'text_search'
      }
    ];

    await this.createIndexesForCollection(collection, indexes);
  }

  /**
   * Create indexes for performance metrics collection
   */
  private async createPerformanceIndexes(): Promise<void> {
    const collection = this.db.collection<PerformanceDocument>(COLLECTIONS.PERFORMANCE_METRICS);
    
    const indexes: Array<{
      spec: IndexSpecification;
      options?: CreateIndexesOptions;
      name: string;
    }> = [
      {
        spec: { source: 1, timestamp: -1 },
        options: { background: true },
        name: 'source_timestamp'
      },
      {
        spec: { timestamp: -1 },
        options: { background: true },
        name: 'timestamp_desc'
      },
      {
        spec: { 'metrics.totalDuration': -1 },
        options: { background: true },
        name: 'duration_desc'
      },
      {
        spec: { 'metrics.gigThroughput': -1 },
        options: { background: true },
        name: 'throughput_desc'
      }
    ];

    await this.createIndexesForCollection(collection, indexes);
  }

  /**
   * Create indexes for scraper runs collection
   */
  private async createScraperRunsIndexes(): Promise<void> {
    const collection = this.db.collection<ScraperRunDocument>(COLLECTIONS.SCRAPER_RUNS);
    
    const indexes: Array<{
      spec: IndexSpecification;
      options?: CreateIndexesOptions;
      name: string;
    }> = [
      {
        spec: { timestamp: -1 },
        options: { background: true },
        name: 'timestamp_desc'
      },
      {
        spec: { type: 1, timestamp: -1 },
        options: { background: true },
        name: 'type_timestamp'
      },
      {
        spec: { source: 1, timestamp: -1 },
        options: { background: true, sparse: true },
        name: 'source_timestamp'
      },
      {
        spec: { 'results.success': 1 },
        options: { background: true },
        name: 'success_index'
      }
    ];

    await this.createIndexesForCollection(collection, indexes);
  }

  /**
   * Create indexes for error logs collection
   */
  private async createErrorLogsIndexes(): Promise<void> {
    const collection = this.db.collection<ErrorLogDocument>(COLLECTIONS.ERROR_LOGS);
    
    const indexes: Array<{
      spec: IndexSpecification;
      options?: CreateIndexesOptions;
      name: string;
    }> = [
      {
        spec: { timestamp: -1 },
        options: { background: true },
        name: 'timestamp_desc'
      },
      {
        spec: { source: 1, timestamp: -1 },
        options: { background: true },
        name: 'source_timestamp'
      },
      {
        spec: { severity: 1, timestamp: -1 },
        options: { background: true },
        name: 'severity_timestamp'
      },
      {
        spec: { resolved: 1 },
        options: { background: true, sparse: true },
        name: 'resolved_index'
      }
    ];

    await this.createIndexesForCollection(collection, indexes);
  }

  /**
   * Helper method to create indexes for a collection
   */
  private async createIndexesForCollection<T extends Document = Document>(
    collection: Collection<T>,
    indexes: Array<{
      spec: IndexSpecification;
      options?: CreateIndexesOptions;
      name: string;
    }>
  ): Promise<void> {
    for (const index of indexes) {
      try {
        await collection.createIndex(index.spec, {
          ...index.options,
          name: index.name
        });
        logger.debug(`Created index: ${index.name} on collection: ${collection.collectionName}`);
      } catch (error) {
        // Index might already exist
        if ((error as any).code !== 85) { // IndexOptionsConflict
          logger.warn(`Failed to create index: ${index.name}`, {
            error: (error as Error).message
          });
        }
      }
    }
  }

  /**
   * Get collection for type-safe operations
   */
  getGigsCollection(): Collection<GigDocument> {
    return this.db.collection<GigDocument>(COLLECTIONS.GIGS);
  }

  getPerformanceCollection(): Collection<PerformanceDocument> {
    return this.db.collection<PerformanceDocument>(COLLECTIONS.PERFORMANCE_METRICS);
  }

  getScraperRunsCollection(): Collection<ScraperRunDocument> {
    return this.db.collection<ScraperRunDocument>(COLLECTIONS.SCRAPER_RUNS);
  }

  getErrorLogsCollection(): Collection<ErrorLogDocument> {
    return this.db.collection<ErrorLogDocument>(COLLECTIONS.ERROR_LOGS);
  }
}