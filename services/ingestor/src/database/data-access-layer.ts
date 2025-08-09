import { 
  Collection, 
  Db, 
  Filter, 
  FindOptions, 
  UpdateFilter, 
  UpdateOptions,
  DeleteOptions,
  BulkWriteOptions,
  AnyBulkWriteOperation,
  InsertOneOptions,
  WithId
} from 'mongodb';
import type { Gig } from '@gigateer/contracts';
import { 
  GigDocument, 
  PerformanceDocument, 
  ScraperRunDocument, 
  ErrorLogDocument,
  DatabaseSchema,
  COLLECTIONS 
} from './schemas.js';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'data-access-layer' });

/**
 * Query options for finding gigs
 */
export interface GigQueryOptions {
  /** Source filter */
  source?: string;
  /** City filter */
  city?: string;
  /** Artist filter (partial match) */
  artist?: string;
  /** Genre filter */
  genre?: string;
  /** Date range filter */
  dateRange?: {
    start?: string;
    end?: string;
  };
  /** Status filter */
  status?: 'scheduled' | 'cancelled' | 'postponed';
  /** Text search */
  search?: string;
  /** Pagination */
  limit?: number;
  offset?: number;
  /** Sorting */
  sort?: Record<string, 1 | -1>;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  insertedIds: string[];
  upsertedIds: string[];
}

/**
 * Data Access Layer for MongoDB operations
 */
export class DataAccessLayer {
  private db: Db;
  private schema: DatabaseSchema;

  constructor(db: Db) {
    this.db = db;
    this.schema = new DatabaseSchema(db);
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    await this.schema.initializeSchema();
  }

  // ========== GIG OPERATIONS ==========

  /**
   * Insert a single gig
   */
  async insertGig(gig: Gig, batchId?: string): Promise<string> {
    const collection = this.schema.getGigsCollection();
    
    const document: Omit<GigDocument, '_id'> = {
      ...gig,
      // Convert string dates to Date objects for better MongoDB querying
      dateStart: new Date(gig.dateStart),
      dateEnd: gig.dateEnd ? new Date(gig.dateEnd) : undefined,
      updatedAt: new Date(gig.updatedAt),
      firstSeenAt: gig.firstSeenAt ? new Date(gig.firstSeenAt) : undefined,
      lastSeenAt: gig.lastSeenAt ? new Date(gig.lastSeenAt) : undefined,
      createdAt: new Date(),
      gigId: gig.id,
      _meta: {
        schemaVersion: 1,
        batchId
      }
    };

    const result = await collection.insertOne(document);
    
    logger.debug('Inserted gig', {
      gigId: gig.id,
      insertedId: result.insertedId,
      source: gig.source
    });

    return result.insertedId.toString();
  }

  /**
   * Insert multiple gigs in bulk
   */
  async insertGigsBulk(gigs: Gig[], batchId?: string): Promise<BulkOperationResult> {
    if (gigs.length === 0) {
      return {
        insertedCount: 0,
        matchedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        upsertedCount: 0,
        insertedIds: [],
        upsertedIds: []
      };
    }

    const collection = this.schema.getGigsCollection();
    const operations: AnyBulkWriteOperation<GigDocument>[] = [];

    for (const gig of gigs) {
      const document: Omit<GigDocument, '_id'> = {
        ...gig,
        // Convert string dates to Date objects for better MongoDB querying
        dateStart: new Date(gig.dateStart),
        dateEnd: gig.dateEnd ? new Date(gig.dateEnd) : undefined,
        updatedAt: new Date(gig.updatedAt),
        firstSeenAt: gig.firstSeenAt ? new Date(gig.firstSeenAt) : undefined,
        lastSeenAt: gig.lastSeenAt ? new Date(gig.lastSeenAt) : undefined,
        createdAt: new Date(),
        gigId: gig.id,
        _meta: {
          schemaVersion: 1,
          batchId
        }
      };

      operations.push({
        insertOne: {
          document
        }
      });
    }

    const result = await collection.bulkWrite(operations, { ordered: false });
    
    logger.info('Bulk inserted gigs', {
      insertedCount: result.insertedCount,
      batchId,
      totalGigs: gigs.length
    });

    return {
      insertedCount: result.insertedCount || 0,
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      deletedCount: result.deletedCount || 0,
      upsertedCount: result.upsertedCount || 0,
      insertedIds: Object.values(result.insertedIds || {}).map(id => id.toString()),
      upsertedIds: Object.values(result.upsertedIds || {}).map(id => id.toString())
    };
  }

  /**
   * Upsert multiple gigs (update if exists, insert if not)
   */
  async upsertGigsBulk(gigs: Gig[], batchId?: string): Promise<BulkOperationResult> {
    if (gigs.length === 0) {
      return {
        insertedCount: 0,
        matchedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        upsertedCount: 0,
        insertedIds: [],
        upsertedIds: []
      };
    }

    const collection = this.schema.getGigsCollection();
    const operations: AnyBulkWriteOperation<GigDocument>[] = [];

    for (const gig of gigs) {
      const document: Omit<GigDocument, '_id'> = {
        ...gig,
        // Convert string dates to Date objects for better MongoDB querying
        dateStart: new Date(gig.dateStart),
        dateEnd: gig.dateEnd ? new Date(gig.dateEnd) : undefined,
        updatedAt: new Date(gig.updatedAt), // Convert updatedAt as well
        firstSeenAt: gig.firstSeenAt ? new Date(gig.firstSeenAt) : undefined,
        lastSeenAt: gig.lastSeenAt ? new Date(gig.lastSeenAt) : undefined,
        createdAt: new Date(),
        gigId: gig.id,
        _meta: {
          schemaVersion: 1,
          batchId
        }
      };

      operations.push({
        replaceOne: {
          filter: { gigId: gig.id },
          replacement: document,
          upsert: true
        }
      });
    }

    const result = await collection.bulkWrite(operations, { ordered: false });
    
    logger.info('Bulk upserted gigs', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      batchId,
      totalGigs: gigs.length
    });

    return {
      insertedCount: result.insertedCount || 0,
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      deletedCount: result.deletedCount || 0,
      upsertedCount: result.upsertedCount || 0,
      insertedIds: Object.values(result.insertedIds || {}).map(id => id.toString()),
      upsertedIds: Object.values(result.upsertedIds || {}).map(id => id.toString())
    };
  }

  /**
   * Find a gig by its ID
   */
  async findGigById(gigId: string): Promise<Gig | null> {
    const collection = this.schema.getGigsCollection();
    const document = await collection.findOne({ gigId });
    
    if (!document) {
      return null;
    }

    return this.gigDocumentToGig(document);
  }

  /**
   * Find gigs with flexible query options
   */
  async findGigs(options: GigQueryOptions = {}): Promise<Gig[]> {
    const collection = this.schema.getGigsCollection();
    const filter: Filter<GigDocument> = this.buildGigFilter(options);
    
    const findOptions: FindOptions<GigDocument> = {
      limit: options.limit || 1000,
      skip: options.offset || 0,
      sort: options.sort || { dateStart: 1 }
    };

    const documents = await collection.find(filter, findOptions).toArray();
    
    return documents.map(doc => this.gigDocumentToGig(doc));
  }

  /**
   * Count gigs matching query
   */
  async countGigs(options: GigQueryOptions = {}): Promise<number> {
    const collection = this.schema.getGigsCollection();
    const filter: Filter<GigDocument> = this.buildGigFilter(options);
    
    return await collection.countDocuments(filter);
  }

  /**
   * Update a gig by ID
   */
  async updateGig(gigId: string, update: Partial<Gig>): Promise<boolean> {
    const collection = this.schema.getGigsCollection();
    
    // Convert string dates to Date objects for consistent storage
    const processedUpdate = { ...update };
    if (processedUpdate.dateStart) {
      (processedUpdate as any).dateStart = new Date(processedUpdate.dateStart);
    }
    if (processedUpdate.dateEnd) {
      (processedUpdate as any).dateEnd = new Date(processedUpdate.dateEnd);
    }
    if (processedUpdate.updatedAt) {
      (processedUpdate as any).updatedAt = new Date(processedUpdate.updatedAt);
    }
    
    const updateDoc: UpdateFilter<GigDocument> = {
      $set: {
        ...(processedUpdate as any), // Cast as any due to date conversion complexity
        updatedAt: new Date()
      }
    };

    const result = await collection.updateOne({ gigId }, updateDoc);
    
    logger.debug('Updated gig', {
      gigId,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    return result.modifiedCount > 0;
  }

  /**
   * Delete gig by ID
   */
  async deleteGig(gigId: string): Promise<boolean> {
    const collection = this.schema.getGigsCollection();
    const result = await collection.deleteOne({ gigId });
    
    logger.debug('Deleted gig', {
      gigId,
      deletedCount: result.deletedCount
    });

    return result.deletedCount > 0;
  }

  /**
   * Delete gigs by source
   */
  async deleteGigsBySource(source: string): Promise<number> {
    const collection = this.schema.getGigsCollection();
    const result = await collection.deleteMany({ source });
    
    logger.info('Deleted gigs by source', {
      source,
      deletedCount: result.deletedCount
    });

    return result.deletedCount || 0;
  }

  /**
   * Get gig statistics by source
   */
  async getGigStatsBySource(): Promise<Record<string, { count: number; lastUpdated?: Date }>> {
    const collection = this.schema.getGigsCollection();
    
    const pipeline = [
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          lastUpdated: { $max: '$updatedAt' }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();
    
    const stats: Record<string, { count: number; lastUpdated?: Date }> = {};
    
    for (const result of results) {
      stats[result._id] = {
        count: result.count,
        lastUpdated: result.lastUpdated ? new Date(result.lastUpdated) : undefined
      };
    }

    return stats;
  }

  // ========== PERFORMANCE METRICS OPERATIONS ==========

  /**
   * Insert performance metrics
   */
  async insertPerformanceMetrics(metrics: Omit<PerformanceDocument, '_id'>): Promise<string> {
    const collection = this.schema.getPerformanceCollection();
    const result = await collection.insertOne(metrics);
    
    logger.debug('Inserted performance metrics', {
      source: metrics.source,
      insertedId: result.insertedId
    });

    return result.insertedId.toString();
  }

  /**
   * Get performance metrics for a source
   */
  async getPerformanceMetrics(
    source?: string, 
    limit: number = 100
  ): Promise<PerformanceDocument[]> {
    const collection = this.schema.getPerformanceCollection();
    
    const filter: Filter<PerformanceDocument> = source ? { source } : {};
    
    return await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  // ========== SCRAPER RUNS OPERATIONS ==========

  /**
   * Insert scraper run log
   */
  async insertScraperRun(run: Omit<ScraperRunDocument, '_id'>): Promise<string> {
    const collection = this.schema.getScraperRunsCollection();
    const result = await collection.insertOne(run);
    
    logger.debug('Inserted scraper run log', {
      type: run.type,
      source: run.source,
      insertedId: result.insertedId
    });

    return result.insertedId.toString();
  }

  /**
   * Get recent scraper runs
   */
  async getRecentScraperRuns(limit: number = 50): Promise<ScraperRunDocument[]> {
    const collection = this.schema.getScraperRunsCollection();
    
    return await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  // ========== ERROR LOGS OPERATIONS ==========

  /**
   * Insert error log
   */
  async insertErrorLog(error: Omit<ErrorLogDocument, '_id'>): Promise<string> {
    const collection = this.schema.getErrorLogsCollection();
    const result = await collection.insertOne(error);
    
    logger.debug('Inserted error log', {
      source: error.source,
      severity: error.severity,
      insertedId: result.insertedId
    });

    return result.insertedId.toString();
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    source?: string,
    severity?: string,
    limit: number = 100
  ): Promise<ErrorLogDocument[]> {
    const collection = this.schema.getErrorLogsCollection();
    
    const filter: Filter<ErrorLogDocument> = {};
    if (source) filter.source = source;
    if (severity) filter.severity = severity as any;
    
    return await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  // ========== HELPER METHODS ==========

  /**
   * Convert GigDocument to Gig
   */
  private gigDocumentToGig(document: WithId<GigDocument>): Gig {
    const { _id, gigId, _meta, createdAt, firstSeenAt, lastSeenAt, ...gigData } = document;
    return {
      ...gigData,
      id: gigId,
      // Convert Date objects back to ISO strings for the Gig interface
      dateStart: document.dateStart.toISOString(),
      dateEnd: document.dateEnd ? document.dateEnd.toISOString() : undefined,
      updatedAt: document.updatedAt.toISOString(),
      firstSeenAt: document.firstSeenAt ? document.firstSeenAt.toISOString() : undefined,
      lastSeenAt: document.lastSeenAt ? document.lastSeenAt.toISOString() : undefined
    } as Gig;
  }

  /**
   * Build MongoDB filter from query options
   */
  private buildGigFilter(options: GigQueryOptions): Filter<GigDocument> {
    const filter: Filter<GigDocument> = {};

    if (options.source) {
      filter.source = options.source;
    }

    if (options.city) {
      filter['venue.city'] = { $regex: options.city, $options: 'i' };
    }

    if (options.artist) {
      filter.artists = { $regex: options.artist, $options: 'i' };
    }

    if (options.genre) {
      filter.genre = options.genre;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.dateRange) {
      const dateFilter: any = {};
      if (options.dateRange.start) {
        dateFilter.$gte = options.dateRange.start;
      }
      if (options.dateRange.end) {
        dateFilter.$lte = options.dateRange.end;
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.dateStart = dateFilter;
      }
    }

    if (options.search) {
      filter.$text = { $search: options.search };
    }

    return filter;
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    collections: Record<string, number>;
    indexes: Record<string, string[]>;
  }> {
    try {
      // Test connection
      await this.db.admin().ping();
      
      // Get collection counts
      const collections: Record<string, number> = {};
      for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
        collections[collectionName] = await this.db.collection(collectionName).countDocuments();
      }

      // Get index information
      const indexes: Record<string, string[]> = {};
      for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
        const indexInfo = await this.db.collection(collectionName).listIndexes().toArray();
        indexes[collectionName] = indexInfo.map(idx => idx.name);
      }

      return {
        connected: true,
        collections,
        indexes
      };
    } catch (error) {
      logger.error('Database health check failed', {
        error: (error as Error).message
      });
      
      return {
        connected: false,
        collections: {},
        indexes: {}
      };
    }
  }
}