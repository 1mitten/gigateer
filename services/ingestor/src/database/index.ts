// Database connection and management
export { MongoDBConnection, type MongoDBConfig } from './mongodb-connection.js';
export { DatabaseManager, type DatabaseConfig } from './database-manager.js';

// Schema definitions and data access
export { 
  DatabaseSchema,
  COLLECTIONS,
  type GigDocument,
  type PerformanceDocument,
  type ScraperRunDocument,
  type ErrorLogDocument
} from './schemas.js';

export { 
  DataAccessLayer,
  type GigQueryOptions,
  type BulkOperationResult
} from './data-access-layer.js';