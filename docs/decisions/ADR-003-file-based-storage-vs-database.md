# ADR-003: File-based Storage vs Immediate Database Implementation

**Date**: 2024-03-01  
**Status**: Accepted  
**Deciders**: Development Team  

## Context

Gigateer needs to store and serve aggregated gig data from multiple sources. The system requirements include:

- Fast read access for web application API endpoints
- Regular writes from the data ingestion service
- Data deduplication and merging capabilities
- Change detection and incremental updates
- Simple deployment and maintenance
- Future scalability to handle thousands of gigs

We need to decide between implementing a database immediately or starting with a file-based approach and migrating to a database later.

## Decision

We will implement **JSON file-based storage (v1)** with a **clear migration path to PostgreSQL (v2)**.

The initial implementation will use:
- Individual JSON files per data source in `/data/sources/`
- Merged and deduplicated master catalog in `/data/catalog.json`
- File-based change detection using timestamps and content hashing
- Direct file system reads for API endpoints with in-memory caching

## Options Considered

### Option 1: Immediate PostgreSQL Database

**Pros:**
- **Performance**: Optimized queries, indexing, concurrent access
- **ACID Transactions**: Data consistency guarantees
- **Scalability**: Handles large datasets efficiently
- **Query Flexibility**: Complex filtering and aggregation queries
- **Concurrent Access**: Multiple processes can safely read/write
- **Data Integrity**: Foreign key constraints, validation

**Cons:**
- **Setup Complexity**: Database installation, configuration, migrations
- **Deployment Overhead**: Additional infrastructure requirements
- **Development Speed**: Schema design, ORM setup, migration scripts
- **Operational Complexity**: Backup strategies, maintenance, monitoring
- **Over-engineering**: May be overkill for initial data volumes

### Option 2: JSON File Storage (Chosen)

**Pros:**
- **Simplicity**: No additional infrastructure required
- **Fast Development**: Direct JSON read/write operations
- **Easy Debugging**: Human-readable data files
- **Version Control**: Data changes can be tracked in git (for debugging)
- **Deployment Simplicity**: Just file system, no database setup
- **Backup Simplicity**: File system backups are straightforward
- **Atomic Writes**: Single file writes are atomic on most file systems

**Cons:**
- **Performance Limitations**: No indexing, full file reads required
- **Concurrent Access**: File locking needed for write operations
- **Scalability Limits**: Performance degrades with very large datasets
- **Query Limitations**: No SQL-like query capabilities
- **Memory Usage**: Large files must be loaded entirely into memory

### Option 3: SQLite

**Pros:**
- **Embedded Database**: No separate database server required
- **ACID Transactions**: Data consistency without infrastructure
- **SQL Queries**: Full SQL query capabilities
- **Performance**: Better than JSON files for complex queries
- **File-based**: Single database file, easy to backup

**Cons:**
- **Concurrent Writes**: Limited concurrent write access
- **Scalability**: Not suitable for high-concurrency scenarios
- **Migration Complexity**: Harder to migrate to PostgreSQL later
- **Schema Management**: Still requires migration scripts

### Option 4: NoSQL Database (MongoDB, etc.)

**Pros:**
- **Schema Flexibility**: JSON-like documents, easy schema evolution
- **Performance**: Good performance for read-heavy workloads
- **Scalability**: Better horizontal scaling than SQL databases

**Cons:**
- **Infrastructure**: Additional service to deploy and manage
- **Complexity**: Query language learning curve
- **Consistency**: Eventual consistency model may complicate deduplication
- **Team Expertise**: Less SQL knowledge applicable

## Detailed Analysis

### Current Data Characteristics

- **Volume**: 500-2000 gigs initially, growing to ~10,000 gigs over time
- **Write Pattern**: Batch updates every few hours from scrapers
- **Read Pattern**: API requests for paginated listings and individual gigs
- **Data Structure**: JSON documents with consistent schema
- **Query Patterns**: Filter by date, venue, location, genre; search by text

### Performance Projections

**JSON File Performance (Estimated):**
- **File Size**: ~1-5MB for 2000 gigs
- **Read Time**: ~10-50ms for full file read
- **Memory Usage**: ~5-25MB for in-memory caching
- **API Response**: ~20-100ms including filtering and pagination

These performance characteristics are acceptable for the initial user base and growth projections.

### File-based Implementation Strategy

```typescript
// Data structure
/data/
├── sources/              # Raw scraped data
│   ├── bandsintown.json  # Each source gets its own file
│   ├── eventbrite.json
│   └── venue1.json
├── catalog.json          # Merged, deduplicated master catalog
├── catalog.meta.json     # Metadata: last updated, source stats, etc.
└── run-logs/            # Ingestion logs and status
    └── ingestor.log
```

**Catalog Structure:**
```typescript
interface Catalog {
  version: string;
  generatedAt: string;
  sources: SourceMetadata[];
  gigs: Gig[];
  statistics: {
    totalGigs: number;
    gigsByGenre: Record<string, number>;
    gigsByLocation: Record<string, number>;
    dateRange: { earliest: string; latest: string };
  };
}
```

**Data Flow:**
1. **Scraping**: Each scraper writes to individual source files
2. **Merging**: Merge process reads all source files, deduplicates, writes catalog
3. **API**: Web app reads catalog.json, caches in memory with TTL
4. **Change Detection**: Compare file timestamps and content hashes

### Migration Path to Database

**Phase 1: Current File-based Implementation**
- Implement all core functionality with JSON files
- Optimize caching and performance
- Gather performance metrics and usage patterns

**Phase 2: Database Migration (Future)**
- Add database layer alongside file system
- Implement dual-write mode (files + database)
- Migrate read operations to database gradually
- Remove file dependencies once migration is complete

**Migration Implementation:**
```typescript
// Abstract data layer for easy migration
interface DataRepository {
  getAllGigs(): Promise<Gig[]>;
  getGigById(id: string): Promise<Gig | null>;
  getGigsByFilter(filter: GigFilter): Promise<PaginatedGigs>;
  updateCatalog(gigs: Gig[]): Promise<void>;
}

// File-based implementation (v1)
class FileDataRepository implements DataRepository {
  // Current JSON file implementation
}

// Database implementation (v2)
class DatabaseRepository implements DataRepository {
  // Future PostgreSQL implementation
}
```

## Implementation Details

### File Operations

**Safe Atomic Writes:**
```typescript
async function writeJSONFile(path: string, data: any): Promise<void> {
  const tempPath = `${path}.tmp`;
  
  // Write to temporary file first
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  
  // Atomic rename (most file systems guarantee this is atomic)
  await fs.rename(tempPath, path);
}
```

**Caching Strategy:**
```typescript
class CatalogCache {
  private cache: Catalog | null = null;
  private lastModified: Date | null = null;
  private ttl = 5 * 60 * 1000; // 5 minutes

  async getCatalog(): Promise<Catalog> {
    const stats = await fs.stat(CATALOG_PATH);
    
    if (this.cache && this.lastModified && 
        stats.mtime <= this.lastModified && 
        Date.now() - this.lastModified.getTime() < this.ttl) {
      return this.cache;
    }

    const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
    this.cache = catalog;
    this.lastModified = stats.mtime;
    
    return catalog;
  }
}
```

**Concurrent Access Control:**
```typescript
import { Mutex } from 'async-mutex';

class FileManager {
  private writeMutex = new Mutex();

  async safeWrite<T>(path: string, data: T): Promise<void> {
    return this.writeMutex.runExclusive(async () => {
      await writeJSONFile(path, data);
    });
  }
}
```

### Deduplication Strategy

```typescript
function deduplicateGigs(gigs: Gig[]): Gig[] {
  const seen = new Map<string, Gig>();
  
  for (const gig of gigs) {
    const key = generateDupeKey(gig);
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, gig);
    } else {
      // Merge duplicate gig data, preferring more complete information
      seen.set(key, mergeDuplicateGigs(existing, gig));
    }
  }
  
  return Array.from(seen.values());
}

function generateDupeKey(gig: Gig): string {
  // Normalize for comparison
  const normalizedTitle = gig.title.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedVenue = gig.venue.toLowerCase().replace(/\s+/g, ' ').trim();
  const date = new Date(gig.date).toDateString();
  
  return `${normalizedTitle}|${normalizedVenue}|${date}`;
}
```

## Risk Analysis and Mitigation

### Identified Risks

1. **Performance Degradation**: As data grows, JSON file reads become slower
   - **Mitigation**: Monitor performance metrics, implement migration trigger
   - **Threshold**: If API response times exceed 500ms consistently

2. **File Corruption**: Risk of data loss due to file corruption
   - **Mitigation**: Implement backup rotation and validation checks
   - **Strategy**: Keep last 7 days of catalog backups

3. **Concurrent Access Issues**: Multiple processes writing simultaneously
   - **Mitigation**: Implement file locking and atomic write operations
   - **Strategy**: Use single ingestor process, web app only reads

4. **Memory Usage**: Large files consume significant memory when cached
   - **Mitigation**: Implement streaming JSON parsing for large files
   - **Threshold**: If memory usage exceeds 100MB, optimize or migrate

### Monitoring and Alerting

```typescript
interface PerformanceMetrics {
  catalogLoadTime: number;
  catalogFileSize: number;
  memoryUsage: number;
  apiResponseTime: number;
  gigCount: number;
}

// Metrics collection
function collectMetrics(): PerformanceMetrics {
  // Implement metrics collection
}

// Migration triggers
function shouldMigrateToDatabase(metrics: PerformanceMetrics): boolean {
  return metrics.apiResponseTime > 500 ||  // 500ms API response
         metrics.catalogFileSize > 50_000_000 || // 50MB file size
         metrics.gigCount > 50_000; // 50k gigs
}
```

## Success Criteria

### Performance Targets (File-based)
- **API Response Time**: <200ms for 95th percentile
- **Catalog Load Time**: <100ms
- **Memory Usage**: <50MB for cached data
- **File Size**: <10MB for catalog.json

### Migration Triggers
- API response time consistently >500ms
- Catalog file size >50MB
- Memory usage >100MB
- Gig count >50,000
- User complaints about performance

## Future Database Implementation

### PostgreSQL Schema Design (Future v2)

```sql
-- Gigs table
CREATE TABLE gigs (
    id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    venue TEXT NOT NULL,
    location TEXT,
    date TIMESTAMPTZ NOT NULL,
    description TEXT,
    url TEXT,
    image_url TEXT,
    price TEXT,
    genre TEXT,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_venue ON gigs(venue);
CREATE INDEX idx_gigs_location ON gigs(location);
CREATE INDEX idx_gigs_genre ON gigs(genre);
CREATE INDEX idx_gigs_source ON gigs(source);
CREATE INDEX idx_gigs_search ON gigs USING gin(to_tsvector('english', title || ' ' || description));

-- Sources metadata table
CREATE TABLE sources (
    name VARCHAR(50) PRIMARY KEY,
    display_name TEXT NOT NULL,
    last_scraped TIMESTAMPTZ,
    gig_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'unknown'
);
```

## References

- [JSON Performance Best Practices](https://v8.dev/blog/cost-of-javascript-2019)
- [Node.js File System Performance](https://nodejs.org/api/fs.html#file-system-flags)
- [PostgreSQL Performance Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [Atomic File Operations](https://rcrowley.org/2010/01/06/things-unix-can-do-atomically.html)
- [Database Migration Strategies](https://martinfowler.com/articles/evodb.html)

---

**Next Review**: 3 months after implementation or when performance thresholds are approached  
**Review Criteria**: Performance metrics, user growth, developer experience, operational complexity