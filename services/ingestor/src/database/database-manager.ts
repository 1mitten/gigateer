import { MongoDBConnection, type MongoDBConfig } from './mongodb-connection.js';
import { DataAccessLayer } from './data-access-layer.js';
import type { Gig } from '@gigateer/contracts';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'database-manager' });

/**
 * Database configuration for the ingestor
 */
export interface DatabaseConfig {
  /** Whether to use database storage */
  enabled: boolean;
  /** MongoDB connection configuration */
  mongodb: MongoDBConfig;
  /** Whether to also maintain file storage for backward compatibility */
  maintainFileStorage: boolean;
}

/**
 * Database manager that integrates MongoDB with the ingestor service
 */
export class DatabaseManager {
  private connection: MongoDBConnection;
  private dataLayer: DataAccessLayer | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connection = new MongoDBConnection(config.mongodb);
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Database integration disabled');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing database manager...');

      // Connect to MongoDB
      await this.connection.connect();
      
      // Initialize data access layer
      const db = await this.connection.getDatabase();
      this.dataLayer = new DataAccessLayer(db);
      
      // Initialize database schema
      await this.dataLayer.initialize();
      
      this.isInitialized = true;
      
      logger.info('Database manager initialized successfully', {
        databaseName: this.config.mongodb.databaseName,
        maintainFileStorage: this.config.maintainFileStorage
      });

    } catch (error) {
      logger.error('Failed to initialize database manager', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check if the database is enabled and initialized
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isInitialized && this.dataLayer !== null;
  }

  /**
   * Get the data access layer
   */
  getDataLayer(): DataAccessLayer {
    if (!this.dataLayer) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataLayer;
  }

  /**
   * Store gigs in the database
   */
  async storeGigs(gigs: Gig[], source: string, batchId?: string): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug('Database storage disabled, skipping gig storage');
      return;
    }

    if (gigs.length === 0) {
      logger.debug('No gigs to store');
      return;
    }

    try {
      const dataLayer = this.getDataLayer();
      const result = await dataLayer.upsertGigsBulk(gigs, batchId);
      
      logger.info('Stored gigs in database', {
        source,
        totalGigs: gigs.length,
        insertedCount: result.insertedCount,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        batchId
      });

    } catch (error) {
      logger.error('Failed to store gigs in database', {
        source,
        gigCount: gigs.length,
        batchId,
        error: (error as Error).message
      });
      
      // Don't throw error to prevent breaking the ingestion process
      // The file storage will still work as a fallback
    }
  }

  /**
   * Store performance metrics in the database
   */
  async storePerformanceMetrics(
    source: string,
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
    }
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const dataLayer = this.getDataLayer();
      await dataLayer.insertPerformanceMetrics({
        source,
        timestamp: new Date(),
        metrics
      });

      logger.debug('Stored performance metrics in database', {
        source,
        totalDuration: metrics.totalDuration,
        gigThroughput: metrics.gigThroughput
      });

    } catch (error) {
      logger.warn('Failed to store performance metrics in database', {
        source,
        error: (error as Error).message
      });
    }
  }

  /**
   * Store scraper run results in the database
   */
  async storeScraperRun(
    type: 'ingest_source' | 'ingest_all' | 'scheduled_run' | 'manual_trigger',
    results: {
      source?: string;
      rawCount: number;
      normalizedCount: number;
      newCount: number;
      updatedCount: number;
      errorCount: number;
      success: boolean;
      duration: number;
      errors?: string[];
    },
    summary?: {
      totalSources: number;
      successfulSources: number;
      failedSources: number;
      totalGigs: number;
      totalNew: number;
      totalUpdated: number;
      totalErrors: number;
      totalDuration: number;
    }
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const dataLayer = this.getDataLayer();
      await dataLayer.insertScraperRun({
        type,
        timestamp: new Date(),
        source: results.source,
        results,
        summary
      });

      logger.debug('Stored scraper run in database', {
        type,
        source: results.source,
        success: results.success,
        duration: results.duration
      });

    } catch (error) {
      logger.warn('Failed to store scraper run in database', {
        type,
        source: results.source,
        error: (error as Error).message
      });
    }
  }

  /**
   * Store error log in the database
   */
  async storeErrorLog(
    source: string,
    error: string,
    context?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    stack?: string
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const dataLayer = this.getDataLayer();
      await dataLayer.insertErrorLog({
        timestamp: new Date(),
        source,
        error,
        stack,
        context,
        severity
      });

      logger.debug('Stored error log in database', {
        source,
        severity,
        error: error.substring(0, 100)
      });

    } catch (dbError) {
      logger.warn('Failed to store error log in database', {
        source,
        originalError: error.substring(0, 100),
        dbError: (dbError as Error).message
      });
    }
  }

  /**
   * Get gigs from the database
   */
  async getGigs(options: {
    source?: string;
    city?: string;
    artist?: string;
    genre?: string;
    dateRange?: { start?: string; end?: string };
    status?: 'scheduled' | 'cancelled' | 'postponed';
    search?: string;
    limit?: number;
    offset?: number;
    sort?: Record<string, 1 | -1>;
  } = {}): Promise<Gig[]> {
    if (!this.isEnabled()) {
      throw new Error('Database not enabled');
    }

    const dataLayer = this.getDataLayer();
    return await dataLayer.findGigs(options);
  }

  /**
   * Count gigs in the database
   */
  async countGigs(options: {
    source?: string;
    city?: string;
    artist?: string;
    genre?: string;
    dateRange?: { start?: string; end?: string };
    status?: 'scheduled' | 'cancelled' | 'postponed';
    search?: string;
  } = {}): Promise<number> {
    if (!this.isEnabled()) {
      throw new Error('Database not enabled');
    }

    const dataLayer = this.getDataLayer();
    return await dataLayer.countGigs(options);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    connected: boolean;
    collections?: Record<string, number>;
    gigStatsBySource?: Record<string, { count: number; lastUpdated?: Date }>;
  }> {
    if (!this.config.enabled) {
      return { enabled: false, connected: false };
    }

    const connected = await this.connection.ping();
    if (!connected || !this.dataLayer) {
      return { enabled: true, connected: false };
    }

    try {
      const healthStatus = await this.dataLayer.getHealthStatus();
      const gigStatsBySource = await this.dataLayer.getGigStatsBySource();

      return {
        enabled: true,
        connected: true,
        collections: healthStatus.collections,
        gigStatsBySource
      };
    } catch (error) {
      logger.error('Failed to get database stats', {
        error: (error as Error).message
      });
      
      return {
        enabled: true,
        connected: false
      };
    }
  }

  /**
   * Health check for the database
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'disabled';
    details: Record<string, any>;
  }> {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        details: {
          enabled: false,
          message: 'Database integration disabled'
        }
      };
    }

    try {
      const connected = await this.connection.ping();
      if (!connected) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            message: 'Database connection failed'
          }
        };
      }

      const stats = await this.connection.getConnectionStats();
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          databaseName: stats.databaseName,
          collections: stats.collectionNames?.length || 0,
          serverVersion: stats.serverStatus?.version
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Cleanup and close database connections
   */
  async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
    }
    this.dataLayer = null;
    this.isInitialized = false;
    
    logger.info('Database manager cleanup completed');
  }

  /**
   * Create a DatabaseManager from environment variables
   */
  static fromEnvironment(): DatabaseManager {
    const config: DatabaseConfig = {
      enabled: process.env.INGESTOR_USE_DATABASE?.toLowerCase() === 'true',
      maintainFileStorage: process.env.INGESTOR_USE_FILE_STORAGE?.toLowerCase() !== 'false',
      mongodb: {
        connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DATABASE_NAME || 'gigateer',
        options: {
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
          minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
          maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '30000', 10),
          serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
          connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),
          socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10)
        }
      }
    };

    return new DatabaseManager(config);
  }
}