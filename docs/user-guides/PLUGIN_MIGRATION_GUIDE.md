# Plugin Migration Guide: TypeScript to Configuration-Driven

## Overview

This guide provides step-by-step instructions for migrating existing TypeScript plugins to JSON configuration files. The Exchange Bristol migration serves as the definitive example.

## Prerequisites

- Understanding of the existing TypeScript plugin structure
- Basic knowledge of JSON format
- Access to the ingestor service CLI tools

## Migration Process

### Step 1: Analyze TypeScript Plugin

First, examine the existing TypeScript plugin to understand its functionality:

```bash
# View the plugin structure
cat src/plugins/your-venue.ts

# Test the current plugin
pnpm ingest:source your-venue
```

**Key elements to identify:**
- Site URL and navigation logic
- Data extraction selectors
- Complex parsing logic (dates, venues, etc.)
- Rate limiting requirements
- Error handling patterns

### Step 2: Create JSON Configuration

Create a new configuration file:

```bash
cp data/scraper-configs/exchange-bristol.json data/scraper-configs/your-venue.json
```

#### 2.1 Basic Site Configuration

```json
{
  "site": {
    "name": "Your Venue Name",
    "baseUrl": "https://yourvenue.com",
    "source": "your-venue-slug",
    "description": "Description of the venue",
    "maintainer": "your-name",
    "lastUpdated": "2025-01-10"
  }
}
```

#### 2.2 Browser Configuration

```json
{
  "browser": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "viewport": { "width": 1280, "height": 720 },
    "headless": true,
    "timeout": 60000
  }
}
```

#### 2.3 Rate Limiting

```json
{
  "rateLimit": {
    "delayBetweenRequests": 2000,
    "maxConcurrent": 1,
    "respectRobotsTxt": true
  }
}
```

### Step 3: Define Workflow

#### 3.1 Simple Navigation + Extraction

For most venues, use this pattern:

```json
{
  "workflow": [
    {
      "type": "navigate",
      "url": "https://yourvenue.com/events"
    },
    {
      "type": "wait",
      "selector": ".event-item",
      "condition": "visible",
      "timeout": 30000
    },
    {
      "type": "extract",
      "containerSelector": ".event-item",
      "fields": {
        "title": {
          "selector": ".event-title",
          "attribute": "text",
          "required": false,
          "transform": "trim",
          "fallback": "Event at Venue"
        }
      }
    }
  ]
}
```

#### 3.2 Complex Navigation (Multiple Steps)

For sites requiring interaction:

```json
{
  "workflow": [
    {
      "type": "navigate",
      "url": "https://yourvenue.com"
    },
    {
      "type": "click",
      "selector": ".events-tab",
      "waitAfter": 2000
    },
    {
      "type": "scroll",
      "direction": "bottom"
    },
    {
      "type": "wait",
      "condition": "networkidle",
      "timeout": 10000
    },
    {
      "type": "extract",
      "containerSelector": ".event-listing",
      "fields": {...}
    }
  ]
}
```

### Step 4: Field Extraction Configuration

#### 4.1 Basic Field Mapping

```json
{
  "fields": {
    "title": {
      "selector": ".title, h1, h2",           // Multiple selectors as fallback
      "attribute": "text",                     // "text", "href", "src", etc.
      "required": false,                       // Don't fail if missing
      "transform": "trim",                     // Apply transformation
      "fallback": "Event at Venue"           // Default value if extraction fails
    },
    "artist": {
      "selector": ".artist",
      "attribute": "text",
      "required": false,
      "transform": "trim"
    },
    "eventUrl": {
      "selector": "a",
      "attribute": "href",
      "required": false,
      "transform": "url"                       // Resolve relative URLs
    },
    "image": {
      "selector": "img",
      "attribute": "src",
      "required": false
    }
  }
}
```

#### 4.2 Multiple Values

For fields that can have multiple values:

```json
{
  "artists": {
    "selector": ".artist",
    "attribute": "text",
    "multiple": true,                         // Extract from all matching elements
    "transform": "trim"
  },
  "tags": {
    "selector": ".tag",
    "attribute": "text", 
    "multiple": true,
    "transform": "trim"
  }
}
```

#### 4.3 Custom Transformations

For complex data parsing, use custom transformations:

```json
{
  "startTime": {
    "selector": ".datetime",
    "attribute": "text",
    "transform": "exchange-bristol-datetime",   // Custom transform function
    "transformParams": {
      "dateGroup": "contextual-date"
    }
  }
}
```

### Step 5: Data Mapping

Map extracted fields to the final Gig object structure:

```json
{
  "mapping": {
    "id": {
      "strategy": "generated",
      "fields": ["title", "venue", "startTime"]
    },
    "title": "title",
    "artists": "artist",
    "venue": {
      "name": "venue",
      "address": "123 Main St",               // Static values allowed
      "city": "Your City",
      "country": "UK"
    },
    "date": {
      "start": "startTime",
      "end": "endTime",
      "timezone": "Europe/London"
    },
    "urls": {
      "event": "eventUrl",
      "tickets": "ticketsUrl"
    },
    "images": "image",
    "tags": "genres",                         // Map "genres" field to "tags"
    "description": "description"
  }
}
```

### Step 6: Validation Rules

Define validation and quality checks:

```json
{
  "validation": {
    "required": [],                           // Don't require any fields (be lenient)
    "minEventsExpected": 0,                   // Minimum expected results
    "maxEventsExpected": 500                  // Maximum expected results (sanity check)
  }
}
```

### Step 7: Debug Configuration

Enable debugging during development:

```json
{
  "debug": {
    "screenshots": true,                      // Save page screenshots
    "saveHtml": false,                        // Save page HTML
    "logLevel": "debug"                       // Detailed logging
  }
}
```

## Special Cases & Advanced Patterns

### Complex Date Handling

For venues with complex date formats (like Exchange Bristol):

```json
{
  "workflow": [
    {
      "type": "extract",
      "method": "venue-specific-date-method",  // Use custom extraction method
      "containerSelector": ".event-listing"
    }
  ]
}
```

### Follow-up Data Extraction

For sites requiring secondary page visits:

```json
{
  "fields": {
    "eventUrl": {
      "selector": "a",
      "attribute": "href",
      "followUp": {
        "urlField": "eventUrl",               // Use this field's URL
        "fields": {
          "fullDescription": {
            "selector": ".full-description",
            "attribute": "text",
            "transform": "trim"
          }
        }
      }
    }
  }
}
```

### Conditional Extraction

For optional data that may not exist:

```json
{
  "ageRestriction": {
    "selector": ".age-restriction",
    "attribute": "text",
    "required": false,
    "transform": "trim",
    "fallback": null                          // Explicitly set to null if missing
  }
}
```

## Testing & Validation

### Step 1: Test Configuration

```bash
# Test the new configuration
pnpm ingest:source your-venue

# Check for errors in logs
grep -i error data/run-logs/ingestor.log
```

### Step 2: Compare Results

```bash
# Run both versions and compare
pnpm ingest:source your-venue-old  # TypeScript version
pnpm ingest:source your-venue      # JSON version

# Compare event counts
curl -s "localhost:3002/api/gigs?source=your-venue" | jq '.pagination.total'
```

### Step 3: Validate Data Quality

```bash
# Check for required fields
curl -s "localhost:3002/api/gigs?source=your-venue&limit=5" | jq '.data[] | {title, venue, dateStart}'

# Check for tags/genres
curl -s "localhost:3002/api/gigs?source=your-venue&limit=5" | jq '.data[] | select(.tags | length > 0)'
```

## Migration Checklist

### Pre-Migration
- [ ] TypeScript plugin is working correctly
- [ ] Understand all custom logic in the plugin
- [ ] Identify complex parsing requirements
- [ ] Note performance characteristics

### Configuration Creation
- [ ] Site information configured
- [ ] Browser settings appropriate
- [ ] Rate limiting configured
- [ ] Workflow steps defined
- [ ] Field extraction mapping complete
- [ ] Data mapping configured
- [ ] Validation rules set
- [ ] Debug settings enabled

### Testing
- [ ] Configuration loads without errors
- [ ] Same number of events extracted
- [ ] All important fields populated
- [ ] Date parsing working correctly
- [ ] URLs properly resolved
- [ ] Images extracted correctly
- [ ] Tags/genres mapped properly

### Deployment
- [ ] Performance comparable to TypeScript
- [ ] Error rates acceptable
- [ ] Data quality maintained
- [ ] TypeScript plugin disabled
- [ ] Documentation updated

### Post-Migration
- [ ] Monitor for issues over several runs
- [ ] Verify web API data quality
- [ ] Check search functionality
- [ ] Performance metrics stable
- [ ] Clean up old TypeScript files

## Common Issues & Solutions

### Issue: No Events Extracted
**Causes:**
- Incorrect container selector
- Missing wait conditions
- Changed site structure

**Solutions:**
```json
{
  "debug": {
    "screenshots": true,    // See what page looks like
    "saveHtml": true       // Inspect actual HTML
  }
}
```

### Issue: Missing Fields
**Causes:**
- Wrong selectors
- Dynamic content not loaded
- Field mapping errors

**Solutions:**
```json
{
  "fields": {
    "title": {
      "selector": ".title, h1, h2, .name",  // Multiple fallback selectors
      "fallback": "Event"                   // Always provide fallback
    }
  }
}
```

### Issue: Date Parsing Failures
**Causes:**
- Complex date formats
- Missing date context
- Timezone issues

**Solutions:**
```json
{
  "startTime": {
    "transform": "custom-date-parser",
    "transformParams": {
      "format": "DD/MM/YYYY HH:mm",
      "timezone": "Europe/London"
    }
  }
}
```

### Issue: Performance Degradation
**Causes:**
- Too many wait conditions
- Unnecessary screenshots
- Complex transformations

**Solutions:**
```json
{
  "browser": {
    "timeout": 30000        // Reduce timeout
  },
  "debug": {
    "screenshots": false    // Disable debug features
  }
}
```

## Best Practices

1. **Start Simple**: Begin with basic extraction, add complexity gradually
2. **Use Fallbacks**: Always provide fallback selectors and values
3. **Test Incrementally**: Test each field addition separately
4. **Monitor Performance**: Compare extraction speed with TypeScript version
5. **Document Decisions**: Add comments about complex configurations
6. **Version Control**: Track configuration changes carefully
7. **Validate Continuously**: Regular checks ensure ongoing data quality

## Example: Complete Migration

Here's the complete migration of a hypothetical venue:

### Before (TypeScript)
```typescript
// 75 lines of TypeScript code with custom date parsing,
// error handling, venue mapping, etc.
```

### After (JSON)
```json
{
  "site": {...},
  "browser": {...},
  "workflow": [
    { "type": "navigate", "url": "..." },
    { "type": "wait", "selector": "..." },
    { "type": "extract", "containerSelector": "...", "fields": {...} }
  ],
  "mapping": {...},
  "validation": {...}
}
```

**Result**: 75 lines of complex TypeScript → 50 lines of clear JSON configuration

This migration approach ensures zero-downtime transitions while maintaining full functionality and performance.