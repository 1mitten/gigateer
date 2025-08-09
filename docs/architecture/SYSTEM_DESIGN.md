# Gigateer System Architecture

## Overview
Gigateer is a comprehensive gig aggregation platform that scrapes multiple event sources, normalizes data into a common schema, and provides a Progressive Web App (PWA) interface for browsing live music events. The system is built as a TypeScript monorepo using pnpm workspaces with clear separation between data ingestion and presentation layers.

## Current Architecture (v1 - Production)

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Gigateer Platform                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Data Sources  │    Processing   │        Presentation         │
│                 │                 │                             │
│ • RSS Feeds     │ • Ingestor      │ • Next.js PWA              │
│ • iCal Files    │   Service       │ • API Routes               │
│ • HTML Pages    │ • Plugin        │ • React Components         │
│ • Public APIs   │   Architecture  │ • Service Worker           │
│                 │ • Scheduling    │ • Offline Support          │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Detailed System Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Data Sources  │    │    Ingestor Service  │    │   Web App (PWA) │
│                 │    │                      │    │                 │
│ RSS Feeds:      │───▶│ Plugin System:       │───▶│ Frontend:       │
│ • Bandsintown   │    │ • RSS/iCal Parser    │    │ • Next.js 14    │
│ • Eventbrite    │    │ • HTML Scraper       │    │ • App Router     │
│ • SongKick      │    │ • API Client         │    │ • TypeScript     │
│                 │    │ • Rate Limiter       │    │ • Tailwind CSS   │
│ HTML Sites:     │    │                      │    │                 │
│ • Venue Sites   │    │ Core Processing:     │    │ Backend:        │
│ • Calendar Pages│    │ • Data Validation    │    │ • API Routes     │
│                 │    │ • Deduplication      │    │ • File System    │
│ API Endpoints:  │    │ • Content Hashing    │    │ • Caching Layer  │
│ • Ticketmaster  │    │ • Change Detection   │    │ • Search/Filter  │
│ • Eventbrite    │    │ • Schema Validation  │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│ External APIs/  │    │   File Storage       │    │ User Interface  │
│ Web Resources   │    │                      │    │                 │
│                 │    │ sources/:            │    │ • Gig Listings  │
│ • Rate Limited  │    │   bandsintown.json   │    │ • Search/Filter │
│ • Respectful    │    │   eventbrite.json    │    │ • Responsive    │
│   Scraping      │    │   venue1.json        │    │ • Offline Mode  │
│                 │    │   ...                │    │ • PWA Install   │
│                 │    │                      │    │                 │
│                 │    │ catalog.json         │    │ • Real-time     │
│                 │    │ (merged, deduplicated│    │   Updates       │
│                 │    │  master catalog)     │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

## Detailed Component Design

### Data Ingestion Service

**Architecture**: Plugin-based system with configurable scheduling

**Core Components**:
- **Plugin Loader**: Dynamically loads scraper plugins from `/src/plugins/`
- **Scheduler**: Cron-based scheduling with staggered execution
- **Rate Limiter**: Global and per-source rate limiting using Bottleneck
- **Change Detector**: Content-based change detection to avoid unnecessary processing
- **File Manager**: Atomic file operations with locking

**Plugin Types Implemented**:
```typescript
// RSS/Atom Feed Scrapers
- BandsintownRSSScraperPlugin
- RSS/iCal hybrid scrapers for venue calendars

// HTML Web Scrapers  
- PlaywrightHTMLScraper (for dynamic content)
- VenueWebsiteScraper (for static HTML)

// API Client Scrapers
- EventbriteAPIPlugin
- Future: TicketmasterAPI, SongkickAPI

// Custom Protocol Scrapers
- iCalendar feed parsers
- Venue-specific calendar formats
```

**Data Processing Pipeline**:
```
Raw Data → Validation → Normalization → Deduplication → Merge → Catalog
```

### Web Application (PWA)

**Framework**: Next.js 14 with App Router

**Key Features**:
- **Progressive Web App**: Full offline support, app-like experience
- **Server-Side Rendering**: SEO optimization and fast initial loads  
- **API Routes**: RESTful endpoints for data access
- **Real-time Search**: Client-side filtering and search
- **Responsive Design**: Mobile-first, works on all screen sizes

**API Endpoints**:
```typescript
GET /api/gigs              // Paginated gig listings with filtering
GET /api/gigs/[id]         // Individual gig details  
GET /api/meta              // Catalog metadata and statistics
```

**PWA Features**:
- Service Worker for offline caching
- Web App Manifest for native app installation
- Background sync for data updates
- Push notification support (future)

### Data Layer (v1 - File-based)

**Storage Strategy**: JSON files with atomic writes and caching

**File Structure**:
```
/data/
├── sources/              # Raw scraped data (one file per source)
│   ├── bandsintown.json
│   ├── eventbrite.json
│   ├── venue-calendar.json
│   └── ...
├── catalog.json          # Merged, deduplicated master catalog
├── catalog.meta.json     # Metadata: timestamps, stats, health
└── run-logs/            # Execution logs and status
    ├── ingestor.log
    ├── ingestor.pid
    └── health-check.json
```

**Caching Strategy**:
- In-memory caching with TTL (5 minutes default)
- File modification time checking
- Etag-based HTTP caching for API responses

**Data Validation**: 
- Zod schemas ensure runtime type safety
- Schema validation at ingestion and API serving
- Graceful handling of invalid/malformed data

## Data Flow Detailed

### 1. Data Ingestion Flow

```
External Source → Scraper Plugin → Raw Data → Validation → Normalized Data
     ↓                ↓              ↓           ↓              ↓
Rate Limiting → Error Handling → Schema Check → Sanitization → Source File
     ↓                ↓              ↓           ↓              ↓
Scheduler → Plugin Loader → File Writer → Change Detection → Merge Process
     ↓                ↓              ↓           ↓              ↓
Cron Trigger → Execute Batch → Atomic Write → Hash Compare → Catalog Update
```

**Key Processing Steps**:
1. **Scraping**: Plugin fetches data with rate limiting and error handling
2. **Validation**: Zod schema validation ensures data integrity
3. **Normalization**: Convert to standard `Gig` schema format
4. **Deduplication**: Content-based hashing prevents duplicates
5. **Merging**: Combine all sources into master catalog
6. **Indexing**: Generate search indexes and metadata

### 2. API Request Flow

```
HTTP Request → Next.js Router → API Route → Cache Check → File Read
     ↓              ↓             ↓          ↓           ↓
Parameters → Route Handler → Validation → Cache Hit/Miss → JSON Parse
     ↓              ↓             ↓          ↓           ↓  
Filtering → Business Logic → Response → In-Memory Cache → HTTP Response
```

### 3. PWA Offline Flow

```
Online Request → Service Worker → Cache Check → Network Fallback
     ↓               ↓              ↓             ↓
User Action → Intercept Request → Cached Response → Update Cache
     ↓               ↓              ↓             ↓
Offline Mode → Background Sync → Queue Request → Process When Online
```

## Schema Design

### Core Data Schema

```typescript
interface Gig {
  id: string;              // Content-based hash ID
  title: string;           // Event title
  artist: string;          // Primary artist/performer
  venue: string;           // Venue name
  location: string;        // "City, State" format
  date: string;            // ISO 8601 datetime
  description?: string;    // Event description
  url: string;             // Original event URL
  imageUrl?: string;       // Event image URL
  price?: string;          // Price information
  genre?: string;          // Music genre category
  source: string;          // Source identifier
  createdAt: string;       // When first scraped
  updatedAt: string;       // Last update time
}

interface Catalog {
  version: string;         // Schema version
  generatedAt: string;     // Catalog generation time
  sources: SourceInfo[];   // Source metadata
  gigs: Gig[];            // All gigs array
  statistics: CatalogStats; // Aggregate statistics
}
```

### Plugin Interface

```typescript
interface ScraperPlugin {
  name: string;           // Unique plugin identifier
  displayName: string;    // Human-readable name
  description: string;    // Plugin description
  version: string;        // Plugin version
  
  scrape(config: IngestorConfig): Promise<ScraperResult>;
  validateConfig?(config: IngestorConfig): Promise<string[]>;
  healthCheck?(): Promise<HealthStatus>;
}
```

## Scalability & Performance

### Current Limitations (v1)
- **File Size**: Catalog performance degrades > 50MB (~50k gigs)
- **Memory Usage**: Full catalog loaded into memory (~5-25MB)
- **Concurrent Access**: Single writer, multiple readers via file locking
- **Search Performance**: Linear search through all records

### Performance Optimizations Implemented
- **Atomic File Operations**: Prevent corruption during writes
- **In-Memory Caching**: Avoid repeated file system reads  
- **Change Detection**: Only process modified sources
- **Lazy Loading**: Progressive loading of images and content
- **HTTP Caching**: Etag and Cache-Control headers
- **Service Worker Caching**: Offline data availability

### Migration Thresholds (Database v2)
Migrate to PostgreSQL when:
- API response time > 500ms consistently
- Catalog file size > 50MB
- Memory usage > 100MB
- Gig count > 50,000
- Concurrent users > 1,000

## Security & Ethics Implementation

### Respectful Scraping
- **Rate Limiting**: Global limits + per-source limits
- **Random Delays**: Prevent predictable request patterns
- **robots.txt Compliance**: Check and respect robots.txt files
- **User Agent Rotation**: Avoid blocking by appearing too bot-like
- **Retry Strategies**: Exponential backoff on failures

### Data Privacy
- **No Personal Data**: Only public event information
- **Source Attribution**: Always link back to original source
- **Opt-out Support**: Mechanism for venues to request removal
- **GDPR Compliance**: No personal data collection

### Error Handling & Resilience
- **Graceful Degradation**: Continue operating with partial failures
- **Circuit Breakers**: Stop hitting failing sources temporarily
- **Comprehensive Logging**: Detailed logs for debugging
- **Health Monitoring**: Regular health checks on all sources
- **Rollback Capabilities**: Keep previous data versions

## Deployment Architecture

### Current (v1) Deployment Options

**Option 1: Cloud Platform (Vercel/Railway)**
```
Vercel (Web App) + Railway (Ingestor) + File Storage
├── Next.js App deployed to Vercel edge network
├── Ingestor service on Railway with persistent storage
└── Data files synchronized via cloud storage
```

**Option 2: VPS/Self-hosted**
```  
Single Server Deployment
├── PM2 process management
├── Nginx reverse proxy 
├── SSL with Let's Encrypt
└── Local file system storage
```

**Option 3: Docker**
```
Docker Compose Setup
├── Web container (Next.js)
├── Ingestor container (Node.js)
├── Shared volume for data files
└── Nginx proxy container
```

## Monitoring & Observability

### Key Metrics Tracked
- **Scraping Success Rate**: % successful scrapes per source
- **Data Quality**: Schema validation pass rate
- **API Performance**: Response times, error rates
- **PWA Usage**: Installation rate, offline usage
- **System Health**: Memory usage, file sizes, error counts

### Logging Strategy
- **Structured Logging**: JSON format with consistent fields
- **Log Levels**: Debug/Info for dev, Warn/Error for production
- **Log Rotation**: Automatic cleanup of old logs
- **Error Aggregation**: Collect and analyze error patterns

### Health Checks
- **Source Health**: Regular connectivity and data quality checks
- **System Health**: Memory, disk space, response times
- **Data Freshness**: Alert if data becomes stale
- **API Health**: Endpoint availability and performance

## Future Enhancements (v2 Database Migration)

### Database Schema (PostgreSQL)
```sql
-- Core gigs table with full-text search
CREATE TABLE gigs (
    id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    venue TEXT NOT NULL,
    location TEXT,
    date TIMESTAMPTZ NOT NULL,
    description TEXT,
    url TEXT UNIQUE,
    image_url TEXT,
    price TEXT,
    genre TEXT,
    source TEXT NOT NULL,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_venue ON gigs(venue);
CREATE INDEX idx_gigs_location ON gigs(location);
CREATE INDEX idx_gigs_genre ON gigs(genre);
CREATE INDEX idx_gigs_search ON gigs USING gin(search_vector);
CREATE INDEX idx_gigs_source_date ON gigs(source, date);
```

### Enhanced Features (v2)
- **Advanced Search**: Full-text search with PostgreSQL
- **Geographic Search**: PostGIS for location-based queries
- **User Accounts**: Favorites, notifications, personalization
- **Mobile App**: React Native sharing components with web
- **Analytics Dashboard**: Detailed metrics and insights
- **Admin Interface**: Content management and monitoring

---

For detailed implementation information, see:
- [Development Guide](../user-guides/DEVELOPMENT.md)
- [API Documentation](../api/ENDPOINTS.md)
- [Architecture Decision Records](../decisions/)