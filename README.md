# Gigateer

A web-first, mobile-friendly PWA that aggregates live music/event "gigs" from multiple sources into a single searchable directory with advanced filtering by venue, location, date, and genre.

## Features

### 🎵 Data Aggregation
- **Multi-Source Scraping**: Collects gigs from RSS feeds, iCal calendars, venue websites, and APIs
- **Smart Deduplication**: Uses content hashing to merge identical events from multiple sources
- **Automated Updates**: Configurable cron scheduling for continuous data freshness
- **Plugin Architecture**: Easy-to-extend system for adding new data sources

### 📱 Progressive Web App (PWA)
- **Offline Support**: Browse cached gigs without internet connection
- **App-Like Experience**: Install directly from browser, full-screen experience
- **Push Notifications**: Optional update notifications for new gigs
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### 🔍 Advanced Search & Filtering
- **Real-Time Search**: Instant search across venue names, artists, and descriptions
- **Smart Filters**: Filter by date range, venue, location, and genre
- **Sorting Options**: Sort by date, venue, or relevance
- **Pagination**: Efficient loading of large datasets

### ⚡ Performance
- **Client-Side Caching**: Smart caching with configurable TTL
- **Lazy Loading**: Images and content load as needed
- **Service Worker**: Background sync and update management
- **Rate Limiting**: Respectful scraping with configurable limits

## Architecture

This is a monorepo using pnpm workspaces with the following structure:

```
gigateer/
├── apps/
│   └── web/                   # Next.js PWA (UI, API routes, SSR)
├── packages/
│   └── contracts/             # Shared TypeScript types & Zod schemas
├── services/
│   └── ingestor/              # Data ingestion service with plugins
└── data/
    ├── sources/               # Raw scraped data per source
    ├── catalog.json           # Merged, deduplicated master catalog
    └── run-logs/              # Ingestion logs and status
```

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript
- **Web Framework:** Next.js 14 with App Router
- **UI Framework:** React 18 with Tailwind CSS
- **PWA:** next-pwa with Workbox
- **Data Scraping:** Playwright, Cheerio, RSS/iCal parsers
- **Scheduling:** node-cron with distributed task management
- **Storage:** JSON files (v1) → PostgreSQL migration path (v2)
- **Monorepo:** pnpm workspaces + Turbo
- **Testing:** Jest with Playwright integration tests
- **Type Safety:** Zod schemas for runtime validation

## Prerequisites

- **Node.js:** 20.0.0 or higher
- **Package Manager:** pnpm 8.15.0 or higher
- **Browser:** Modern browser with ServiceWorker support for PWA features

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd gigateer

# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see Environment Variables section)
nano .env
```

### 3. Initial Data Setup

```bash
# Run scrapers to collect initial data
pnpm ingest:all

# Merge and validate data
pnpm merge
pnpm validate
```

### 4. Start Development

```bash
# Start all services in development mode
pnpm dev

# Or start individual services:
pnpm --filter web dev        # Web app only
pnpm --filter ingestor dev   # Ingestor service only
```

The web application will be available at `http://localhost:3000`.

## Available Scripts

### Root Level Commands
```bash
pnpm dev              # Start all services in development mode
pnpm build            # Build all packages and services for production
pnpm lint             # Lint all code across workspaces
pnpm test             # Run tests across all workspaces
pnpm typecheck        # Run TypeScript type checking
```

### Data Ingestion Commands
```bash
pnpm ingest:all                    # Run all enabled scrapers once
pnpm ingest:source <source-name>   # Run specific scraper (e.g., bandsintown)
pnpm merge                         # Merge all source data into catalog.json
pnpm validate                      # Validate schemas and data integrity
pnpm daemon                        # Start scheduled ingestion daemon
```

### Ingestor Management Commands
```bash
# From services/ingestor/ directory
pnpm stats                         # Show ingestion statistics
pnpm scheduler:status              # Check daemon status
pnpm scheduler:stop                # Stop running daemon
pnpm scheduler:list                # List all scheduled jobs
pnpm scheduler:health              # Health check for all sources
pnpm config:show                   # Display current configuration
pnpm config:validate               # Validate configuration
```

## Development Workflow

### 1. Adding New Data Sources
```bash
# Create new scraper plugin
cp services/ingestor/src/plugins/example-venue.ts services/ingestor/src/plugins/my-venue.ts

# Implement scraper logic
nano services/ingestor/src/plugins/my-venue.ts

# Test the scraper
pnpm ingest:source my-venue

# Validate output
pnpm validate
```

### 2. Frontend Development
```bash
# Start web app in development mode
pnpm --filter web dev

# Run component tests
pnpm --filter web test

# Type check components
pnpm --filter web type-check
```

### 3. Testing Changes
```bash
# Run all tests
pnpm test

# Test specific workspace
pnpm --filter ingestor test
pnpm --filter web test

# Integration tests
pnpm --filter ingestor test -- --testPathPattern=integration
```

### 4. Building for Production
```bash
# Build all packages
pnpm build

# Test production build locally
pnpm --filter web start
```

## Environment Variables

Create `.env` file in project root:

```bash
# Application Configuration
NODE_ENV=development                 # development | production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Ingestor Configuration
INGESTOR_MODE=development           # development | production
INGESTOR_DEFAULT_SCHEDULE="*/10 * * * *"  # Cron schedule (every 10 min in dev)
INGESTOR_STAGGER_MINUTES=5          # Minutes between scraper starts
INGESTOR_RATE_LIMIT_PER_MIN=60      # Global rate limit
INGESTOR_TIMEOUT_MS=30000           # Request timeout (30 seconds)

# Source Control (optional - comma separated)
INGESTOR_ENABLED_SOURCES=bandsintown,eventbrite
INGESTOR_DISABLED_SOURCES=venue-with-issues

# File Paths (optional - uses sensible defaults)
INGESTOR_RAW_DATA_DIR=./data/sources
INGESTOR_LOG_DIR=./data/run-logs

# PWA Configuration (optional)
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## API Documentation

The web app provides REST API endpoints:

- **GET `/api/gigs`** - List gigs with filtering and pagination
- **GET `/api/gigs/[id]`** - Get specific gig details
- **GET `/api/meta`** - Get catalog metadata and statistics

For detailed API documentation, see [`/docs/api/ENDPOINTS.md`](/docs/api/ENDPOINTS.md).

## Project Structure

```
gigateer/
├── apps/web/                          # Next.js PWA
│   ├── src/app/                       # App Router pages
│   ├── src/components/                # React components
│   ├── src/hooks/                     # Custom React hooks
│   ├── src/lib/                       # Utilities and helpers
│   └── src/types/                     # TypeScript type definitions
├── packages/contracts/                # Shared types and schemas
├── services/ingestor/                 # Data ingestion service
│   ├── src/plugins/                   # Scraper plugins
│   └── src/                          # Core ingestion logic
├── data/                             # Generated data files
│   ├── sources/                      # Raw scraped data
│   ├── catalog.json                  # Merged catalog
│   └── run-logs/                     # Ingestion logs
└── docs/                             # Project documentation
    ├── api/                          # API documentation
    ├── architecture/                 # System design docs
    ├── user-guides/                  # Developer guides
    └── decisions/                    # Architecture Decision Records
```

## Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │ -> │    Ingestor      │ -> │   catalog.json  │
│   - RSS feeds   │    │   - Scheduling   │    │   - Deduplicated│
│   - iCal feeds  │    │   - Rate limiting│    │   - Validated   │
│   - Website HTML│    │   - Error handling│   │   - Timestamped │
│   - APIs        │    │   - Plugins      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         |
                                                         v
                                               ┌─────────────────┐
                                               │   Next.js Web   │
                                               │   - PWA         │
                                               │   - API routes  │
                                               │   - Caching     │
                                               │   - Search/Filter│
                                               └─────────────────┘
```

## Deployment

### Development Deployment
```bash
# Start development environment
pnpm dev

# Run in daemon mode (background ingestion)
pnpm daemon
```

### Production Deployment

For production deployment instructions, see [`/docs/user-guides/DEPLOYMENT.md`](/docs/user-guides/DEPLOYMENT.md).

## Contributing

1. **Code Style**: Follow TypeScript/ESLint configurations
2. **Testing**: Add tests for new features and scrapers
3. **Documentation**: Update relevant docs with changes
4. **Schema Changes**: Update Zod schemas in `packages/contracts`

For detailed development setup, see [`/docs/user-guides/DEVELOPMENT.md`](/docs/user-guides/DEVELOPMENT.md).

For adding new data sources, see [`/docs/user-guides/ADDING_SCRAPERS.md`](/docs/user-guides/ADDING_SCRAPERS.md).

## Performance Notes

- **Cold Start**: Initial scraping may take several minutes
- **Incremental Updates**: Subsequent runs are much faster due to change detection
- **Rate Limiting**: Respects `robots.txt` and implements conservative rate limits
- **Memory Usage**: Scales with number of concurrent scrapers (configure limits via environment)

## Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clear all build artifacts
pnpm clean
pnpm install
pnpm build
```

**Scraping Issues:**
```bash
# Check scraper health
pnpm scheduler:health

# View logs
cat data/run-logs/ingestor.log

# Test single source
pnpm ingest:source bandsintown
```

**PWA Issues:**
```bash
# Clear service worker cache
# In browser: DevTools > Application > Storage > Clear Storage

# Rebuild PWA
pnpm --filter web build
```

For more troubleshooting, see [`/docs/user-guides/DEVELOPMENT.md#troubleshooting`](/docs/user-guides/DEVELOPMENT.md#troubleshooting).

## License

MIT License - see [`LICENSE`](LICENSE) file for details.

---

**Built with ❤️ for the live music community**