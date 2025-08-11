# Test Suite Documentation

This directory contains a comprehensive test suite for the Gigateer caching functionality, covering both backend and frontend components.

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                     # Test configuration and mocks
│   ├── integration/
│   │   └── caching.integration.test.ts  # End-to-end caching tests
│   └── README.md                    # This file
├── lib/__tests__/
│   ├── cache.test.ts               # Cache system unit tests
│   └── data.test.ts                # Data layer unit tests
├── hooks/__tests__/
│   └── useGigs.test.ts            # React hook tests
├── components/
│   └── pages/__tests__/
│       └── SearchPageCached.test.tsx   # Component integration tests
└── app/api/
    ├── cache/__tests__/
    │   └── routes.test.ts         # Cache API tests
    └── gigs/city/[city]/__tests__/
        └── route.test.ts          # Gigs API tests
```

## Test Categories

### 1. Backend Cache System Tests (`lib/__tests__/`)

**Cache System (`cache.test.ts`)**
- Tiered caching behavior (hot, warm, cold)
- Cache hit/miss logic and TTL handling
- Cache promotion and invalidation
- Statistics tracking
- Key generation and uniqueness

**Data Layer (`data.test.ts`)**
- Database vs file-based fallback
- City-based filtering
- Date-based filtering
- Error handling and recovery

### 2. API Route Tests (`app/api/**/__tests__/`)

**Gigs API (`route.test.ts`)**
- Pagination and filtering
- Sorting by different fields
- Cache header generation
- Error handling and validation
- Webhook-based cache invalidation

**Cache Management API (`routes.test.ts`)**
- Statistics endpoint
- Cache warming functionality
- Input validation and limits
- Error recovery

### 3. Frontend Tests

**React Hook (`useGigs.test.ts`)**
- Data fetching and state management
- Pagination and infinite scroll
- Error handling and retry logic
- Prefetching behavior
- Cleanup and cancellation

**Component Integration (`SearchPageCached.test.tsx`)**
- Search functionality and filtering
- Sorting and view switching
- Event grouping (happening now)
- Filter chips and clearing
- Loading and error states

### 4. Integration Tests (`integration/`)

**End-to-End Caching (`caching.integration.test.ts`)**
- Full caching lifecycle
- Multi-tier cache behavior
- Cache warming and invalidation
- Performance characteristics
- Error handling across layers

## Running Tests

### All Tests
```bash
npm run test              # Interactive mode
npm run test:run          # Single run
npm run test:coverage     # With coverage report
```

### Specific Test Categories
```bash
npm run test:cache        # Backend caching tests
npm run test:hooks        # React hook tests  
npm run test:components   # Component tests
npm run test:integration  # End-to-end tests
npm run test:all          # Run all categories sequentially
```

### Watch Mode and UI
```bash
npm run test:watch        # Watch mode for development
npm run test:ui           # Visual test UI
```

## Coverage Targets

### Overall Project
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Critical Components
- **Cache System**: 90% (higher due to critical nature)
- **useGigs Hook**: 80% (complex state management)
- **API Routes**: 80% (data integrity critical)

## Test Patterns and Best Practices

### 1. Mocking Strategy
- **External Dependencies**: Mock at module level
- **Next.js Features**: Comprehensive mocks in setup
- **API Calls**: Mock fetch with realistic responses
- **Time-based Logic**: Use fake timers for consistent testing

### 2. Test Organization
- **Unit Tests**: Single responsibility, isolated
- **Integration Tests**: Multiple components working together
- **End-to-End**: Full user workflows
- **Performance Tests**: Timing and efficiency

### 3. Assertions
- **Behavior over Implementation**: Test what happens, not how
- **Comprehensive Error Cases**: Test failure paths
- **Edge Cases**: Boundary conditions and limits
- **State Consistency**: Verify state at each step

## Common Test Scenarios

### Cache Behavior Testing
```typescript
// Test cache hit progression
await getCachedGigs('bristol', { page: 1 }, fetcher);  // miss
await getCachedGigs('bristol', { page: 1 }, fetcher);  // hot hit
await getCachedGigs('bristol', { page: 5 }, fetcher);  // warm hit
```

### Error Handling
```typescript
// Test graceful degradation
mockFetch.mockRejectedValue(new Error('Network error'));
const result = await useGigs('bristol');
expect(result.error).toBeDefined();
expect(result.gigs).toEqual([]);
```

### Component Interaction
```typescript
// Test user interactions
await user.type(screen.getByTestId('search-input'), 'rock');
expect(screen.getByText('Rock Concert')).toBeInTheDocument();
expect(screen.queryByText('Jazz Night')).not.toBeInTheDocument();
```

## Debugging Tests

### Failed Tests
- Check mock implementations
- Verify test isolation (cleanup)
- Review async/await usage
- Check timing-dependent assertions

### Coverage Issues
- Identify uncovered branches
- Add edge case tests
- Test error paths
- Verify async code coverage

### Performance Tests
- Use consistent timing mechanisms
- Account for CI environment variations
- Test with representative data sizes

## Adding New Tests

### 1. Choose the Right Level
- **Unit**: Single function/class
- **Integration**: Multiple components
- **E2E**: Full user journey

### 2. Follow Naming Conventions
- Descriptive test names
- Group related tests in describe blocks
- Use consistent file naming (`*.test.ts`)

### 3. Mock Appropriately
- Mock external dependencies
- Don't mock the code under test
- Use realistic mock data

### 4. Test Both Happy and Sad Paths
- Normal operation
- Error conditions
- Edge cases
- Invalid inputs

## Maintenance

### Regular Tasks
- Update mocks when APIs change
- Adjust coverage thresholds as code evolves
- Review and update integration test scenarios
- Monitor test performance and optimize slow tests

### When Adding Features
- Add tests before implementing (TDD)
- Update integration tests for new workflows
- Verify coverage meets requirements
- Document any new testing patterns