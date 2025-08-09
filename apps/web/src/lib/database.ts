import { MongoClient, Db, Collection, Filter, Document } from 'mongodb';
import { Gig } from '@gigateer/contracts';

// Database document types (same as ingestor service)
export interface GigDocument extends Omit<Gig, 'id' | 'dateStart' | 'dateEnd' | 'updatedAt' | 'firstSeenAt' | 'lastSeenAt'> {
  _id?: string;
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

export interface PerformanceDocument {
  _id?: string;
  source: string;
  timestamp: Date;
  metrics: {
    fetchDuration: number;
    normalizeDuration: number;
    validationDuration: number;
    saveDuration: number;
    totalDuration: number;
    memoryUsage: NodeJS.MemoryUsage;
    gigThroughput: number;
    gigCount?: number;
    errorCount?: number;
  };
}

// Collection names (same as ingestor service)
export const COLLECTIONS = {
  GIGS: 'gigs',
  PERFORMANCE_METRICS: 'performance_metrics',
  SCRAPER_RUNS: 'scraper_runs',
  ERROR_LOGS: 'error_logs'
} as const;

// Database configuration
interface DatabaseConfig {
  connectionString: string;
  databaseName: string;
}

/**
 * Database service for web application
 * Provides read-only access to MongoDB data with optimized queries for web API
 */
export class WebDatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      databaseName: process.env.MONGODB_DATABASE_NAME || 'gigateer',
      ...config
    };
  }

  /**
   * Connect to MongoDB
   */
  private async connect(): Promise<void> {
    if (this.client && this.db) {
      // Test connection health before reusing
      try {
        await this.client.db('admin').command({ ping: 1 });
        return;
      } catch (error) {
        console.warn('Existing database connection unhealthy, reconnecting...', error);
        // Close unhealthy connection
        if (this.client) {
          await this.client.close();
        }
        this.client = null;
        this.db = null;
      }
    }

    this.client = new MongoClient(this.config.connectionString, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000, // Increased from 5000
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000, // Increased from 10000
      retryWrites: true,
      retryReads: true
    });

    try {
      await this.client.connect();
      await this.client.db('admin').command({ ping: 1 });
      this.db = this.client.db(this.config.databaseName);
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
      }
      throw error;
    }
  }

  /**
   * Get database instance
   */
  private async getDatabase(): Promise<Db> {
    await this.connect();
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    return this.db;
  }

  /**
   * Get gigs collection
   */
  private async getGigsCollection(): Promise<Collection<GigDocument>> {
    const db = await this.getDatabase();
    return db.collection<GigDocument>(COLLECTIONS.GIGS);
  }

  /**
   * Get all gigs with optional sorting
   */
  async getAllGigs(sortBy: 'dateStart' | 'updatedAt' = 'dateStart', sortOrder: 1 | -1 = 1): Promise<Gig[]> {
    const collection = await this.getGigsCollection();
    
    const gigDocuments = await collection
      .find({})
      .sort({ [sortBy]: sortOrder })
      .toArray();
    
    return gigDocuments.map(this.convertGigDocumentToGig);
  }

  /**
   * Get gigs with advanced filtering and pagination
   */
  async getGigs(options: {
    filters?: {
      city?: string;
      tags?: string;
      dateFrom?: Date;
      dateTo?: Date;
      venue?: string;
      search?: string;
      source?: string;
      showPastEvents?: boolean;
    };
    sort?: {
      field: 'dateStart' | 'updatedAt' | 'title' | 'createdAt';
      order: 1 | -1;
    };
    pagination?: {
      page: number;
      limit: number;
    };
  } = {}): Promise<{
    gigs: Gig[];
    total: number;
    pagination?: {
      page: number;
      limit: number;
      pages: number;
      total: number;
    };
  }> {
    const collection = await this.getGigsCollection();
    
    // Build MongoDB filter query
    const filter: Filter<GigDocument> = {};
    
    if (options.filters) {
      // City filter (case-insensitive)
      if (options.filters.city) {
        filter['venue.city'] = { 
          $regex: options.filters.city, 
          $options: 'i' 
        };
      }
      
      // Tags filter (array contains - case-insensitive)
      if (options.filters.tags) {
        filter.tags = { 
          $regex: options.filters.tags, 
          $options: 'i' 
        };
      }
      
      // Date range filters
      const showPastEvents = options.filters.showPastEvents ?? false;
      let dateFilter: any = {};
      
      // Filter out past events by default (only show future/upcoming gigs)
      if (!showPastEvents) {
        dateFilter.$gte = new Date();
      }
      
      // Apply additional date range filters
      if (options.filters.dateFrom) {
        // Use the more restrictive of the two: dateFrom or "now"
        const dateFrom = options.filters.dateFrom;
        if (!dateFilter.$gte || dateFrom > dateFilter.$gte) {
          dateFilter.$gte = dateFrom;
        }
      }
      
      if (options.filters.dateTo) {
        dateFilter.$lte = options.filters.dateTo;
      }
      
      // Only apply dateStart filter if there are conditions
      if (Object.keys(dateFilter).length > 0) {
        filter.dateStart = dateFilter;
      }
      
      // Venue filter (case-insensitive)
      if (options.filters.venue) {
        filter['venue.name'] = { 
          $regex: options.filters.venue, 
          $options: 'i' 
        };
      }
      
      // Source filter
      if (options.filters.source) {
        filter.source = options.filters.source;
      }
      
      // Text search (flexible regex-based search across multiple fields)
      if (options.filters.search) {
        const searchRegex = { $regex: options.filters.search, $options: 'i' };
        filter.$or = [
          { title: searchRegex },
          { artists: { $elemMatch: searchRegex } },
          { 'venue.name': searchRegex },
          { tags: { $elemMatch: searchRegex } }
        ];
      }
    }
    
    // Get total count
    const total = await collection.countDocuments(filter);
    
    // Build query with sorting
    let query = collection.find(filter);
    
    // Apply sorting
    if (options.sort) {
      query = query.sort({ [options.sort.field]: options.sort.order });
    } else {
      // Default sort by date ascending (upcoming first)
      query = query.sort({ dateStart: 1 });
    }
    
    // Apply pagination
    let pagination;
    if (options.pagination) {
      const { page, limit } = options.pagination;
      const skip = (page - 1) * limit;
      
      query = query.skip(skip).limit(limit);
      
      pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    }
    
    const gigDocuments = await query.toArray();
    const gigs = gigDocuments.map(this.convertGigDocumentToGig);
    
    return {
      gigs,
      total,
      pagination
    };
  }

  /**
   * Get gig by ID
   */
  async getGigById(gigId: string): Promise<Gig | null> {
    const collection = await this.getGigsCollection();
    
    const gigDocument = await collection.findOne({ gigId });
    
    if (!gigDocument) {
      return null;
    }
    
    return this.convertGigDocumentToGig(gigDocument);
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalGigs: number;
    upcomingGigs: number;
    pastGigs: number;
    sources: Array<{
      name: string;
      gigCount: number;
      lastUpdated?: Date;
    }>;
    lastUpdated: string;
  }> {
    const collection = await this.getGigsCollection();
    const now = new Date();
    
    // Get total count
    const totalGigs = await collection.countDocuments({});
    
    // Count upcoming vs past gigs
    const upcomingGigs = await collection.countDocuments({
      dateStart: { $gte: now } as any
    });
    
    const pastGigs = totalGigs - upcomingGigs;
    
    // Get source statistics using aggregation
    const sourceStats = await collection.aggregate([
      {
        $group: {
          _id: '$source',
          gigCount: { $sum: 1 },
          lastUpdated: { $max: '$updatedAt' }
        }
      },
      {
        $project: {
          name: '$_id',
          gigCount: 1,
          lastUpdated: 1,
          _id: 0
        }
      },
      {
        $sort: { gigCount: -1 }
      }
    ]).toArray() as any[];
    
    // Get overall last updated timestamp
    const lastGigUpdate = await collection.findOne(
      {},
      { 
        sort: { 'updatedAt': -1 },
        projection: { 'updatedAt': 1 }
      }
    );
    
    return {
      totalGigs,
      upcomingGigs,
      pastGigs,
      sources: sourceStats,
      lastUpdated: lastGigUpdate?.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Get unique filter values for UI dropdowns
   */
  async getFilterOptions(): Promise<{
    cities: string[];
    tags: string[];
    venues: string[];
    sources: string[];
  }> {
    const collection = await this.getGigsCollection();
    
    // Get unique cities
    const cities = await collection.distinct('venue.city', { 'venue.city': { $ne: null } });
    
    // Get unique tags (flattened from arrays)
    const tags = await collection.distinct('tags');
    
    // Get unique venue names
    const venues = await collection.distinct('venue.name');
    
    // Get unique sources
    const sources = await collection.distinct('source');
    
    return {
      cities: cities.filter(Boolean).sort(),
      tags: tags.filter(Boolean).sort(),
      venues: venues.filter(Boolean).sort(),
      sources: sources.filter(Boolean).sort()
    };
  }

  /**
   * Check database health
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.connect();
      const db = await this.getDatabase();
      await db.command({ ping: 1 });
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Convert GigDocument to Gig
   */
  private convertGigDocumentToGig(doc: GigDocument): Gig {
    const { _id, gigId, _meta, dateStart, dateEnd, updatedAt, createdAt, firstSeenAt, lastSeenAt, ...gigData } = doc;
    return {
      ...gigData,
      id: gigId,
      dateStart: dateStart.toISOString(),
      dateEnd: dateEnd?.toISOString(),
      updatedAt: updatedAt.toISOString(),
      firstSeenAt: firstSeenAt?.toISOString(),
      lastSeenAt: lastSeenAt?.toISOString()
    } as Gig;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

// Singleton instance for the web app
let databaseService: WebDatabaseService | null = null;

/**
 * Get or create database service instance
 */
export function getWebDatabaseService(): WebDatabaseService {
  if (!databaseService) {
    databaseService = new WebDatabaseService();
  }
  return databaseService;
}

/**
 * Check if database is enabled via environment variable
 */
export function isDatabaseEnabled(): boolean {
  return process.env.INGESTOR_USE_DATABASE === 'true';
}