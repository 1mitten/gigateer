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
pnpm merge                        # Create catalog.json
pnpm validate                     # Check data integrity

# Testing & Quality
pnpm test                         # Run all tests
pnpm lint                         # Lint all code
pnpm typecheck                    # TypeScript checking
```

### Before Task Completion (MANDATORY)
```bash
pnpm build && pnpm test          # Must pass both
```

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
cp exchange-bristol.json my-venue.json

# 2. Edit configuration (URL, selectors, mappings)

# 3. Test immediately  
pnpm ingest:source my-venue

# 4. Debug if needed (enable screenshots in config)
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
pnpm --filter ingestor test      # Business logic tests
pnpm test --coverage             # With coverage report
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

### Coverage Requirements
- **Minimum**: 70% overall, 80% for new code
- **Critical paths**: 95%+ (auth, payment, data ingestion)

## 🚨 Common Issues & Solutions

### Build Failures
- **TypeScript errors**: Fix before proceeding
- **Import/export mismatches**: Check interface definitions
- **Node.js ESM issues**: Ensure `"type": "module"` in package.json

### React Issues  
- **Hooks order errors**: All hooks before conditional logic
- **Hydration issues**: Use client-only components with `dynamic`
- **Performance**: Memoize expensive calculations, prevent re-renders

### Data Loading
- **Initial loading issues**: Check SSR vs client-side rendering
- **API timeout**: Increase timeout values, add retry logic
- **Infinite scroll**: Verify React Query configuration

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

## 🎯 Success Metrics

### Development Velocity
- New scrapers: JSON config only (minutes, not hours)
- Component development: Reuse existing patterns
- Bug fixes: Comprehensive tests prevent regressions

### Code Quality
- No duplicated logic across codebase
- Consistent patterns and naming conventions
- High test coverage (70%+ overall, 80%+ new code)
- Clean, readable, maintainable code

---

**💡 Quick Reference**: This file contains the essentials. For detailed implementation guides, see `/docs/user-guides/`.