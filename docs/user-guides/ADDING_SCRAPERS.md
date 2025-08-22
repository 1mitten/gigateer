# Adding Scrapers Guide

This comprehensive guide covers how to add new data sources (scrapers) to Gigateer using the modern **JSON Configuration approach** and MongoDB management.

## Table of Contents

- [Quick Start: JSON Configuration (Recommended)](#quick-start-json-configuration-recommended)
- [MongoDB Configuration Management](#mongodb-configuration-management)
- [Advanced: Playwright Integration](#advanced-playwright-integration)
- [Testing Your Scraper](#testing-your-scraper)
- [Best Practices](#best-practices)
- [Legacy: TypeScript Plugins](#legacy-typescript-plugins)
- [Troubleshooting](#troubleshooting)

## Quick Start: JSON Configuration (Recommended)

**🎉 Revolutionary Update (Jan 2025)**: Create scrapers with JSON only - no TypeScript required!

### Why JSON Configuration?

- ⚡ **Faster development**: Minutes instead of hours
- 🎭 **Playwright integration**: Visual browser automation
- 🔧 **No code required**: Pure configuration approach
- 📦 **Automatic management**: MongoDB import/export support
- 🔍 **Easy debugging**: Visual snapshots and screenshots

### Create Your First Scraper

```bash
# 1. Copy an existing config as template
cd services/ingestor/data/scraper-configs/
cp bristol-electric.json my-venue.json

# 2. Edit the configuration
# Update site info, URLs, selectors, etc.

# 3. Test immediately
pnpm ingest:source my-venue

# 4. Import to MongoDB
pnpm import:scraper-configs
```

### JSON Configuration Structure

```json
{
  "site": {
    "name": "Venue Name",
    "baseUrl": "https://venue.com",
    "source": "venue-identifier",
    "description": "Description of the venue",
    "maintainer": "gigateer-team",
    "lastUpdated": "2025-08-22"
  },
  "browser": {
    "userAgent": "Mozilla/5.0...",
    "viewport": { "width": 1280, "height": 720 },
    "headless": true,
    "timeout": 60000
  },
  "rateLimit": {
    "delayBetweenRequests": 2000,
    "maxConcurrent": 1,
    "respectRobotsTxt": true
  },
  "workflow": [
    { "type": "navigate", "url": "https://venue.com/events" },
    { "type": "wait", "selector": ".events", "timeout": 30000 },
    { "type": "click", "selector": "button:has-text('Load More')", "optional": true },
    { "type": "extract", "containerSelector": ".event", "fields": { ... } }
  ],
  "mapping": { ... },
  "validation": { ... },
  "debug": { "screenshots": false, "saveHtml": false }
}
```

### Available Scrapers (Aug 2025)

**Bristol Venues (8 active)**:
- `bristol-electric` (Electric Bristol) - with Load More pagination
- `bristol-exchange` (Exchange Bristol)
- `bristol-fleece` (The Fleece Bristol)
- `bristol-louisiana` (The Louisiana Bristol)
- `bristol-strange-brew` (Strange Brew Bristol)
- `bristol-the-croft` (The Croft)
- `bristol-the-lanes` (The Lanes Bristol)
- `bristol-thekla` (Thekla Bristol)

## MongoDB Configuration Management

### Import Configurations

```bash
# Import all scraper configs to MongoDB
pnpm import:scraper-configs
```

**Features**:
- 🔍 **Auto-discovery**: Finds configs in all standard locations
- 🔄 **Smart upserts**: Uses SHA-256 hash to detect changes
- 🛡️ **Duplicate prevention**: Unique constraints on `sourceId`
- 📊 **Change tracking**: Preserves timestamps, tracks updates
- ❌ **Error handling**: Graceful handling of missing fields

### Collection Schema

```typescript
// MongoDB collection: config_scraper
interface ScraperConfig {
  _id: ObjectId;
  sourceId: string;        // Unique identifier (site.source)
  configPath: string;      // Relative path to config file
  configHash: string;      // SHA-256 for change detection
  site: SiteInfo;         // Site metadata
  browser: BrowserConfig;  // Browser settings
  workflow: WorkflowStep[]; // Scraping workflow
  mapping: MappingConfig;  // Data transformation
  importedAt: Date;       // First import
  updatedAt: Date;        // Last update
}
```

### Usage Examples

```bash
# View imported configurations
mongosh gigateer --eval "db.config_scraper.find({}, {sourceId: 1, 'site.name': 1})"

# Check for changes
pnpm import:scraper-configs  # Shows inserted/updated/unchanged status

# Production deployment
MONGODB_CONNECTION_STRING="mongodb://prod-server:27017" pnpm import:scraper-configs
```

## Advanced: Playwright Integration

### Using Agents for Scraper Development

**Recommended Workflow**:

1. **Use backend-architect agent** with Playwright MCP capabilities
2. **Agent explores website** visually and interactively  
3. **Agent identifies selectors** through live browser interaction
4. **Agent creates JSON config** with discovered elements
5. **Agent tests configuration** immediately with real data

### Example Agent Request

```text
Create a scraper for https://newvenue.com/events using Playwright to:
1. Navigate to the events page
2. Handle any "Load More" buttons for pagination
3. Extract event titles, dates, venues, and ticket links
4. Create a JSON configuration following the bristol-electric.json format
```

### Playwright Workflow Steps

```json
{
  "workflow": [
    { 
      "type": "navigate", 
      "url": "https://venue.com/events" 
    },
    { 
      "type": "wait", 
      "selector": ".events", 
      "condition": "visible",
      "timeout": 30000
    },
    { 
      "type": "scroll", 
      "direction": "down", 
      "distance": 1000 
    },
    { 
      "type": "click", 
      "selector": "button:has-text('Load More')", 
      "optional": true 
    },
    { 
      "type": "wait", 
      "timeout": 3000 
    },
    { 
      "type": "extract", 
      "containerSelector": ".event-item", 
      "fields": {
        "title": { "selector": ".event-title", "attribute": "text" },
        "date": { "selector": ".event-date", "attribute": "text" },
        "url": { "selector": "a", "attribute": "href", "transform": "url" }
      }
    }
  ]
}
```

### Pagination Handling

```json
{
  "workflow": [
    { "type": "navigate", "url": "https://venue.com/events" },
    { "type": "wait", "selector": ".events", "timeout": 30000 },
    
    // Handle multiple Load More clicks
    { "type": "click", "selector": "button:has-text('Load More')", "optional": true },
    { "type": "wait", "timeout": 3000 },
    { "type": "click", "selector": "button:has-text('Load More')", "optional": true },
    { "type": "wait", "timeout": 3000 },
    { "type": "click", "selector": "button:has-text('Load More')", "optional": true },
    { "type": "wait", "timeout": 3000 },
    
    { "type": "extract", "containerSelector": ".event", "fields": { ... } }
  ]
}
```

## Testing Your Scraper

### Basic Testing

```bash
# Test a specific scraper
pnpm ingest:source my-venue

# Check the generated data
ls -la data/sources/my-venue.*

# View normalized output
cat data/sources/my-venue.normalized.json | jq
```

### Health Check Testing

```bash
# Run scraper health checks
pnpm --filter ingestor test --testPathPattern=health-check

# Test via API (requires server running)
curl "http://localhost:3000/api/scrapers/health?scraper=my-venue"
```

### Debug Mode

Enable debugging in your JSON config:

```json
{
  "debug": {
    "screenshots": true,
    "saveHtml": true,
    "logLevel": "debug"
  }
}
```

This will save screenshots and HTML snapshots to help debug selector issues.

## Best Practices

### Configuration Best Practices

1. **Use descriptive sourceIds**: `bristol-electric` not `be`
2. **Include maintainer info**: Who to contact for issues
3. **Set realistic timeouts**: Account for slow-loading sites
4. **Respect rate limits**: Don't overwhelm target sites
5. **Handle optional elements**: Use `"required": false` for optional fields

### Selector Best Practices

1. **Prefer stable selectors**: Classes like `.event-title` over nth-child
2. **Test selectors live**: Use Playwright MCP to verify on actual pages
3. **Handle dynamic content**: Use appropriate wait conditions
4. **Plan for changes**: Use multiple fallback selectors when possible

### Performance Optimization

```json
{
  "browser": {
    "headless": true,          // Faster than non-headless
    "timeout": 30000          // Reasonable timeout
  },
  "rateLimit": {
    "delayBetweenRequests": 2000,  // Be respectful
    "maxConcurrent": 1             // Avoid overwhelming servers
  }
}
```

### Error Handling

```json
{
  "workflow": [
    {
      "type": "click",
      "selector": "button.load-more",
      "optional": true,         // Won't fail if button doesn't exist
      "timeout": 5000
    }
  ],
  "validation": {
    "required": ["title"],      // Ensure essential fields exist
    "minEventsExpected": 1,     // Fail if no events found
    "maxEventsExpected": 500    // Fail if too many (likely error)
  }
}
```

## Legacy: TypeScript Plugins

**Note**: TypeScript plugins are legacy. Use JSON configuration for new scrapers.

### When to Use TypeScript
- Complex custom logic beyond JSON capabilities
- Advanced API authentication
- Custom data transformations
- Integration with external services

### Plugin Structure

```
services/ingestor/src/plugins/
├── example-venue.ts           # Template for new scrapers
└── your-custom-scraper.ts     # Custom implementation
```

### TypeScript Plugin Interface

```typescript
interface ScraperPlugin {
  name: string;
  displayName: string;
  description: string;
  version: string;
  scrape(config: IngestorConfig): Promise<ScraperResult>;
  validateConfig?(config: IngestorConfig): Promise<string[]>;
  healthCheck?(): Promise<HealthStatus>;
}
```

## Troubleshooting

### Common Issues

1. **Selectors not found**
   - Use Playwright MCP to inspect live page
   - Check for dynamic content loading
   - Verify CSS selectors are correct

2. **Timeout errors**
   - Increase timeout values
   - Add appropriate wait conditions
   - Check network connectivity

3. **No events extracted**
   - Verify containerSelector matches event elements
   - Check field selectors within containers
   - Enable debug mode for HTML snapshots

4. **Import failures**
   - Check MongoDB connection
   - Verify JSON syntax is valid
   - Ensure required fields (site.source, site.name) exist

### Debug Commands

```bash
# Enable verbose logging
DEBUG=* pnpm ingest:source my-venue

# Check scraper is loaded
pnpm --filter ingestor run config:show

# Validate configuration
pnpm --filter ingestor run config:validate

# Test with screenshots
# Edit config: "debug": { "screenshots": true }
pnpm ingest:source my-venue
```

### Getting Help

1. **Check existing configs**: Use bristol-electric.json as reference
2. **Use agents**: backend-architect agent can help create configurations
3. **Test incrementally**: Start simple, add complexity gradually
4. **Monitor health**: Use health check APIs to track performance

## Summary

The JSON configuration approach with MongoDB management provides:

- ⚡ **Rapid development**: Create scrapers in minutes
- 🎭 **Visual debugging**: Playwright integration for live testing
- 📦 **Easy management**: MongoDB import/export for deployment
- 🔄 **Change tracking**: Automatic detection of configuration updates
- 🛡️ **Error prevention**: Built-in validation and duplicate handling

For new scrapers, always prefer JSON configuration over TypeScript plugins unless you have specific requirements that JSON cannot handle.