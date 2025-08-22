# CLAUDE.md - Quick Reference Guide

## 🚀 Core Principles

### 1. Think First, Act Second
- Analyze full scope → Identify parallel tasks → Plan execution order → Consider dependencies

### 2. DRY & Code Quality (MANDATORY)
- **Centralize config** in dedicated files (not scattered hardcoded values)
- **Extract patterns** into reusable components/utilities  
- **Single source of truth** for all data/logic
- **Type safety** with shared interfaces

### 3. Parallel Execution Strategy
Use multiple agents concurrently for independent tasks. Sequential only when dependencies exist.

## 🛠️ Project Commands

### Daily Development
```bash
# CRITICAL: Always build first
pnpm build                        # Must pass before any work!

# Start services  
pnpm dev                          # All development services
pnpm --filter web dev             # Just Next.js app

# Data ingestion (most common)
pnpm ingest:all                   # Run all scrapers
pnpm ingest:source <name>         # Run specific scraper  
node packages/dedupe/dist/cli.js generate  # Create catalog.json
pnpm validate                     # Check data integrity

# Configuration Management
pnpm import:scraper-configs       # Import scraper configs to MongoDB

# Testing & Quality
pnpm test                         # Run all tests
pnpm lint                         # Lint all code
pnpm typecheck                    # TypeScript checking
```

### Before Task Completion (MANDATORY)
```bash
pnpm build && pnpm test          # Must pass both
```

### After Code Modifications (MANDATORY)
**ALWAYS verify tests pass after ANY code changes:**
```bash
# Run specific package tests during development
pnpm --filter <package-name> test    # Test specific package (runs once, exits)
pnpm --filter contracts test         # Example: contracts package
pnpm --filter ingestor test          # Example: ingestor service

# Full validation before commit/PR
pnpm test                            # All tests must pass (runs once, exits)

# Watch mode for active development (optional)
pnpm --filter web test:watch         # Vitest watch mode for web package
```

**Test Failure Protocol:**
1. **Never ignore failing tests** - Fix immediately
2. **Run tests after every significant change** - Don't batch fixes  
3. **Check all affected packages** - Changes to contracts affect everything
4. **Validate external dependencies** - Some tests may fail due to network/DB unavailability (expected)

## 📋 Code Quality Checklist

**MANDATORY - Apply to EVERY code change:**

### ✅ DRY Review
- [ ] No duplicated logic/code blocks
- [ ] Constants centralized in config files  
- [ ] Single source of truth for data/logic
- [ ] Consistent patterns used

### ✅ Configuration
- [ ] Settings in `/src/config/` files
- [ ] Environment variables for deployment values
- [ ] Default values defined once
- [ ] No hardcoded magic numbers/strings

### ✅ Type Safety
- [ ] Shared interfaces imported (not redefined)
- [ ] Consistent naming: `camelCase` vars, `PascalCase` types, `UPPER_CASE` constants
- [ ] No `any` types
- [ ] All types exported properly

### ✅ Component Quality  
- [ ] Single responsibility per component/function
- [ ] Business logic separated from UI
- [ ] Error handling with user-friendly messages
- [ ] Performance optimized (memoization, re-renders)

### ✅ Testing Requirements (MANDATORY)
- [ ] **Run tests after EVERY code change** - `pnpm test`
- [ ] **Test specific packages during development** - `pnpm --filter <package> test`
- [ ] **All tests must pass before commit/PR** - Zero tolerance for failing tests
- [ ] **Fix broken tests immediately** - Don't let them accumulate
- [ ] **Verify cross-package impacts** - Changes to `contracts` affect all packages

## 🎯 Available Agents

### Core Development
- **`general-purpose`** - Complex research, multi-step tasks, keyword searches, **Playwright browser automation**
- **`react-ui-developer`** - React components, UI/UX, test fixes, hooks conversion  
- **`backend-architect`** - API design, database architecture, auth systems, **scraper development with Playwright**
- **`architecture-optimizer`** - System performance, bottleneck analysis

### Specialized  
- **`security-penetration-tester`** - Vulnerability scans, OWASP testing, security audits, **Playwright testing**
- **`qa-specialist`** - End-to-end testing, integration verification, quality review, **Playwright automation**
- **`documentation-maintainer`** - README updates, API docs, ADRs, formatting

## 🏗️ Tech Stack & Architecture

### Gigateer App
- **Stack**: Node 20+, TypeScript, Next.js 14, Tailwind CSS, PostgreSQL + Prisma
- **Storage**: JSON files (v1) → PostgreSQL migration path (v2)  
- **Architecture**: Monorepo with pnpm workspaces

### Key Directories
```
gigateer/
├── apps/web/                     # Next.js PWA (React UI)
├── packages/contracts/           # Shared TypeScript types & Zod schemas  
├── services/ingestor/            # Data scraping service
├── data/                         # Generated JSON data (gitignored)
└── docs/                         # All project documentation
```

## 🔧 Configuration-Driven Scrapers

**Revolutionary achievement (Jan 2025)**: Add scrapers with JSON only - no TypeScript required!

### Quick Scraper Creation
```bash
# 1. Create JSON config in services/ingestor/data/scraper-configs/
cp bristol-electric.json my-venue.json    # Latest example with Load More pagination

# 2. Edit configuration (URL, selectors, mappings)

# 3. Test immediately  
pnpm ingest:source my-venue

# 4. Import to MongoDB
pnpm import:scraper-configs

# 5. Debug if needed (enable screenshots in config)
```

### 🎭 Playwright MCP Integration for Scraper Development

**Available for all agents**: Claude can now use Playwright MCP server for advanced web scraping and browser automation.

#### Key Capabilities
- **Live browser interaction** - Navigate, click, type, inspect elements in real-time
- **Visual debugging** - Take screenshots and snapshots to understand page structure  
- **Element discovery** - Find selectors by interacting with live pages
- **Dynamic content handling** - Wait for JS-rendered content, handle SPAs
- **Network monitoring** - Track API calls and resource loading

#### Scraper Development Workflow
```bash
# 1. Use agent with Playwright to explore target website
# Agent navigates to site, takes snapshots, identifies selectors

# 2. Agent creates/updates JSON scraper config with discovered selectors
# Based on live page inspection and testing

# 3. Test scraper config immediately
pnpm ingest:source venue-name

# 4. Agent can debug failed scrapers by re-visiting pages with Playwright
# Visual inspection of changes, updated selectors, validation
```

#### Best Practices with Playwright
- **Visual-first approach**: Always take screenshots/snapshots before creating selectors
- **Test selectors live**: Verify selectors work on actual pages before saving to config
- **Handle dynamic content**: Use wait conditions for JS-heavy sites
- **Respect rate limits**: Use realistic delays between actions
- **Debug visually**: When scrapers fail, use Playwright to see what changed

### JSON vs Traditional Plugins
- **Configuration-driven (.json) + Playwright**: Modern, visual development with live testing ⚡
- **Traditional (.ts)**: Legacy approach for complex custom logic

## 🗄️ Configuration Management

### Scraper Config Import to MongoDB
**New Feature (Aug 2025)**: Automatic import of all scraper configurations to MongoDB with smart upsert functionality.

```bash
# Import all scraper configs to MongoDB collection 'config_scraper'
pnpm import:scraper-configs
```

**Features:**
- **Auto-discovery**: Finds all JSON configs in multiple locations
- **Smart upserts**: Uses SHA-256 hash to detect changes, prevents duplicates
- **Unique constraints**: `sourceId` field ensures no duplicate scrapers
- **Change tracking**: Preserves import timestamps, tracks updates
- **Error handling**: Graceful handling of missing fields and connection issues

**Use cases:**
- CI/CD integration for config deployment
- Configuration backup and versioning
- Centralized scraper management
- Production configuration synchronization

## 📊 MongoDB Setup

### Quick Start
```bash
./scripts/setup-mongo.sh --quick-start      # Development setup
mongoimport --db gigateer --collection gigs --file ./data/catalog.json --jsonArray
```

### Modes
- **File-based** (default): Uses JSON files - good for development  
- **Database**: Uses MongoDB - better performance for production

## 🧪 Testing Strategy (MANDATORY)

### Test Commands
```bash
pnpm test                         # All tests across monorepo
pnpm --filter web test           # React component tests  
pnpm --filter ingestor test      # Business logic & scraper health tests
pnpm test --coverage             # With coverage report
```

### 🏥 Scraper Health Monitoring
**New Feature (Aug 2025)**: Comprehensive health check system for monitoring scraper reliability.

#### Health Check System Features
- **Automated Testing**: Individual tests for all 8 Bristol scrapers (including bristol-electric)
- **Health Classification**: Healthy (≥2 records), Degraded (≥1 record), Failed (0 records)
- **Performance Monitoring**: Response time tracking and timeout detection
- **UI-Ready API**: RESTful endpoints for dashboard integration
- **Error Categorization**: Network errors, timeouts, parsing failures
- **Sample Data Preview**: Shows actual scraped event titles and venue info
- **Configuration Management**: MongoDB integration for scraper config storage

#### Running Health Checks
```bash
# Run all scraper health checks via Jest tests
pnpm --filter ingestor test --testPathPattern=health-check

# Test specific scrapers via API (requires Next.js server running)
curl "http://localhost:3000/api/scrapers/health?scraper=bristol-louisiana"

# Get comprehensive health report
curl "http://localhost:3000/api/scrapers/health"

# Test multiple specific scrapers
curl -X POST "http://localhost:3000/api/scrapers/health" \
  -H "Content-Type: application/json" \
  -d '{"scrapers": ["bristol-louisiana", "bristol-thekla"]}'
```

#### Health Status Interpretation
- **Healthy**: ≥2 records extracted, scraper working normally
- **Degraded**: 1 record extracted, may indicate site changes or issues
- **Failed**: 0 records extracted, scraper needs attention
- **Overall System Status**: 
  - Healthy: 0 failures, ≤1 degraded
  - Degraded: ≤2 failures 
  - Critical: >2 failures

#### Integration with Development Workflow
```bash
# Check scraper health before data updates
curl "http://localhost:3000/api/scrapers/health" | jq '.overallStatus'

# Run health check tests in CI/CD pipeline  
pnpm --filter ingestor test --testPathPattern=health-check --verbose

# Monitor individual scraper performance
curl "http://localhost:3000/api/scrapers/health?scraper=bristol-louisiana" | jq '.responseTime'
```

### 🎭 Playwright-Enhanced Testing
Use Playwright MCP for advanced scraper testing and validation:

```bash
# Example: Agent-driven scraper development
# 1. Agent uses Playwright to visit venue website
# 2. Agent takes snapshots and identifies selectors  
# 3. Agent creates JSON config with discovered selectors
# 4. Agent tests scraper: pnpm ingest:source new-venue
# 5. If issues found, agent re-visits with Playwright to debug
```

### ALWAYS Test For
- [ ] New components, functions, modules
- [ ] Bug fixes (test reproduces bug first)
- [ ] API endpoints & data processing
- [ ] Schema validation & transformation
- [ ] Error handling & edge cases
- [ ] **Scraper selectors** - Use Playwright to verify elements exist and data extracts correctly
- [ ] **Dynamic content** - Test with Playwright on JS-heavy sites to ensure proper waiting
- [ ] **Scraper health** - Run health checks after scraper changes to ensure they still extract data

### Coverage Requirements
- **Minimum**: 70% overall, 80% for new code
- **Critical paths**: 95%+ (auth, payment, data ingestion)

### Test Resilience Best Practices
**Our tests handle external dependencies gracefully:**
- **Network failures**: Tests skip gracefully when external services unavailable
- **Database connections**: MongoDB tests pass even when DB not running  
- **Timeouts**: All integration tests have appropriate timeout values
- **Error handling**: Tests catch and handle expected environmental failures

### Package-Specific Testing Notes
```bash
# Core packages (always test after changes)
pnpm --filter contracts test      # 31 tests - Zod schemas, utils
pnpm --filter dedupe test         # 130 tests - Deduplication logic  
pnpm --filter scraper test        # 80 tests - Scraping utilities
pnpm --filter ingestor test       # 32 tests - Data ingestion (may skip external deps)
pnpm --filter web test           # React component tests

# Current scrapers in production (as of Aug 2025)
# 8 active Bristol venue scrapers: bristol-electric, bristol-exchange, bristol-fleece,
# bristol-louisiana, bristol-strange-brew, bristol-the-croft, bristol-the-lanes, bristol-thekla
```

## 🚨 Common Issues & Solutions

### Build Failures
- **TypeScript errors**: Fix before proceeding
- **Import/export mismatches**: Check interface definitions
- **Node.js ESM issues**: Ensure `"type": "module"` in package.json

### Test Failures
- **Schema changes**: Update `contracts` package first, then affected packages
- **Missing fields**: Check if interfaces need new properties (e.g., `genre`, `price`)
- **Timeout errors**: Integration tests may timeout due to external services (expected)
- **Path resolution**: Tests change directory - verify CLI commands use correct paths
- **Jest config warnings**: Update deprecated `moduleNameMapping` to `moduleNameMapper`
- **Watch mode hanging**: Use `vitest run` instead of `vitest` for CI/automated testing

### React Issues  
- **Hooks order errors**: All hooks before conditional logic
- **Hydration issues**: Use client-only components with `dynamic`
- **Performance**: Memoize expensive calculations, prevent re-renders

### Data Loading & UI Issues
- **Initial loading issues**: Check SSR vs client-side rendering
- **API timeout**: Increase timeout values, add retry logic
- **Infinite scroll**: Verify React Query configuration
- **"No gigs listed" during loading**: Fixed in GigsGroupedList.tsx - ensure loading prop is passed correctly
- **Date filtering**: "All Dates" now shows today + future events only (excludes yesterday and earlier)
- **Empty states**: Only show when `!loading` to prevent flash messages during search/filter operations

## 📝 Project-Specific Patterns

### Data Flow
```
External Sources → Scraper Plugins → Raw JSON → Validation → catalog.json → API → React UI
```

### File Structure
- **Configuration**: All in `/src/config/` files
- **Components**: Single responsibility, reusable patterns
- **Business Logic**: Separated from UI in custom hooks/services
- **Error Handling**: Centralized patterns with user-friendly messages

### Environment Types
- **Development**: Frequent scraping (10min), verbose logging, higher rate limits
- **Production**: Conservative scraping (3hr), minimal logging, respectful rate limits

## 📚 Documentation Standards

### Location: `/docs` Folder Structure
```
/docs/
├── APP_PROPOSAL.md              # Main requirements
├── api/                         # API documentation  
├── architecture/                # System design
├── user-guides/                 # Setup & usage guides
└── decisions/                   # ADRs
```

### Update Triggers
- Code structure changes → Update architecture docs
- API modifications → Update endpoint docs  
- New dependencies → Update setup docs
- Best practices discovered → Update CLAUDE.md

## ⚡ Performance Optimizations

### React App
- **Memoization**: Expensive calculations in `useMemo`
- **Component splits**: Large components → smaller focused ones
- **Lazy loading**: Non-critical features code-split
- **Bundle optimization**: Remove unnecessary dependencies

### Data Processing
- **Batch processing**: Handle large datasets in chunks
- **Caching**: API responses with appropriate TTLs
- **Database indexing**: For frequently queried fields
- **Rate limiting**: Respect external service limits

## 🚨 Common Issues & Solutions

### Catalog Generation Issues
- **`pnpm merge` fails**: The `merge` command doesn't exist in the current CLI
- **Correct approach**: Use `node packages/dedupe/dist/cli.js generate` to create catalog.json
- **ESM module errors**: The dedupe CLI requires ESM imports with .js extensions
- **Missing data in catalog**: Run `pnpm build` first, then scrape sources, then generate catalog

### Data Not Appearing in Frontend
**Problem**: Scraped data exists but doesn't show in web app
**Solution**: 
```bash
# 1. Verify scraped data exists
ls data/sources/bristol-thekla.*

# 2. Generate catalog (includes deduplication)
node packages/dedupe/dist/cli.js generate --verbose

# 3. Start frontend (reads from catalog.json)
pnpm --filter web dev
```

### Scraper Issues
- **Only finding 1 event**: Check if selectors match current website structure
- **No events found**: Website may have changed - use Playwright MCP to inspect live page
- **Permission errors**: Remove problematic scrapers like bandsintown-rss-scraper.ts

## 🎯 Recent Achievements & Success Metrics

### Recent Major Updates (Aug 2025)
- ✅ **Bristol Electric Scraper**: New venue added with Load More pagination handling
- ✅ **MongoDB Config Import**: Automated scraper configuration management
- ✅ **UI Loading States**: Fixed "no gigs listed" flash during search operations
- ✅ **Date Filtering**: Improved "All Dates" logic to exclude past events properly
- ✅ **Image Hotlinking**: Removed gig image displays to prevent hotlinking issues

### Development Velocity
- New scrapers: JSON config only (minutes, not hours)
- Component development: Reuse existing patterns
- Bug fixes: Comprehensive tests prevent regressions
- Configuration management: Automated MongoDB import/sync

### Code Quality
- No duplicated logic across codebase
- Consistent patterns and naming conventions
- High test coverage (70%+ overall, 80%+ new code)
- Clean, readable, maintainable code
- Robust error handling and loading states

---

## 📚 Complete Documentation Reference

**💡 This file contains the essentials.** For detailed guides, see:

### 🚀 Getting Started
- [`/docs/user-guides/DEVELOPMENT.md`](./docs/user-guides/DEVELOPMENT.md) - Complete development setup and workflow
- [`/docs/user-guides/ADDING_SCRAPERS.md`](./docs/user-guides/ADDING_SCRAPERS.md) - **JSON configuration approach, MongoDB management, Playwright integration**
- [`/docs/user-guides/DEPLOYMENT.md`](./docs/user-guides/DEPLOYMENT.md) - Production deployment guide

### 🏗️ Architecture & Design
- [`/docs/architecture/SYSTEM_DESIGN.md`](./docs/architecture/SYSTEM_DESIGN.md) - Overall system architecture
- [`/docs/architecture/CONFIGURATION_DRIVEN_PLUGINS.md`](./docs/architecture/CONFIGURATION_DRIVEN_PLUGINS.md) - JSON config system design
- [`/docs/decisions/`](./docs/decisions/) - Architectural Decision Records (ADRs)

### 📖 Implementation Guides
- [`/docs/user-guides/SCRAPER_TRANSFORMATIONS.md`](./docs/user-guides/SCRAPER_TRANSFORMATIONS.md) - Advanced data transformation patterns
- [`/docs/user-guides/SCRAPER_HEALTH_MONITORING.md`](./docs/user-guides/SCRAPER_HEALTH_MONITORING.md) - Health check system
- [`/docs/user-guides/PLUGIN_MIGRATION_GUIDE.md`](./docs/user-guides/PLUGIN_MIGRATION_GUIDE.md) - TypeScript to JSON migration
- [`/scripts/README-scraper-config-import.md`](./scripts/README-scraper-config-import.md) - **MongoDB import script documentation**

### 🔌 API & Integration
- [`/docs/api/ENDPOINTS.md`](./docs/api/ENDPOINTS.md) - REST API documentation
- [`/docs/user-guides/API_USAGE.md`](./docs/user-guides/API_USAGE.md) - API usage examples

### 📋 Case Studies & Examples
- [`/docs/case-studies/EXCHANGE_BRISTOL_MIGRATION.md`](./docs/case-studies/EXCHANGE_BRISTOL_MIGRATION.md) - TypeScript to JSON migration example
- [`/docs/BRISTOL_SCRAPERS_IMPLEMENTATION.md`](./docs/BRISTOL_SCRAPERS_IMPLEMENTATION.md) - Bristol venues implementation
- [`/docs/BRISTOL_SCRAPERS_SUCCESS_SUMMARY.md`](./docs/BRISTOL_SCRAPERS_SUCCESS_SUMMARY.md) - Success metrics and achievements

### 📄 Project Information
- [`/docs/APP_PROPOSAL.md`](./docs/APP_PROPOSAL.md) - Original project requirements and scope

### 🆘 Always Check Documentation First
Before implementing features or making changes:
1. **Read CLAUDE.md** (this file) for quick reference
2. **Check relevant user guides** for detailed implementation steps
3. **Review architecture docs** for system design context
4. **Look at case studies** for real-world examples
5. **Use agents** with specific documentation context when needed