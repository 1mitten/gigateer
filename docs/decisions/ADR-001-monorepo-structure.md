# ADR-001: Monorepo Structure Decision

**Date**: 2024-03-01  
**Status**: Accepted  
**Deciders**: Development Team  

## Context

Gigateer consists of multiple related components:
- Web application (Next.js PWA)
- Data ingestion service (Node.js with plugins)
- Shared contracts and types
- Future services (databases, APIs, mobile apps)

We needed to decide on the project structure that would best support development, deployment, and maintenance of these interconnected components.

## Decision

We will use a **monorepo structure** with pnpm workspaces, organized as follows:

```
gigateer/
├── apps/
│   └── web/                   # Next.js PWA application
├── packages/
│   └── contracts/             # Shared TypeScript types and Zod schemas
├── services/
│   └── ingestor/              # Data ingestion service with plugins
└── data/
    ├── sources/               # Raw scraped data per source
    ├── catalog.json           # Merged, deduplicated master catalog
    └── run-logs/              # Ingestion logs and status
```

## Options Considered

### Option 1: Separate Repositories (Polyrepo)
**Pros:**
- Clear separation of concerns
- Independent deployment cycles
- Different teams can own different repos
- Smaller repository size per service

**Cons:**
- Complex dependency management between services
- Difficult to coordinate changes across multiple repositories
- Code duplication for shared utilities
- Complex CI/CD coordination
- Version synchronization challenges

### Option 2: Monorepo with npm workspaces
**Pros:**
- Single repository for all related code
- Shared dependency management
- Easy cross-project refactoring
- Coordinated versioning
- Simplified CI/CD

**Cons:**
- Larger repository size
- Potential for tight coupling between services
- npm workspaces have limitations with dependency resolution

### Option 3: Monorepo with pnpm workspaces (Chosen)
**Pros:**
- All benefits of monorepo structure
- Superior dependency management with pnpm
- Fast, space-efficient package management
- Better workspace dependency resolution
- Excellent performance for large projects
- Built-in support for Turbo for build optimization

**Cons:**
- Learning curve for teams unfamiliar with pnpm
- Less widespread adoption than npm/yarn

## Rationale

The monorepo with pnpm workspaces was chosen because:

### 1. **Shared Dependencies and Types**
The web application and ingestor service need to share TypeScript types and validation schemas. A monorepo makes this trivial with workspace dependencies, while separate repos would require complex publishing/versioning workflows.

### 2. **Coordinated Development**
Changes to data schemas or API contracts need to be reflected across multiple components. Monorepo allows atomic commits that update all affected services simultaneously.

### 3. **Build Optimization**
With Turbo, we can optimize builds across the entire codebase, caching results and only rebuilding what's necessary. This is much more complex with separate repositories.

### 4. **Developer Experience**
- Single `git clone` to get the entire project
- Single place to file issues and track project status
- Unified development environment setup
- Easy cross-service debugging

### 5. **pnpm Advantages**
- **Disk Efficiency**: pnpm uses hard links, saving significant disk space
- **Fast Installs**: Content-addressable storage makes installs much faster
- **Strict Dependencies**: Prevents phantom dependencies that plague other package managers
- **Workspace Support**: Excellent workspace dependency management

## Implementation Details

### Workspace Configuration
```json
// package.json
{
  "workspaces": [
    "apps/*",
    "packages/*", 
    "services/*"
  ]
}
```

### Build System
- **Turbo**: For coordinated builds and caching
- **TypeScript Project References**: For efficient incremental compilation
- **Shared ESLint/Prettier**: Consistent code formatting across all packages

### Dependency Management
- **Shared Dependencies**: Common dependencies (TypeScript, testing tools) at root
- **Workspace Dependencies**: Internal packages reference each other with `workspace:*`
- **Selective Dependencies**: Each workspace only installs what it needs

### CI/CD Strategy
- **Monolithic Pipeline**: Single CI/CD pipeline with conditional steps based on changed files
- **Turborepo Cache**: Remote caching for build artifacts
- **Coordinated Releases**: All components versioned and released together

## Consequences

### Positive
- **Simplified Development**: Single repository checkout, unified tooling
- **Type Safety**: Shared types ensure consistency across services
- **Atomic Changes**: Changes spanning multiple services can be made atomically
- **Build Efficiency**: Turbo provides excellent build caching and parallelization
- **Dependency Management**: pnpm resolves complex workspace dependencies correctly

### Negative
- **Repository Size**: Repository will grow larger over time
- **Build Complexity**: Need to manage build dependencies between workspaces
- **Deployment Coordination**: Need to coordinate deployments when services have interdependencies
- **Team Boundaries**: May blur ownership boundaries between services

### Neutral
- **Learning Curve**: Team needs to learn pnpm and Turbo, but these are well-documented tools
- **Tool Ecosystem**: Most tools support monorepos, though some configuration may be needed

## Migration Path

If we need to move away from monorepo in the future:

1. **Extract Services**: Each workspace can be extracted to its own repository
2. **Publish Contracts**: Shared packages can be published to npm registry
3. **Update Dependencies**: Update imports to use published packages
4. **Separate CI/CD**: Create individual pipelines for each repository

This migration path is straightforward because workspaces are already well-isolated.

## Monitoring and Success Metrics

We will evaluate this decision based on:
- **Developer Productivity**: Time to set up development environment, make cross-service changes
- **Build Performance**: Build times and cache hit rates with Turbo
- **Code Quality**: Consistency of types and interfaces across services  
- **Team Satisfaction**: Developer experience and ease of contributing

## References

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo vs Polyrepo Comparison](https://github.com/joelparkerhenderson/monorepo-vs-polyrepo)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**Next Review**: 6 months after implementation
**Review Criteria**: Developer productivity metrics, build performance, code quality consistency