# Development Guide

This guide covers everything you need to know to develop and contribute to Gigateer.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 20.0.0 or higher
  ```bash
  node --version  # Should be v20.x.x or higher
  ```

- **pnpm**: Version 8.15.0 or higher (package manager)
  ```bash
  npm install -g pnpm@latest
  pnpm --version  # Should be 8.15.0 or higher
  ```

- **Git**: For version control
  ```bash
  git --version
  ```

### Optional but Recommended

- **VS Code**: With TypeScript and ESLint extensions
- **Chrome/Edge**: For debugging PWA features
- **MongoDB**: For scraper configuration management and data storage
- **Docker**: For containerized development (future enhancement)

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd gigateer

# Install all dependencies
pnpm install

# Build all packages (contracts, etc.)
pnpm build
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration for development
nano .env
```

Key development environment variables:
```bash
NODE_ENV=development
INGESTOR_MODE=development
INGESTOR_DEFAULT_SCHEDULE="*/10 * * * *"  # Every 10 minutes
INGESTOR_LOG_LEVEL=debug
NEXT_PUBLIC_PWA_ENABLED=true
```

### 3. Initial Data Setup

```bash
# Create initial data directories
mkdir -p data/sources data/run-logs

# Run scrapers to get initial data
pnpm ingest:all

# This will create:
# - data/sources/*.json (raw scraper outputs)
# - data/catalog.json (merged, deduplicated)
# - data/run-logs/ (ingestion logs)
```

### 4. Start Development Services

```bash
# Option 1: Start all services at once
pnpm dev

# Option 2: Start services individually (in separate terminals)
pnpm --filter web dev         # Web app on http://localhost:3000
pnpm --filter ingestor dev    # Ingestor CLI interface
```

## Project Structure

```
gigateer/
├── apps/web/                          # Next.js Progressive Web App
│   ├── src/app/                       # App Router (Next.js 14)
│   │   ├── api/                       # API routes
│   │   │   ├── gigs/                  # Gig listing and detail endpoints
│   │   │   └── meta/                  # Metadata endpoint
│   │   ├── gig/[id]/                  # Individual gig pages
│   │   ├── layout.tsx                 # Root layout with PWA setup
│   │   └── page.tsx                   # Home page
│   ├── src/components/                # React components
│   │   ├── filters/                   # Filter components
│   │   ├── gigs/                      # Gig display components
│   │   ├── search/                    # Search components
│   │   ├── ui/                        # Base UI components
│   │   └── pages/                     # Page-level components
│   ├── src/hooks/                     # Custom React hooks
│   ├── src/lib/                       # Utilities and helpers
│   └── src/types/                     # TypeScript definitions
├── packages/contracts/                # Shared types and schemas
├── services/ingestor/                 # Data ingestion service
│   ├── src/plugins/                   # Scraper implementations
│   ├── src/                          # Core ingestor logic
│   └── dist/                         # Compiled JavaScript
├── data/                             # Generated data (gitignored)
│   ├── sources/                      # Raw scraped JSON files
│   ├── catalog.json                  # Merged master catalog
│   └── run-logs/                     # Execution logs
└── docs/                             # Documentation
```

### Key Files to Know

- **Root Configuration**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- **Web App Entry**: `apps/web/src/app/page.tsx`
- **API Routes**: `apps/web/src/app/api/`
- **Shared Types**: `packages/contracts/src/`
- **Ingestor CLI**: `services/ingestor/src/cli.ts`
- **Scraper Plugins**: `services/ingestor/src/plugins/`
- **Scraper Configs**: `services/ingestor/data/scraper-configs/`
- **Scripts**: `scripts/` (includes MongoDB import tools)

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes...
# Run tests frequently
pnpm test

# Lint and type-check
pnpm lint
pnpm typecheck
```

### 2. Working with Scrapers

```bash
# Create new scraper from template
cp services/ingestor/src/plugins/example-venue.ts \
   services/ingestor/src/plugins/my-venue.ts

# Edit the scraper
nano services/ingestor/src/plugins/my-venue.ts

# Test the scraper
pnpm ingest:source my-venue

# Check output
cat data/sources/my-venue.json

# Validate against schema
pnpm validate
```

### 3. Frontend Development

```bash
# Start web app in development mode
pnpm --filter web dev

# In another terminal, run tests in watch mode
pnpm --filter web test --watch

# Type checking
pnpm --filter web type-check
```

### 4. Data Flow Testing

```bash
# Full pipeline test
pnpm ingest:all    # Scrape all sources
pnpm merge         # Create catalog.json
pnpm validate      # Validate schemas

# Check web app updates
curl http://localhost:3000/api/gigs | jq '.'
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm --filter web test
pnpm --filter ingestor test

# Run tests in watch mode
pnpm --filter web test --watch
```

### Integration Tests

```bash
# Run scraper integration tests
pnpm --filter ingestor test -- --testPathPattern=integration

# Test API endpoints
curl -s http://localhost:3000/api/gigs | jq '.gigs | length'
curl -s http://localhost:3000/api/meta | jq '.'
```

### PWA Testing

```bash
# Start production build
pnpm --filter web build
pnpm --filter web start

# Test offline functionality:
# 1. Open http://localhost:3000 in Chrome
# 2. Open DevTools > Network > Throttling > Offline
# 3. Refresh page - should work offline
# 4. Check Application > Service Workers
```

### Manual Testing Checklist

- [ ] Scraping works for all enabled sources
- [ ] Data validation passes
- [ ] API endpoints return correct data
- [ ] Search and filtering work
- [ ] PWA installs correctly
- [ ] Offline functionality works
- [ ] Responsive design on mobile

## Debugging

### Web App Debugging

```bash
# Development mode with source maps
pnpm --filter web dev

# Debug API routes
curl -v http://localhost:3000/api/gigs
curl -v http://localhost:3000/api/gigs/some-gig-id
```

### Ingestor Debugging

```bash
# Verbose logging
INGESTOR_LOG_LEVEL=debug pnpm ingest:source bandsintown

# Check logs
tail -f data/run-logs/ingestor.log

# Validate specific file
pnpm --filter ingestor validate --file data/sources/bandsintown.json
```

### Common Debug Scenarios

**Scraper Not Working:**
```bash
# Test individual scraper with debug logging
DEBUG=* pnpm ingest:source problemsource

# Check network issues
curl -I https://example.com/feed.rss

# Validate output manually
cat data/sources/problemsource.json | jq '.'
```

**API Returning Empty Results:**
```bash
# Check if catalog exists and has data
ls -la data/catalog.json
cat data/catalog.json | jq '.gigs | length'

# Rebuild catalog
pnpm merge
```

**PWA Not Working:**
```bash
# Clear service worker cache
# In browser: DevTools > Application > Storage > Clear Storage

# Check service worker registration
# In browser: DevTools > Application > Service Workers

# Rebuild with clean cache
pnpm --filter web clean
pnpm --filter web build
```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use Zod schemas for runtime validation
- Prefer explicit return types for functions

### React Guidelines

- Use functional components with hooks
- Implement error boundaries for production
- Use lazy loading for heavy components
- Follow React performance best practices

### Naming Conventions

- **Files**: kebab-case (`gig-card.tsx`)
- **Components**: PascalCase (`GigCard`)
- **Functions**: camelCase (`fetchGigs`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Types**: PascalCase with `Type` suffix (`GigType`)

### Import Organization

```typescript
// 1. React and Next.js imports
import React from 'react';
import { NextRequest } from 'next/server';

// 2. Third-party libraries
import { z } from 'zod';
import clsx from 'clsx';

// 3. Internal imports (absolute paths preferred)
import { GigSchema } from '@gigateer/contracts';
import { GigCard } from '@/components/gigs/GigCard';

// 4. Relative imports
import './styles.css';
```

### ESLint and Prettier

Configuration is already set up. Run:

```bash
# Auto-fix linting issues
pnpm lint --fix

# Format code (if Prettier is configured)
pnpm format
```

## Troubleshooting

### Build Errors

**"Module not found" errors:**
```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild all packages
pnpm build
```

**TypeScript errors:**
```bash
# Check TypeScript configuration
pnpm typecheck

# Clear TypeScript cache
rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo
```

### Runtime Errors

**Port already in use:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm --filter web dev
```

**Permission errors (scrapers):**
```bash
# Check file permissions
ls -la data/
mkdir -p data/sources data/run-logs
chmod 755 data/
```

**Memory issues (large datasets):**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
```

### Data Issues

**No gigs showing up:**
```bash
# Check if catalog exists
ls -la data/catalog.json

# Run ingestion manually
pnpm ingest:all
pnpm merge

# Check API response
curl http://localhost:3000/api/gigs | jq '.gigs | length'
```

**Scraper failing:**
```bash
# Test individual scraper
pnpm ingest:source bandsintown

# Check logs
cat data/run-logs/ingestor.log | grep ERROR

# Validate output
pnpm validate
```

**Duplicate gigs:**
```bash
# Check deduplication logic
cat data/catalog.json | jq '.gigs | group_by(.id) | map(select(length > 1))'

# Force re-merge
rm data/catalog.json
pnpm merge
```

### Performance Issues

**Slow scraping:**
```bash
# Check rate limiting settings
cat .env | grep RATE_LIMIT

# Monitor network requests
DEBUG=* pnpm ingest:all 2>&1 | grep -i rate
```

**Slow web app:**
```bash
# Build in production mode for performance testing
pnpm --filter web build
pnpm --filter web start

# Check bundle size
pnpm --filter web build --analyze
```

### Environment Issues

**Environment variables not loading:**
```bash
# Check .env file exists
ls -la .env

# Validate environment
pnpm --filter ingestor config:show
```

**Development vs Production differences:**
```bash
# Check current mode
echo $NODE_ENV
echo $INGESTOR_MODE

# Test production settings locally
NODE_ENV=production INGESTOR_MODE=production pnpm dev
```

## Configuration Management

### MongoDB Scraper Configuration Import

**New Feature (Aug 2025)**: Manage scraper configurations in MongoDB.

```bash
# Import all scraper configurations to MongoDB
pnpm import:scraper-configs
```

**What it does:**
- Discovers all `.json` config files in multiple locations
- Imports to MongoDB collection `config_scraper`  
- Uses smart upserts with SHA-256 hash change detection
- Prevents duplicates with unique `sourceId` constraints
- Tracks import/update timestamps

**Environment Variables:**
```bash
MONGODB_CONNECTION_STRING=mongodb://localhost:27017  # Default
MONGODB_DATABASE_NAME=gigateer                      # Default
```

**View imported configurations:**
```bash
mongosh gigateer --eval "db.config_scraper.find({}, {sourceId: 1, 'site.name': 1})"
```

### Available Scripts Reference

```bash
# Core development
pnpm dev                          # Start all development servers
pnpm build                        # Build all packages
pnpm test                         # Run all tests

# Data ingestion
pnpm ingest:all                   # Run all scrapers
pnpm ingest:source <name>         # Run specific scraper
pnpm validate                     # Validate scraped data

# Configuration management (NEW)
pnpm import:scraper-configs       # Import scraper configs to MongoDB

# Individual package development
pnpm --filter web dev             # Web app only
pnpm --filter ingestor test       # Ingestor tests only
pnpm --filter contracts build     # Build contracts only
```

## Getting Help

1. **Check Documentation**: Comprehensive docs in `/docs/`
2. **Search Issues**: Look for similar problems in project issues
3. **Debug Logging**: Enable verbose logging with `DEBUG=*`
4. **Community**: Ask questions in project discussions
5. **Code Review**: Create draft PR for feedback on approach

## Contributing Back

1. **Fork and Branch**: Work on feature branches
2. **Test Thoroughly**: Add tests for new features
3. **Document Changes**: Update relevant documentation
4. **Follow Conventions**: Match existing code style
5. **Small PRs**: Keep changes focused and reviewable

---

For specific implementation details, see:
- [Adding Scrapers Guide](./ADDING_SCRAPERS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](../api/ENDPOINTS.md)
- [System Design](../architecture/SYSTEM_DESIGN.md)