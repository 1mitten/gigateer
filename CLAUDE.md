# CLAUDE.md - Project Assistant Configuration

## Core Principles

### 1. Think First, Act Second
Before executing any task:
- Analyze the full scope of what needs to be done
- Identify independent subtasks that can be parallelized
- Plan the optimal execution order
- Consider dependencies between tasks

### 2. Parallel Agent Strategy
When handling complex tasks, identify opportunities for parallel execution:

#### Parallelizable Tasks
- **Code Analysis**: Multiple agents can simultaneously:
  - Search for different patterns/files
  - Analyze different modules
  - Review different aspects (security, performance, style)
  
- **Testing & Validation**: Run in parallel:
  - Unit tests
  - Integration tests
  - Linting
  - Type checking
  - Build verification

- **Documentation**: Concurrent work on:
  - API documentation
  - README updates
  - Code comments
  - Architecture docs

- **Multi-file Operations**: Process simultaneously:
  - Refactoring across multiple files
  - Search and replace operations
  - Dependency updates

#### Sequential Tasks (Cannot Parallelize)
- Tasks with dependencies (B requires A to complete first)
- Database migrations
- Git operations (commits, merges)
- Production deployments

## Task Execution Framework

### Step 1: Task Decomposition
```
1. Break down the main task into subtasks
2. Identify dependencies
3. Group independent tasks for parallel execution
4. Estimate time/complexity for each subtask
```

### Step 2: Agent Assignment
For each subtask, determine the best agent type:

## Available Agents

### 1. `general-purpose`
**Purpose**: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks.
**Tools**: All available tools (*)
**Best for**:
- Complex multi-step research tasks
- Keyword or file searches when not confident about finding matches quickly
- Tasks requiring extensive exploration
- General problem-solving that doesn't fit other specialized agents

### 2. `statusline-setup`
**Purpose**: Configure the user's Claude Code status line setting.
**Tools**: Read, Edit
**Best for**:
- Modifying status line configurations
- Adjusting Claude Code settings related to status display

### 3. `react-ui-developer`
**Purpose**: React frontend development, UI/UX improvements, and test maintenance.
**Tools**: All available tools (*)
**Best for**:
- Converting class components to hooks
- Fixing React test failures (especially enzyme mount errors)
- Redesigning UI components for better UX
- Writing comprehensive tests for React components with complex functionality
- Dashboard and layout improvements
- Component refactoring and modernization

### 4. `documentation-maintainer`
**Purpose**: Create, update, organize, and maintain documentation files.
**Tools**: All available tools (*)
**Best for**:
- Writing API documentation
- Updating README files
- Creating architectural decision records (ADRs)
- Maintaining CLAUDE.md files
- Ensuring documentation consistency across the project
- Synchronizing documentation with code changes
- Documentation formatting and linting
- Organizing documentation structure

### 5. `qa-specialist`
**Purpose**: Comprehensive quality assurance review of code, architecture, or features.
**Tools**: All available tools (*)
**Best for**:
- End-to-end testing verification
- Integration testing between components
- Security best practices review
- Test coverage analysis
- Verifying complete feature implementations
- Cross-team integration validation
- Performance testing
- Regression testing

### 6. `stock-trading-strategist`
**Purpose**: Expert stock trading analysis, strategy development, and market research.
**Tools**: All available tools (*)
**Best for**:
- Stock market analysis
- Trading strategy development
- Investment research
- Market condition evaluation
- Documenting trading insights in /docs/stocks
- Researching investor strategies

### 7. `architecture-optimizer`
**Purpose**: Comprehensive architectural analysis and optimization recommendations.
**Tools**: All available tools (*)
**Best for**:
- System architecture review
- Performance bottleneck identification
- Design pattern analysis
- Scalability improvements
- Database optimization
- API design review
- Microservices architecture
- System-wide performance issues

### 8. `backend-architect`
**Purpose**: Backend development expertise including API design, database architecture, and infrastructure.
**Tools**: All available tools (*)
**Best for**:
- REST/GraphQL API design and implementation
- Database schema design
- Authentication and authorization systems
- Payment processing services
- Backend testing strategies
- Infrastructure configuration
- Message queues and event-driven architecture
- Backend security patterns

### 9. `security-penetration-tester`
**Purpose**: Security assessments, penetration testing, and vulnerability analysis.
**Tools**: All available tools (*)
**Best for**:
- OWASP Top 10 vulnerability scanning
- SQL injection testing
- XSS vulnerability detection
- Authentication bypass testing
- Privilege escalation checks
- Insecure configuration detection
- Security audit before production deployment
- Analyzing suspicious server activity
- API security testing

### Step 3: Parallel Execution Plan
```
Group 1 (Parallel):
├── Agent A: Task 1
├── Agent B: Task 2
└── Agent C: Task 3

Wait for Group 1 completion

Group 2 (Parallel):
├── Agent D: Task 4 (depends on Task 1)
└── Agent E: Task 5 (depends on Task 2)

Final: 
└── Agent F: Integration and verification
```

## Project-Specific Commands

### Build & Test Commands
```bash
# Add your project-specific commands here
# npm run build
# npm run test
# npm run lint
# npm run typecheck
```

### Code Quality Checks
Before completing any code changes, run:
```bash
# Add your linting/formatting commands
# npm run lint:fix
# npm run format
```

## Best Practices

### 1. Always Use Todo Lists
- Create comprehensive todo lists for multi-step tasks
- Update status in real-time (pending → in_progress → completed)
- Only one task should be in_progress at a time per agent

### 2. Verification Strategy
- After code changes, always verify with tests
- Run linting and type checking
- Check for breaking changes
- Validate against requirements

### 3. Communication
- Keep updates concise and focused
- Report completion of major milestones
- Flag blockers immediately
- Summarize results clearly

## Example Parallel Execution

### Scenario: Implementing a new feature
```
User Request: "Add user authentication with JWT"

Parallel Group 1:
├── Agent 1: Research existing auth patterns in codebase
├── Agent 2: Check for existing auth dependencies
└── Agent 3: Review security best practices

Parallel Group 2 (after research):
├── Agent 4: Implement JWT token generation
├── Agent 5: Create user model and database schema
└── Agent 6: Write authentication middleware

Parallel Group 3 (after implementation):
├── Agent 7: Write unit tests
├── Agent 8: Write integration tests
└── Agent 9: Update API documentation

Final:
└── Agent 10: Run full test suite and verify integration
```

## Project Documentation Standards

### Documentation Location
- **All documentation must be kept in the `/docs` folder**
- Organize by category (api/, architecture/, user-guides/, etc.)
- Use clear, descriptive filenames
- Follow consistent markdown formatting

### Documentation Types
```
/docs/
├── APP_PROPOSAL.md          # Main application proposal/requirements
├── api/                     # API documentation
├── architecture/            # System design documents
├── user-guides/            # User and developer guides
├── deployment/             # Deployment and infrastructure docs
└── decisions/              # Architectural Decision Records (ADRs)
```

## Project-Specific Information

### Gigateer - Gig Aggregator App
**Tech Stack**: Node 20+, TypeScript, Next.js, Tailwind CSS, Playwright, PostgreSQL + Prisma (later)
**Storage**: JSON files initially → PostgreSQL migration path
**Architecture**: Monorepo with pnpm workspaces

### Build & Test Commands
```bash
# Root level commands (use pnpm, not npm!)
pnpm install           # Install all workspace dependencies  
pnpm dev              # Start all development services
pnpm build            # Build all packages and services
pnpm lint             # Lint all code across workspaces
pnpm typecheck        # TypeScript checking across workspaces
pnpm test             # Run tests across all workspaces

# Data ingestion commands (most commonly used)
pnpm ingest:all                    # Run all enabled scrapers once
pnpm ingest:source <source-name>   # Run specific scraper (e.g., bandsintown)
pnpm merge                         # Merge all source files into catalog.json
pnpm validate                      # Validate data schemas and integrity
pnpm daemon                        # Start scheduled ingestion daemon

# Web app specific commands
pnpm --filter web dev        # Start Next.js in development mode
pnpm --filter web build      # Build web app for production
pnpm --filter web start      # Start production build
pnpm --filter web test       # Run web app tests
pnpm --filter web type-check # Type check web app only

# Ingestor service management (advanced)
pnpm --filter ingestor stats              # Show ingestion statistics
pnpm --filter ingestor scheduler:status   # Check daemon status
pnpm --filter ingestor scheduler:stop     # Stop running daemon
pnpm --filter ingestor scheduler:list     # List all scheduled jobs
pnpm --filter ingestor scheduler:health   # Health check for all sources
pnpm --filter ingestor config:show        # Display current configuration
pnpm --filter ingestor config:validate    # Validate configuration
```

### Parallel Execution Strategy for Gigateer

#### Phase 1: Foundation (Parallel)
- **Agent 1**: Monorepo setup, TypeScript config, pnpm workspaces
- **Agent 2**: Contracts package with GigSchema and zod validation
- **Agent 3**: Ingestor service scaffolding with plugin interface

#### Phase 2: Core Features (Parallel)
- **Agent 4**: Demo scrapers (RSS/iCal + HTML with Playwright)
- **Agent 5**: Merge, dedupe, and hash logic implementation
- **Agent 6**: Next.js setup with API routes

#### Phase 3: UI & Features (Parallel)
- **Agent 7**: React UI components and filtering
- **Agent 8**: Scheduling with node-cron
- **Agent 9**: PWA implementation with next-pwa

#### Phase 4: Documentation & Polish
- **Agent 10**: Documentation, README, .env.example setup

### MCP Agent Integration
When available, use MCP agents for enhanced capabilities:
- `mcp__fetch__fetch`: For web scraping and API calls
- `mcp__ide__getDiagnostics`: For code quality checks
- `mcp__ide__executeCode`: For testing code execution

## Documentation Standards & Live Updates

### Documentation Philosophy
- **Document Everything as We Go**: Never delay documentation - capture decisions, patterns, and learnings immediately
- **Living Documentation**: Update docs with every significant change or discovery
- **Reference-Driven**: All docs should be easily searchable and cross-referenced
- **Future-Proof**: Write for developers who join the project later

### Documentation Maintenance Rules
1. **After Every Major Feature**: Update relevant docs in `/docs`
2. **After Architectural Decisions**: Create ADR in `/docs/decisions/`
3. **After Discovering Patterns**: Add to this CLAUDE.md file
4. **After Setup Changes**: Update README.md and .env.example
5. **After API Changes**: Update `/docs/api/ENDPOINTS.md`

### Required Documentation Files
- `/docs/APP_PROPOSAL.md` ✅ (Complete)
- `/docs/architecture/SYSTEM_DESIGN.md` ✅ (Complete - updated with implementation details)
- `/docs/api/ENDPOINTS.md` ✅ (Complete - comprehensive API documentation)
- `/docs/user-guides/DEVELOPMENT.md` ✅ (Complete - full dev setup guide)
- `/docs/user-guides/DEPLOYMENT.md` ✅ (Complete - production deployment guide)
- `/docs/user-guides/API_USAGE.md` ✅ (Complete - API usage examples)
- `/docs/user-guides/ADDING_SCRAPERS.md` ✅ (Complete - scraper development guide)
- `/docs/decisions/ADR-001-monorepo-structure.md` ✅ (Complete)
- `/docs/decisions/ADR-002-nextjs-vs-alternatives.md` ✅ (Complete)
- `/docs/decisions/ADR-003-file-based-storage-vs-database.md` ✅ (Complete)
- `README.md` ✅ (Complete - comprehensive project overview)
- `.env.example` ✅ (Complete - fully documented configuration)

### Documentation Update Triggers
- **Code Structure Changes**: Update architecture docs
- **New Dependencies**: Update setup and installation docs
- **API Modifications**: Update endpoint documentation
- **Environment Changes**: Update deployment docs
- **Discovery of Best Practices**: Update CLAUDE.md

## Discovered Implementation Patterns

### Key Project Architecture Decisions
1. **Monorepo with pnpm workspaces** - All services in single repo for easier development
2. **File-based storage (v1) → Database migration path (v2)** - Start simple, scale later
3. **Plugin architecture for scrapers** - Easy to add new data sources
4. **Next.js 14 with App Router** - Modern React framework with PWA support
5. **TypeScript everywhere** - Type safety across all services
6. **Zod schema validation** - Runtime type checking for data integrity

## 🚨 CRITICAL DEVELOPMENT REQUIREMENTS

### MANDATORY: Build and Test Before Finishing

**ALWAYS build and test the entire application before marking any task as complete.**

#### Pre-Completion Checklist:
```bash
# 1. Build all packages to check for TypeScript errors
pnpm build

# 2. Run tests if available
pnpm test

# 3. Test ingestor CLI functionality
cd services/ingestor
pnpm config:show
pnpm stats

# 4. Test web application
cd apps/web
pnpm dev &  # Start in background
curl http://localhost:3000/api/meta  # Test API

# 5. Verify key functionality works
# - API endpoints respond correctly
# - TypeScript compilation succeeds
# - No critical runtime errors
```

### Build Error Resolution Process

When encountering build errors:

1. **Fix TypeScript Errors First**
   - All packages must compile without errors
   - Fix type mismatches and missing exports
   - Ensure workspace dependencies are correctly configured

2. **Test Individual Components**
   - Build each package separately: `pnpm build --filter=package-name`
   - Fix dependency issues between packages
   - Verify all imports/exports are correct

3. **Integration Testing**
   - Build entire monorepo: `pnpm build`
   - Test API endpoints with sample data
   - Verify CLI commands work as expected

4. **Document Any Issues**
   - Add discovered patterns to this file
   - Update package.json scripts if needed
   - Note any environment-specific requirements

### Common Build Issues and Solutions

#### TypeScript Configuration
- Ensure `composite: true` for workspace packages
- Use `skipLibCheck: true` for faster builds
- Add proper `references` for cross-package dependencies

#### Import/Export Mismatches
- Always check interface definitions match implementation
- Use consistent naming (createGigId vs generateGigId)
- Export all required types and interfaces

#### Node.js ESM Issues
- Ensure `"type": "module"` in package.json
- Use proper ESM import syntax
- Handle dynamic imports correctly

### Critical Commands for Daily Development
```bash
# ALWAYS START WITH BUILD CHECK
pnpm build                        # Must pass before any work!

# Quick development cycle  
pnpm dev                          # Starts all services
pnpm ingest:all                   # Update data
curl http://localhost:3000/api/gigs | jq '.'  # Test API

# Adding new scraper
cp services/ingestor/src/plugins/example-venue.ts services/ingestor/src/plugins/my-venue.ts
# Edit scraper, then:
pnpm ingest:source my-venue       # Test it
pnpm validate                     # Check output
pnpm merge                        # Add to catalog

# Debugging issues
pnpm --filter ingestor scheduler:health  # Check scraper status
cat data/run-logs/ingestor.log | grep ERROR  # Check errors
pnpm --filter ingestor stats      # See scraping statistics
```

### File Structure Patterns
```
gigateer/
├── apps/web/                     # Next.js PWA (user interface)
│   ├── src/app/api/              # API routes (/api/gigs, /api/meta)
│   ├── src/components/           # React components
│   └── src/lib/                  # Utilities (caching, catalog access)
├── packages/contracts/           # Shared TypeScript types & Zod schemas
├── services/ingestor/            # Data ingestion service
│   ├── src/plugins/              # Scraper implementations
│   └── src/                      # Core logic (scheduler, file manager)
├── data/                         # Generated data (gitignored)
│   ├── sources/                  # Raw JSON per scraper
│   ├── catalog.json              # Merged, deduplicated data
│   └── run-logs/                 # Execution logs
└── docs/                         # All documentation
    ├── api/                      # API documentation
    ├── architecture/             # System design docs  
    ├── user-guides/              # Developer guides
    └── decisions/                # Architecture Decision Records
```

### Data Flow Pattern
```
External Sources → Scraper Plugins → Raw JSON → Validation → Merge → catalog.json → API → React UI
```

### Environment Configuration Patterns
- Development: More frequent scraping (10min), verbose logging, higher rate limits
- Production: Conservative scraping (3hr), minimal logging, respectful rate limits
- All config via environment variables with sensible defaults

### Plugin Development Pattern
1. Copy from `example-venue.ts` or similar plugin
2. Implement `scrape()` method with error handling
3. Transform data to standard `Gig` schema using Zod validation
4. Test with `pnpm ingest:source plugin-name`
5. Validate output with `pnpm validate`

### PWA Implementation Notes
- Uses `next-pwa` plugin with Workbox
- Offline support via service worker caching
- App installation prompt for mobile users
- Background sync for data updates

### Rate Limiting Strategy
- Global rate limiting across all scrapers
- Per-source rate limiting configurable
- Exponential backoff on failures
- Respect robots.txt files

## Project-Specific Notes
- **Use pnpm, not npm/yarn** - Workspace dependencies require pnpm
- **All data is JSON files** - No database in v1, makes deployment simple
- **Respectful scraping** - Conservative rate limits, proper error handling
- **Schema-first development** - All data validated with Zod schemas
- **Monorepo benefits** - Shared types, coordinated deployments, single repo
- **Documentation-driven** - All major decisions documented as ADRs
- **Progressive Web App** - Works offline, installable like native app

## Development Workflow Patterns
1. **Feature development**: Create branch → implement → test → document → PR
2. **Adding scrapers**: Copy template → implement → test individually → test in pipeline
3. **API changes**: Update types in contracts → update implementation → update docs
4. **Schema changes**: Update contracts → update validation → update scrapers → test migration
5. **Deployment**: Test locally → build → deploy web app → deploy ingestor → verify

## Error Handling Patterns
- **Graceful degradation** - Continue with partial failures
- **Comprehensive logging** - Structured logs with context
- **Health monitoring** - Regular health checks for all sources
- **User-friendly errors** - API returns clear error codes and messages
- **Retry strategies** - Exponential backoff with jitter

## Notes
- **All project documentation lives in `/docs` folder** - maintain this structure
- **Always update documentation in real-time during development**
- **Use TypeScript strictly** - Enable strict mode, avoid `any` types
- **Test scrapers individually** - Always test new scrapers in isolation first
- **Monitor data quality** - Regular validation of schemas and data integrity
- **Keep dependencies minimal** - Only add dependencies when truly necessary
- **Cache everything reasonably** - API responses, file reads, but with appropriate TTLs