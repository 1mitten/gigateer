import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'mongodb-connection' });

export interface MongoDBConfig {
  /** MongoDB connection string */
  connectionString: string;
  /** Database name */
  databaseName: string;
  /** Connection options */
  options?: MongoClientOptions;
}

/**
 * MongoDB connection manager with connection pooling and error handling
 */
export class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: MongoDBConfig;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: MongoDBConfig) {
    this.config = {
      ...config,
      options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        ...config.options
      }
    };
  }

  /**
   * Connect to MongoDB with connection pooling
   */
  async connect(): Promise<void> {
    // If already connected, return
    if (this.client && this.db) {
      return;
    }

    // If connection is in progress, wait for it
    if (this.isConnecting && this.connectionPromise) {
      await this.connectionPromise;
      return;
    }

    // Start new connection
    this.isConnecting = true;
    this.connectionPromise = this._connect();
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _connect(): Promise<void> {
    try {
      logger.info('Connecting to MongoDB...', {
        databaseName: this.config.databaseName,
        serverSelectionTimeout: this.config.options?.serverSelectionTimeoutMS
      });

      this.client = new MongoClient(this.config.connectionString, this.config.options);
      await this.client.connect();

      // Test the connection
      await this.client.db('admin').command({ ping: 1 });
      
      this.db = this.client.db(this.config.databaseName);

      logger.info('Successfully connected to MongoDB', {
        databaseName: this.config.databaseName
      });

      // Setup connection event handlers
      this.setupEventHandlers();

    } catch (error) {
      logger.error('Failed to connect to MongoDB', {
        error: (error as Error).message,
        databaseName: this.config.databaseName
      });

      // Clean up on connection failure
      if (this.client) {
        try {
          await this.client.close();
        } catch (closeError) {
          logger.warn('Error closing failed MongoDB connection', {
            error: (closeError as Error).message
          });
        }
        this.client = null;
        this.db = null;
      }
      
      throw error;
    }
  }

  /**
   * Setup MongoDB client event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connectionPoolCreated', () => {
      logger.debug('MongoDB connection pool created');
    });

    this.client.on('connectionPoolClosed', () => {
      logger.debug('MongoDB connection pool closed');
    });

    this.client.on('serverHeartbeatSucceeded', () => {
      logger.debug('MongoDB server heartbeat succeeded');
    });

    this.client.on('serverHeartbeatFailed', (event) => {
      logger.warn('MongoDB server heartbeat failed', {
        connectionId: event.connectionId,
        error: event.failure?.message
      });
    });

    this.client.on('topologyDescriptionChanged', (event) => {
      logger.info('MongoDB topology changed', {
        previousType: event.previousDescription.type,
        newType: event.newDescription.type
      });
    });
  }

  /**
   * Get the MongoDB database instance
   */
  async getDatabase(): Promise<Db> {
    await this.connect();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    
    return this.db;
  }

  /**
   * Get the MongoDB client instance
   */
  async getClient(): Promise<MongoClient> {
    await this.connect();
    
    if (!this.client) {
      throw new Error('MongoDB client not connected');
    }
    
    return this.client;
  }

  /**
   * Check if the connection is established
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Test the database connection
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }

      if (!this.client) {
        return false;
      }

      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      logger.error('MongoDB ping failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get database connection stats
   */
  async getConnectionStats(): Promise<{
    isConnected: boolean;
    databaseName: string;
    serverStatus?: any;
    collectionNames?: string[];
  }> {
    const stats = {
      isConnected: this.isConnected(),
      databaseName: this.config.databaseName,
      serverStatus: undefined as any,
      collectionNames: undefined as string[] | undefined
    };

    try {
      if (this.isConnected()) {
        const db = await this.getDatabase();
        
        // Get server status
        stats.serverStatus = await db.admin().serverStatus();
        
        // Get collection names
        const collections = await db.listCollections().toArray();
        stats.collectionNames = collections.map(col => col.name);
      }
    } catch (error) {
      logger.warn('Failed to get connection stats', {
        error: (error as Error).message
      });
    }

    return stats;
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      logger.info('Closing MongoDB connection');
      
      try {
        await this.client.close();
        logger.info('MongoDB connection closed successfully');
      } catch (error) {
        logger.error('Error closing MongoDB connection', {
          error: (error as Error).message
        });
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  /**
   * Create a new MongoDBConnection instance from environment variables
   */
  static fromEnvironment(overrides: Partial<MongoDBConfig> = {}): MongoDBConnection {
    const config: MongoDBConfig = {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      databaseName: process.env.MONGODB_DATABASE_NAME || 'gigateer',
      ...overrides
    };

    return new MongoDBConnection(config);
  }
}