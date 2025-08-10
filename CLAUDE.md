# CLAUDE.md - Project Assistant Configuration

## Core Principles

### 1. Think First, Act Second
Before executing any task:
- Analyze the full scope of what needs to be done
- Identify independent subtasks that can be parallelized
- Plan the optimal execution order
- Consider dependencies between tasks

### 2. DRY (Don't Repeat Yourself) & Code Quality Principles 
**MANDATORY**: Apply these principles to EVERY task and code change:

#### 2.1 Configuration Centralization
- **Centralize all configuration values** in dedicated config files
- **Use environment variables** for deployment-specific values
- **Create constants files** for application-wide settings
- **Avoid hardcoded values** scattered throughout the codebase

Example structure:
```typescript
// src/config/app.config.ts
export const APP_CONFIG = {
  pagination: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  dateFilters: {
    DEFAULT_FILTER: 'all',
    SUPPORTED_FILTERS: ['all', 'today', 'tomorrow', 'this-week', 'this-month'] as const,
  },
  api: {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
  }
} as const;
```

#### 2.2 Default Values & Fallbacks
- **Define defaults once** in config files, not scattered in components
- **Use consistent fallback patterns** across the application
- **Implement graceful degradation** when data is missing
- **Centralize error messages** and user-facing strings

#### 2.3 Component Reusability
- **Extract common UI patterns** into reusable components
- **Use composition over inheritance** for React components
- **Create generic utility functions** that can be reused
- **Implement consistent prop interfaces** across similar components

#### 2.4 Type Safety & Consistency
- **Define types once** and reuse across components
- **Use discriminated unions** for state management
- **Implement consistent naming conventions** (camelCase for variables, PascalCase for types)
- **Create shared interfaces** for API responses and data structures

#### 2.5 Business Logic Separation
- **Extract business logic** from UI components into custom hooks or services
- **Create pure functions** for data transformations
- **Implement service layers** for API communication
- **Use dependency injection** patterns where appropriate

#### 2.6 Error Handling Patterns
- **Create reusable error boundaries** for React components
- **Implement consistent error response formats** from APIs
- **Use centralized error logging** and monitoring
- **Provide user-friendly error messages** with actionable guidance

#### 2.7 Design Patterns to Apply
**Repository Pattern**: Centralize data access logic
```typescript
// services/gigRepository.ts
export class GigRepository {
  private static instance: GigRepository;
  
  static getInstance(): GigRepository {
    if (!GigRepository.instance) {
      GigRepository.instance = new GigRepository();
    }
    return GigRepository.instance;
  }
}
```

**Factory Pattern**: Create objects based on configuration
```typescript
// utils/filterFactory.ts
export const createFilter = (type: FilterType) => {
  switch (type) {
    case 'date': return new DateFilter();
    case 'venue': return new VenueFilter();
    default: throw new Error(`Unknown filter type: ${type}`);
  }
};
```

**Observer Pattern**: Handle state changes consistently
```typescript
// hooks/useEventBus.ts
export const useEventBus = () => {
  // Centralized event handling logic
};
```

**Strategy Pattern**: Interchangeable algorithms
```typescript
// utils/sortStrategies.ts
export const SORT_STRATEGIES = {
  date: (a: Gig, b: Gig) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime(),
  name: (a: Gig, b: Gig) => a.title.localeCompare(b.title),
  venue: (a: Gig, b: Gig) => a.venue.name.localeCompare(b.venue.name),
} as const;
```

## 🔍 MANDATORY Code Review Checklist
**Apply this checklist to EVERY code change before completion:**

### ✅ DRY & WET Code Review
- [ ] **No duplicated logic**: Check for repeated code blocks, extract into reusable functions
- [ ] **Constants centralized**: All magic numbers/strings moved to config files
- [ ] **Single source of truth**: Each piece of data/logic defined in only one place
- [ ] **Consistent patterns**: Similar functionality uses identical approaches

### ✅ Configuration & Defaults
- [ ] **Centralized configuration**: All settings in dedicated config files
- [ ] **Environment variables**: Deployment-specific values use env vars with defaults
- [ ] **Default values**: Defined once in config, not scattered in components
- [ ] **Fallback handling**: Graceful degradation when data/config is missing

### ✅ Type Safety & Interfaces
- [ ] **Shared types**: Common interfaces defined once and imported
- [ ] **Consistent naming**: camelCase variables, PascalCase types, UPPER_CASE constants
- [ ] **Type exports**: All types properly exported from index files
- [ ] **No `any` types**: Strict typing throughout the codebase

### ✅ Component Quality
- [ ] **Single responsibility**: Each component/function has one clear purpose
- [ ] **Prop interfaces**: Consistent and well-typed component props
- [ ] **Reusable logic**: Common functionality extracted to custom hooks/utils
- [ ] **Pure functions**: Business logic separated from UI components

### ✅ Error Handling & UX
- [ ] **Consistent error patterns**: All errors handled using centralized approach
- [ ] **User-friendly messages**: Technical errors converted to actionable user guidance
- [ ] **Loading states**: Appropriate loading indicators for all async operations
- [ ] **Graceful failures**: App continues working when non-critical features fail

### ✅ Performance & Optimization
- [ ] **Memoization**: Expensive calculations properly memoized
- [ ] **Component re-renders**: Unnecessary re-renders prevented
- [ ] **Bundle size**: No unnecessary dependencies or imports
- [ ] **Code splitting**: Large features properly code-split

### ✅ Testing & Validation
- [ ] **Test coverage**: All new functionality has corresponding tests
- [ ] **Edge cases**: Error conditions and boundary cases tested
- [ ] **Integration tests**: Component interactions properly tested
- [ ] **Type checking**: `pnpm typecheck` passes without errors

### ✅ Documentation & Comments
- [ ] **API documentation**: New endpoints documented in `/docs/api/`
- [ ] **README updates**: Installation/usage docs updated if needed
- [ ] **Inline documentation**: Complex business logic explained with comments
- [ ] **CLAUDE.md updates**: New patterns/decisions documented

## 🛠️ Refactoring Opportunities Checklist
**Always look for these improvement opportunities:**

### 🔧 Extract Patterns
- **Repeated JSX**: Extract to reusable components
- **Duplicate logic**: Create shared utility functions
- **Magic numbers**: Move to configuration constants
- **Inline styles**: Extract to CSS modules or styled components

### 🔧 Consolidate State
- **Multiple useState**: Consider useReducer for complex state
- **Props drilling**: Use context or state management library
- **Scattered state**: Centralize related state into single hooks
- **Derived state**: Calculate derived values in useMemo

### 🔧 Optimize Performance
- **Heavy computations**: Wrap in useMemo or useCallback
- **Large components**: Split into smaller, focused components
- **Unnecessary API calls**: Implement proper caching strategies
- **Bundle optimization**: Lazy load non-critical features

### 🔧 Improve Developer Experience
- **Better error messages**: Add context and suggested solutions
- **TypeScript strict mode**: Enable stricter type checking
- **Consistent formatting**: Apply prettier/eslint rules
- **Development tools**: Add debugging utilities and dev-only features

### 3. Parallel Agent Strategy
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
3. **✨ Configuration-driven scraper system** - Add new scrapers with JSON files only, no TypeScript code needed
4. **Hybrid plugin architecture** - Supports both traditional TypeScript plugins and configuration-driven JSON plugins
5. **Next.js 14 with App Router** - Modern React framework with PWA support
6. **TypeScript everywhere** - Type safety across all services
7. **Zod schema validation** - Runtime type checking for data integrity

### 🎯 Major Achievement: Zero-Code Scraper System
**January 2025** - Successfully implemented a revolutionary configuration-driven scraper system:

✅ **What was achieved:**
- **No TypeScript required** - Add new scrapers with JSON configuration only
- **Hybrid plugin loader** - Seamlessly combines traditional and configuration-driven plugins
- **Advanced transformations** - Time range splitting, regex extraction, follow-up data gathering
- **Production-ready performance** - 195 events scraped in ~28 seconds (7+ gigs/second throughput)
- **Complete automation** - Plugin metadata, rate limiting, validation all handled automatically

✅ **Impact:**
- **Reduced complexity** - From 75+ lines of TypeScript to a simple JSON file
- **Faster development** - New venues can be added in minutes, not hours
- **Lower barrier to entry** - Non-developers can contribute scrapers
- **Maintainable** - Configuration files are easier to understand and modify than code

✅ **Technical implementation:**
- `HybridPluginLoader` - Loads both traditional (.ts) and configuration-driven (.json) plugins
- `ConfigDrivenPluginLoader` - Creates ScraperPlugin instances from JSON configurations
- `ConfigDrivenScraper` - Handles all browser automation, extraction, and transformation
- Configuration-driven plugins take precedence over traditional ones with same name

**Commands:**
```bash
pnpm plugins                           # Show all loaded plugins by type
pnpm ingest:source exchange-bristol    # Test configuration-driven scraper
```

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

## 🧪 COMPREHENSIVE TESTING STRATEGY

### Testing Philosophy
- **Test-Driven Development**: Write tests as you develop features
- **Comprehensive Coverage**: Aim for 80%+ test coverage across all packages
- **Real-World Testing**: Tests should simulate actual usage patterns
- **Fast Feedback**: Tests should run quickly during development

### Testing Framework: Jest

All packages use Jest with TypeScript support:
- **Contracts Package**: Pure TypeScript unit tests for schema validation
- **Ingestor Service**: Node.js tests with ESM support for business logic
- **Web Application**: React Testing Library for component and integration tests

### Test Structure & Organization

```
package-name/
├── src/
│   ├── __tests__/           # Test files alongside source
│   │   ├── component.test.ts
│   │   └── integration.test.ts
│   └── components/
│       └── Component.tsx
├── jest.config.js           # Jest configuration
└── jest.setup.js            # Test setup (web app only)
```

### Testing Commands (MANDATORY - Use These!)

```bash
# Run all tests across the entire monorepo
pnpm test

# Run tests for specific package
pnpm --filter contracts test     # Schema validation tests
pnpm --filter ingestor test      # Business logic tests  
pnpm --filter web test           # React component tests

# Watch mode for active development
pnpm --filter package-name test:watch

# Run tests with coverage reports
pnpm --filter package-name test --coverage
```

### Test Categories & Requirements

#### 1. Unit Tests (Required for ALL new code)
- **What to test**: Pure functions, utilities, business logic
- **Coverage target**: 90%+ for utility functions
- **Examples**:
  - Schema validation in contracts package
  - File operations in ingestor service
  - Component rendering in web app

```typescript
// Example unit test pattern
describe('FileManager', () => {
  describe('readSourceFile', () => {
    it('should return parsed JSON data for existing file', async () => {
      // Test implementation
    });
    
    it('should return empty array for non-existent file', async () => {
      // Test implementation  
    });
  });
});
```

#### 2. Component Tests (Required for ALL React components)
- **What to test**: Component rendering, user interactions, props handling
- **Coverage target**: 80%+ for components
- **Tools**: React Testing Library, Jest DOM matchers

```typescript
// Example component test pattern
describe('GigCard', () => {
  it('renders gig information correctly', () => {
    render(<GigCard gig={mockGig} />);
    expect(screen.getByText('Artist Name')).toBeInTheDocument();
  });
  
  it('handles user interactions', () => {
    const onAction = jest.fn();
    render(<GigCard gig={mockGig} onAction={onAction} />);
    fireEvent.click(screen.getByText('Get Tickets'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

#### 3. Integration Tests (Required for complex workflows)
- **What to test**: API endpoints, multi-component interactions, data flow
- **Coverage target**: All critical user journeys
- **Examples**:
  - API route handlers in web app
  - Scraper plugin workflow in ingestor
  - Search and filtering in web app

#### 4. Schema Validation Tests (Required for ALL schemas)
- **What to test**: Zod schema validation, data transformation
- **Coverage target**: 100% for all schema edge cases

```typescript
// Example schema test
describe('GigSchema', () => {
  it('validates complete gig object', () => {
    expect(() => GigSchema.parse(validGigData)).not.toThrow();
  });
  
  it('rejects invalid gig data', () => {
    expect(() => GigSchema.parse(invalidData)).toThrow();
  });
});
```

### Testing Best Practices (MANDATORY)

#### 1. Test File Naming & Location
- Place tests in `__tests__` folders alongside source code
- Name pattern: `component-name.test.ts` or `feature-name.test.ts`
- Integration tests: `feature-name.integration.test.ts`

#### 2. Mock Strategy
- **External APIs**: Always mock with realistic response data
- **File System**: Use temporary directories for file operations
- **Next.js Router**: Mock navigation and routing
- **Date/Time**: Mock for consistent test results

#### 3. Test Data Management
```typescript
// Create reusable test fixtures
const mockGig: Gig = {
  id: 'test-gig-1',
  title: 'Test Concert',
  artist: 'Test Artist',
  // ... complete mock data
};

// Use factories for variations
const createMockGig = (overrides: Partial<Gig> = {}) => ({
  ...mockGig,
  ...overrides
});
```

#### 4. Coverage Requirements
- **Minimum coverage**: 70% overall, 80% for new code
- **Critical paths**: 95%+ coverage (payment, user auth, data ingestion)
- **Test all error paths**: Exception handling, API failures, invalid data

### Testing Checklist (MANDATORY before completing tasks)

```bash
# 1. Run full test suite
pnpm test

# 2. Check coverage for new code
pnpm --filter package-name test --coverage

# 3. Verify no tests are skipped (.skip) or focused (.only)
grep -r "describe.skip\|it.skip\|describe.only\|it.only" src/

# 4. Run linting on test files
pnpm lint

# 5. Verify all async tests handle promises properly
# Look for missing async/await in test files
```

### When to Write Tests (MANDATORY Guidelines)

#### ✅ ALWAYS write tests for:
- New components, functions, or modules
- Bug fixes (write test that reproduces the bug first)
- API endpoints and data processing logic
- Schema validation and data transformation
- Complex business logic (scraping, filtering, merging)

#### ⚠️ PRIORITIZE tests for:
- User-facing features (search, filtering, gig display)
- Data integrity operations (scraping, validation, deduplication)
- Error handling and edge cases
- Performance-critical code paths

#### 📝 DOCUMENT when skipping tests:
If you must skip tests temporarily, document why:
```typescript
// TODO: Add integration tests after API stabilizes
describe.skip('GigAPI integration', () => {
  // Test implementation pending
});
```

### Test Debugging & Troubleshooting

#### Common Issues & Solutions

1. **ESM Import Errors in Ingestor Tests**
   ```bash
   # Solution: Use .js extensions in imports within test files
   import { FileManager } from '../file-manager.js';
   ```

2. **React Testing Async Issues**
   ```typescript
   // Always use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Loading')).not.toBeInTheDocument();
   });
   ```

3. **Mock Setup Issues**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Integration with Documentation

**Link to related documentation:**
- [API Documentation](/docs/api/ENDPOINTS.md) - For API endpoint tests
- [Development Guide](/docs/user-guides/DEVELOPMENT.md) - For testing environment setup
- [Architecture Documentation](/docs/architecture/SYSTEM_DESIGN.md) - For integration test design

**Update these docs when:**
- Adding new test categories or patterns
- Changing testing infrastructure
- Discovering new testing best practices
- Adding test utilities or helpers

### Future Testing Enhancements
- **E2E Testing**: Add Playwright for full user journey tests
- **Visual Regression**: Component screenshot comparisons  
- **Performance Testing**: Load testing for API endpoints
- **Accessibility Testing**: Automated a11y checks in component tests

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

## MongoDB Setup and Management

### Prerequisites
MongoDB is required for production deployment and advanced features. The application can run in two modes:
1. **File-based mode** (default): Uses JSON files in `/data` directory - good for development
2. **Database mode**: Uses MongoDB for better performance and scalability

### MongoDB Installation & Setup

#### Quick Setup (Development)
```bash
# Use the provided setup script
./scripts/setup-mongo.sh --quick-start

# Or manually start MongoDB (if already installed)
mongod --dbpath ./data/mongodb --port 27017 &

# Check if MongoDB is running
pgrep -x "mongod" && echo "MongoDB is running" || echo "MongoDB is not running"
```

#### Full Installation

**Ubuntu/Debian:**
```bash
# Import MongoDB GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
# Install with Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

### MongoDB Management Commands
```bash
# Start MongoDB (development mode)
mongod --dbpath ./data/mongodb --port 27017 &

# Stop MongoDB
pkill mongod

# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Import catalog.json into MongoDB
mongoimport --db gigateer --collection gigs \
  --file ./data/catalog.json --jsonArray

# Connect to MongoDB shell
mongosh gigateer

# Basic MongoDB queries (in mongosh)
db.gigs.find().limit(5)                    # Get first 5 gigs
db.gigs.countDocuments()                   # Count total gigs
db.gigs.find({city: "London"})            # Find gigs in London
db.gigs.createIndex({dateStart: 1})       # Create date index for performance
```

### Environment Configuration
```bash
# Add to .env.local for MongoDB connection
MONGODB_URI=mongodb://localhost:27017/gigateer
USE_DATABASE=true  # Enable database mode (default: false for file-based)
```

### Troubleshooting MongoDB Issues

#### Connection Refused Error
If you see `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`:
1. MongoDB is not running - start it with: `mongod --dbpath ./data/mongodb --port 27017 &`
2. MongoDB is running on a different port - check with: `ps aux | grep mongod`
3. Firewall blocking connection - check firewall settings

#### Fallback to File-Based Mode
The application automatically falls back to file-based mode when MongoDB is unavailable:
- Reads from `/data/catalog.json`
- Limited to basic filtering (no text search)
- Good for development and testing

#### Data Migration
To migrate from file-based to MongoDB:
```bash
# Start MongoDB
./scripts/setup-mongo.sh --quick-start

# Import catalog.json
mongoimport --db gigateer --collection gigs \
  --file ./data/catalog.json --jsonArray \
  --mode upsert

# Verify import
mongosh gigateer --eval "db.gigs.countDocuments()"
```

### Testing with Sample Data
The repository includes sample data with current dates for testing:
```bash
# Update catalog.json with current dates (for testing)
node scripts/update-test-dates.js  # Create this script if needed

# Or manually edit dates in catalog.json
# Change dateStart/dateEnd to current/future dates
```

### Critical Commands for Daily Development
```bash
# ALWAYS START WITH BUILD CHECK
pnpm build                        # Must pass before any work!

# Start MongoDB if using database mode
./scripts/setup-mongo.sh --quick-start

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

## Configuration-Driven Web Scraper Guide

### Overview
The Gigateer project includes a flexible configuration-driven scraper system that allows creating new scrapers entirely through JSON configuration files, without writing code. This system uses Playwright for browser automation and supports dynamic content loading.

### Creating a New Scraper Configuration

#### Step 1: Analyze the Target Website
Before creating a configuration, understand the website structure:

1. **Visit the target website** manually in a browser
2. **Use browser developer tools** (F12) to inspect the HTML structure
3. **Identify event containers** - look for repeating elements that represent individual events
4. **Note dynamic content** - check if events load via JavaScript (HeadFirst, AJAX, etc.)
5. **Document the selectors** for title, date, venue, artist, and other relevant fields

#### Step 2: Create the Configuration File
Create a new JSON file in `/services/ingestor/data/scraper-configs/[venue-name].json`:

```json
{
  "site": {
    "name": "Venue Name",
    "baseUrl": "https://example.com",
    "source": "venue-slug",
    "description": "Brief description of the venue",
    "maintainer": "gigateer-team",
    "lastUpdated": "2025-01-09"
  },
  
  "browser": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "headless": true,
    "timeout": 45000
  },
  
  "rateLimit": {
    "delayBetweenRequests": 2000,
    "maxConcurrent": 1,
    "respectRobotsTxt": true
  },
  
  "workflow": [
    {
      "type": "navigate",
      "url": "https://example.com/events"
    },
    {
      "type": "wait",
      "condition": "networkidle",
      "timeout": 10000
    },
    {
      "type": "wait",
      "timeout": 3000
    },
    {
      "type": "extract", 
      "containerSelector": ".event-item, .hf__event-listing",
      "fields": {
        "title": {
          "selector": "h1, h2, h3, .title",
          "attribute": "text",
          "required": false,
          "transform": "trim",
          "fallback": "Event at Venue"
        },
        "artist": {
          "selector": ".artist, .performer",
          "attribute": "text",
          "required": false,
          "transform": "trim"
        },
        "date": {
          "selector": ".date, time",
          "attribute": "text",
          "required": false,
          "transform": "trim",
          "fallback": "TBA"
        },
        "eventUrl": {
          "selector": "a",
          "attribute": "href",
          "required": false
        },
        "image": {
          "selector": "img",
          "attribute": "src",
          "required": false
        }
      }
    }
  ],
  
  "mapping": {
    "id": {
      "strategy": "generated",
      "fields": ["title", "venue", "date"]
    },
    "title": "title",
    "artist": "artist",
    "venue": {
      "name": "venue",
      "address": "address",
      "city": "city",
      "country": "country"
    },
    "date": {
      "start": "date",
      "end": "endDate",
      "timezone": "timezone"
    },
    "urls": {
      "event": "eventUrl"
    },
    "images": "image"
  },
  
  "validation": {
    "required": [],
    "minEventsExpected": 0,
    "maxEventsExpected": 500
  },
  
  "debug": {
    "screenshots": true,
    "saveHtml": true,
    "logLevel": "debug"
  }
}
```

#### Step 3: That's It! No Code Required! 🎉

**The configuration-driven system automatically creates plugins from JSON files.**

✅ **What happens automatically:**
- Plugin metadata extracted from `site` and `browser` config sections
- Rate limiting applied from `rateLimit` config
- Browser automation handled by the configuration-driven scraper
- Data normalization and validation handled automatically  
- Error handling and retry logic included
- Performance metrics and logging built-in

✅ **No TypeScript code needed!**
- The system creates plugins dynamically from your JSON configuration
- All browser automation, data extraction, and normalization is handled
- Just drop your JSON file in `/data/scraper-configs/` and it works

**🔍 To check your new plugin was loaded:**
```bash
pnpm plugins  # Shows all loaded plugins
```

**📊 Plugin Types:**
- **Configuration-driven (.json files)**: Modern, no-code approach ⚡
- **Traditional (.ts files)**: Legacy approach for complex custom logic

### Testing a Scraper Configuration

#### Phase 1: Initial Testing
1. **Test individual source**:
   ```bash
   cd services/ingestor
   npx tsx src/cli.ts ingest:source [venue-name]
   ```

2. **Check for errors**: Look for timeout errors, selector mismatches, or validation failures

3. **Review debug output**: Screenshots and HTML files are saved when `debug.screenshots: true`

#### Phase 2: Debug and Refine
1. **Enable debug mode** in the JSON config:
   ```json
   "debug": {
     "screenshots": true,
     "saveHtml": true,
     "logLevel": "debug"
   }
   ```

2. **Check debug screenshots**: Look at generated PNG files to see what the scraper actually sees

3. **Examine raw data**:
   ```bash
   cat /code/gigateer/data/sources/[venue-name].raw.json
   ```

4. **Analyze containers found**: Debug output shows how many containers match your selectors

#### Phase 3: Selector Refinement
Common selector patterns:

- **HeadFirst systems**: `.hf__event-listing`, `.hf__event-title`
- **Generic events**: `.event`, `.event-item`, `.listing`
- **Fallback selectors**: Use multiple selectors separated by commas: `"h1, h2, h3, .title"`
- **Dynamic content**: Add appropriate wait conditions and longer timeouts

#### Phase 4: Production Testing
1. **Disable debug mode**:
   ```json
   "debug": {
     "screenshots": false,
     "saveHtml": false,
     "logLevel": "info"
   }
   ```

2. **Test full ingestion**:
   ```bash
   npx tsx src/cli.ts ingest:all
   ```

3. **Verify data quality**:
   ```bash
   npx tsx src/cli.ts validate
   npx tsx src/cli.ts stats
   ```

### Configuration Schema Reference

#### Workflow Actions
- **navigate**: Navigate to a URL
- **wait**: Wait for conditions (networkidle, selector visibility, time)
- **click**: Click elements (with optional wait)
- **scroll**: Scroll page (up, down, bottom)
- **extract**: Extract data from containers

#### Field Extraction Options
- **selector**: CSS selector for the element
- **attribute**: `text`, `href`, `src`, or custom attribute
- **required**: Whether field is mandatory
- **transform**: `trim`, `lowercase`, `uppercase`, `date`, `price`, `slug`
- **fallback**: Default value if extraction fails
- **multiple**: Extract array of values

#### Troubleshooting Common Issues

1. **Timeout Errors**: 
   - Increase `browser.timeout` and action-specific timeouts
   - Check if dynamic content needs more time to load

2. **No Events Found**:
   - Verify containerSelector matches actual HTML structure
   - Check if content loads dynamically after initial page load

3. **Empty Field Extraction**:
   - Use browser developer tools to verify field selectors
   - Try broader selectors: `"h1, h2, h3, h4, .title, strong"`

4. **Validation Failures**:
   - Set `validation.required: []` during development
   - Add fallback values to required fields

### Exchange Bristol Implementation Example

The Exchange Bristol scraper (`exchange-bristol.json`) demonstrates a real-world configuration:
- Uses HeadFirst dynamic content system
- Handles 195+ event containers
- Includes debug capabilities for troubleshooting
- Successfully extracts images and event URLs

Key learnings:
- HeadFirst systems use `.hf__event-listing` containers
- Network idle wait is crucial for dynamic content
- Screenshots are invaluable for debugging selector issues
- Flexible validation allows development iteration

### Commands for Creating New Scrapers

```bash
# 1. Create configuration file
cp services/ingestor/data/scraper-configs/exchange-bristol.json services/ingestor/data/scraper-configs/[venue-name].json

# 2. Create plugin file
cp services/ingestor/src/plugins/exchange-bristol.ts services/ingestor/src/plugins/[venue-name].ts

# 3. Test the scraper
cd services/ingestor
npx tsx src/cli.ts ingest:source [venue-name]

# 4. Debug with screenshots
# (Enable debug mode in JSON config first)
npx tsx src/cli.ts ingest:source [venue-name]

# 5. Check extracted data
cat data/sources/[venue-name].raw.json | jq '.'

# 6. Validate data quality
npx tsx src/cli.ts validate

# 7. View statistics
npx tsx src/cli.ts stats
```

### Future Enhancements
- **Smart selectors**: Auto-detect common patterns
- **Schema validation**: Validate configurations before execution
- **Performance monitoring**: Track scraping success rates
- **Selector testing**: Tools to test selectors against live sites

## 🚀 IMMEDIATE ACTION ITEMS - DRY Implementation
**NEXT DEVELOPMENT PRIORITIES - Apply DRY principles to existing code:**

### Priority 1: Configuration Centralization
**Create centralized configuration system**

1. **Create `/apps/web/src/config/app.config.ts`**:
   ```typescript
   export const APP_CONFIG = {
     pagination: {
       DEFAULT_LIMIT: 20,
       MAX_LIMIT: 100,
       FIRST_PAGE: 1,
     },
     dateFilters: {
       DEFAULT_FILTER: 'all' as const,
       SUPPORTED_FILTERS: ['all', 'today', 'tomorrow', 'this-week', 'this-month'] as const,
       TIMEOUT_MS: 30000,
     },
     api: {
       BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
       TIMEOUT: 30000,
       RETRY_ATTEMPTS: 3,
       CACHE_TTL: 300000, // 5 minutes
     },
     ui: {
       ANIMATIONS: {
         TRANSITION_DURATION: 150,
         DEBOUNCE_DELAY: 500,
       },
       BREAKPOINTS: {
         mobile: 768,
         tablet: 1024,
         desktop: 1280,
       }
     }
   } as const;
   ```

2. **Refactor existing hardcoded values**:
   - Replace `limit: 20` in useSearchFilters with `APP_CONFIG.pagination.DEFAULT_LIMIT`
   - Replace `dateFilter: 'all'` with `APP_CONFIG.dateFilters.DEFAULT_FILTER`
   - Replace timeout values with `APP_CONFIG.api.TIMEOUT`
   - Replace animation durations with `APP_CONFIG.ui.ANIMATIONS.*`

### Priority 2: Extract Common UI Patterns
**Identify and extract reusable components**

1. **Create reusable form components**:
   - `/components/ui/Select.tsx` - Standardize all dropdowns
   - `/components/ui/Input.tsx` - Consistent input styling
   - `/components/ui/Button.tsx` - Button variants and states

2. **Extract filter logic patterns**:
   - Create `useGenericFilter<T>` hook for reusable filtering
   - Extract common validation patterns
   - Create shared error handling components

### Priority 3: Business Logic Separation
**Move business logic out of UI components**

1. **Create service layer**:
   ```typescript
   // services/gigService.ts
   export class GigService {
     static async fetchGigs(filters: FilterOptions): Promise<GigsResponse> {
       // Centralized API logic with error handling, retries, caching
     }
     
     static async fetchGigDetail(id: string): Promise<Gig> {
       // Centralized detail fetching
     }
   }
   ```

2. **Extract data transformation utilities**:
   ```typescript
   // utils/gigTransformers.ts
   export const transformGigForDisplay = (gig: Gig): DisplayGig => {
     // Centralized data transformation logic
   };
   
   export const formatDateRange = (start: Date, end: Date): string => {
     // Centralized date formatting
   };
   ```

### Priority 4: Type Safety & Consistency
**Strengthen type system and consistency**

1. **Create shared type definitions**:
   ```typescript
   // types/api.types.ts
   export interface ApiResponse<T> {
     data: T;
     pagination?: PaginationInfo;
     meta?: Record<string, unknown>;
   }
   
   export interface FilterState {
     dateFilter: DateFilterOption;
     searchQuery: string;
     cityFilter: string;
     // ... other filters
   }
   ```

2. **Implement consistent error types**:
   ```typescript
   // types/error.types.ts
   export interface AppError {
     code: string;
     message: string;
     userMessage?: string;
     context?: Record<string, unknown>;
   }
   ```

## 🎯 Implementation Strategy
**How to apply DRY principles on every task:**

### Before Starting Any Task:
1. **Identify existing patterns** - Search for similar implementations
2. **Check for duplicated logic** - Look for repeated code that can be extracted
3. **Review configuration values** - Find hardcoded values that should be centralized
4. **Plan reusable components** - Design for reusability from the start

### During Implementation:
1. **Follow established patterns** - Use existing components and utilities
2. **Create abstractions** - If writing similar code twice, create a reusable function
3. **Use configuration** - Reference centralized config instead of hardcoding values
4. **Apply consistent naming** - Follow established conventions

### After Implementation:
1. **Run the Code Review Checklist** - Ensure all DRY principles are applied
2. **Look for refactoring opportunities** - Identify areas for improvement
3. **Update documentation** - Record new patterns and decisions
4. **Update configuration** - Add any new config values to centralized files

### Code Quality Gates:
- ❌ **Block completion if**: Duplicated logic exists, hardcoded values present, inconsistent patterns used
- ✅ **Allow completion when**: All config centralized, no code duplication, consistent patterns applied
- 🔄 **Refactor immediately**: Any time you see repeated code or inconsistent implementations

This ensures every development task improves overall code quality and maintainability!