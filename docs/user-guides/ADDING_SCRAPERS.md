# Adding Scrapers Guide

This comprehensive guide covers how to add new data sources (scrapers) to Gigateer, including plugin architecture, implementation patterns, testing, and best practices.

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Getting Started](#getting-started)
- [Scraper Types](#scraper-types)
- [Implementation Guide](#implementation-guide)
- [Testing Your Scraper](#testing-your-scraper)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

Gigateer's scraper system is built on a plugin architecture that allows easy addition of new data sources. Each scraper is an independent plugin that:

- **Fetches data** from external sources (RSS, APIs, HTML)
- **Transforms data** into the standard Gig schema
- **Handles errors** gracefully with retries and fallbacks
- **Respects rate limits** and site policies
- **Provides metadata** about its operation

### What You'll Learn

- How to create different types of scrapers
- Data transformation and validation
- Error handling and resilience patterns
- Testing and debugging techniques
- Performance optimization strategies

## Plugin Architecture

### Core Components

```
services/ingestor/src/plugins/
├── example-venue.ts           # Template for new scrapers
├── bandsintown-rss-scraper.ts # RSS feed scraper example
├── html-playwright-scraper.ts  # HTML scraper example
├── rss-ical-scraper.ts        # RSS/iCal hybrid example
└── your-new-scraper.ts        # Your implementation
```

### Plugin Interface

All scrapers implement the `ScraperPlugin` interface:

```typescript
interface ScraperPlugin {
  name: string;
  displayName: string;
  description: string;
  version: string;
  
  // Core scraping method
  scrape(config: IngestorConfig): Promise<ScraperResult>;
  
  // Optional configuration validation
  validateConfig?(config: IngestorConfig): Promise<string[]>;
  
  // Optional health check
  healthCheck?(): Promise<HealthStatus>;
}
```

## Getting Started

### 1. Choose Your Template

Start with the appropriate template based on your data source:

```bash
cd services/ingestor/src/plugins

# For RSS feeds
cp rss-ical-scraper.ts my-venue-scraper.ts

# For HTML scraping
cp html-playwright-scraper.ts my-venue-scraper.ts

# For APIs or custom sources
cp example-venue.ts my-venue-scraper.ts
```

### 2. Basic Setup

Edit your new scraper file:

```typescript
import { ScraperPlugin, ScraperResult, IngestorConfig } from '@gigateer/contracts';
import { logger } from '../logger.js';

export const MyVenueScraper: ScraperPlugin = {
  name: 'my-venue',
  displayName: 'My Venue',
  description: 'Scrapes gigs from My Venue website',
  version: '1.0.0',

  async scrape(config: IngestorConfig): Promise<ScraperResult> {
    logger.info('Starting scrape for My Venue');
    
    try {
      // Your scraping logic here
      const gigs = await fetchAndTransformGigs();
      
      return {
        success: true,
        gigs,
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: this.name,
          count: gigs.length
        }
      };
    } catch (error) {
      logger.error('Scraping failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        gigs: [],
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: this.name,
          count: 0
        }
      };
    }
  }
};
```

### 3. Test Your Scraper

```bash
# Test your new scraper
pnpm ingest:source my-venue

# Check the output
cat data/sources/my-venue.json

# Validate against schema
pnpm validate
```

## Scraper Types

### 1. RSS Feed Scrapers

**Best for**: Venues with RSS feeds, event listing sites

**Example**: Bandsintown, Songkick RSS feeds

```typescript
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['description', 'description'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator']
    ]
  }
});

async function scrapeRSSFeed(feedUrl: string): Promise<Gig[]> {
  const feed = await parser.parseURL(feedUrl);
  
  return feed.items.map(item => ({
    id: generateGigId(item.link || item.guid),
    title: item.title,
    description: item.description || item.contentEncoded,
    url: item.link,
    date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    // ... other fields
  }));
}
```

### 2. HTML Web Scrapers

**Best for**: Venue websites, event pages without APIs

**Example**: Individual venue calendars

```typescript
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

async function scrapeVenueWebsite(url: string): Promise<Gig[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for dynamic content
    await page.waitForSelector('.event-list', { timeout: 10000 });
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const gigs: Gig[] = [];
    
    $('.event-item').each((index, element) => {
      const $event = $(element);
      
      gigs.push({
        id: generateGigId($event.find('a').attr('href')),
        title: $event.find('.event-title').text().trim(),
        venue: $event.find('.venue-name').text().trim(),
        date: parseEventDate($event.find('.event-date').text()),
        url: new URL($event.find('a').attr('href'), url).href,
        // ... other fields
      });
    });
    
    return gigs;
  } finally {
    await browser.close();
  }
}
```

### 3. API Scrapers

**Best for**: Services with public APIs (Eventbrite, Ticketmaster)

```typescript
async function scrapeEventbriteAPI(apiKey: string): Promise<Gig[]> {
  const response = await fetch(
    `https://www.eventbriteapi.com/v3/events/search/?location.address=New+York&token=${apiKey}`
  );
  
  const data = await response.json();
  
  return data.events.map(event => ({
    id: generateGigId(event.url),
    title: event.name.text,
    description: event.description.text,
    venue: event.venue?.name || 'TBD',
    date: event.start.utc,
    url: event.url,
    // ... other fields
  }));
}
```

### 4. iCal Calendar Scrapers

**Best for**: Venues publishing .ics calendar files

```typescript
import ical from 'node-ical';

async function scrapeiCalFeed(calendarUrl: string): Promise<Gig[]> {
  const events = await ical.fromURL(calendarUrl);
  const gigs: Gig[] = [];
  
  Object.values(events).forEach(event => {
    if (event.type === 'VEVENT' && event.start) {
      gigs.push({
        id: generateGigId(event.uid || event.summary),
        title: event.summary,
        description: event.description,
        date: event.start.toISOString(),
        location: event.location,
        url: event.url,
        // ... other fields
      });
    }
  });
  
  return gigs;
}
```

## Implementation Guide

### Step 1: Data Fetching

Choose the appropriate method for your data source:

```typescript
// HTTP/REST API
async function fetchFromAPI(url: string, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// RSS/Atom feeds
async function fetchRSSFeed(feedUrl: string) {
  const parser = new Parser();
  return await parser.parseURL(feedUrl);
}

// HTML with Playwright (for dynamic content)
async function fetchWithPlaywright(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return await page.content();
  } finally {
    await browser.close();
  }
}

// HTML with simple HTTP (for static content)
async function fetchHTML(url: string) {
  const response = await fetch(url);
  return await response.text();
}
```

### Step 2: Data Transformation

Transform the fetched data into the standard Gig schema:

```typescript
import { GigSchema, type Gig } from '@gigateer/contracts';

function transformToGig(rawEvent: any, source: string): Gig {
  // Create base gig object
  const gig: Gig = {
    id: generateGigId(rawEvent.url || rawEvent.id, source),
    title: cleanText(rawEvent.title || rawEvent.name),
    artist: extractArtistName(rawEvent.title),
    venue: cleanText(rawEvent.venue || rawEvent.location),
    location: normalizeLocation(rawEvent.city, rawEvent.state),
    date: normalizeDate(rawEvent.date || rawEvent.start_time),
    description: cleanText(rawEvent.description),
    url: normalizeURL(rawEvent.url),
    imageUrl: normalizeImageURL(rawEvent.image),
    price: normalizePrice(rawEvent.price),
    genre: categorizeGenre(rawEvent.tags || rawEvent.category),
    source: source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Validate against schema
  const result = GigSchema.safeParse(gig);
  if (!result.success) {
    throw new Error(`Invalid gig data: ${result.error.message}`);
  }

  return result.data;
}
```

### Step 3: Utility Functions

Implement common data cleaning functions:

```typescript
// Generate consistent IDs
function generateGigId(url: string, source: string): string {
  const hash = createHash('md5')
    .update(`${source}:${url}`)
    .digest('hex');
  return `${source}-${hash.substring(0, 12)}`;
}

// Clean and normalize text
function cleanText(text: string): string {
  return text
    ?.replace(/\s+/g, ' ')
    .replace(/[^\w\s-.,!?()]/g, '')
    .trim()
    .substring(0, 500) || '';
}

// Extract artist from title
function extractArtistName(title: string): string {
  // Common patterns: "Artist Name at Venue", "Artist Name | Venue"
  const match = title.match(/^([^@|]+?)(?:\s+(?:at|@|\|)\s+)/i);
  return match ? match[1].trim() : title;
}

// Normalize dates
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Normalize URLs
function normalizeURL(url: string, baseUrl?: string): string {
  if (!url) return '';
  
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

// Categorize genres
function categorizeGenre(tags: string[]): string {
  const genreMap = {
    'rock': ['rock', 'indie', 'alternative'],
    'jazz': ['jazz', 'blues', 'swing'],
    'electronic': ['electronic', 'techno', 'house', 'edm'],
    'folk': ['folk', 'acoustic', 'singer-songwriter'],
    'classical': ['classical', 'opera', 'symphony']
  };
  
  for (const [genre, keywords] of Object.entries(genreMap)) {
    if (tags.some(tag => keywords.includes(tag.toLowerCase()))) {
      return genre;
    }
  }
  
  return 'other';
}
```

### Step 4: Error Handling

Implement robust error handling:

```typescript
async function scrapeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  backoffMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      logger.warn('Scrape attempt failed', {
        attempt,
        maxRetries,
        error: error.message
      });

      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Usage in scraper
async scrape(config: IngestorConfig): Promise<ScraperResult> {
  return await scrapeWithRetry(async () => {
    const rawData = await fetchEventData();
    const gigs = rawData.map(event => transformToGig(event, this.name));
    
    return {
      success: true,
      gigs,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: this.name,
        count: gigs.length
      }
    };
  });
}
```

### Step 5: Rate Limiting

Respect external service rate limits:

```typescript
import Bottleneck from 'bottleneck';

// Create rate limiter
const limiter = new Bottleneck({
  reservoir: 60,       // Start with 60 requests
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000, // Per minute
  maxConcurrent: 2,    // Max 2 concurrent requests
  minTime: 1000        // Min 1 second between requests
});

// Wrap API calls
async function fetchWithRateLimit(url: string) {
  return limiter.schedule(() => fetch(url));
}
```

## Testing Your Scraper

### Unit Testing

Create test files in `services/ingestor/src/plugins/__tests__/`:

```typescript
// my-venue-scraper.test.ts
import { MyVenueScraper } from '../my-venue-scraper.js';
import { mockIngestorConfig } from './test-utils.js';

describe('MyVenueScraper', () => {
  it('should scrape and transform gigs correctly', async () => {
    const result = await MyVenueScraper.scrape(mockIngestorConfig);
    
    expect(result.success).toBe(true);
    expect(result.gigs).toHaveLength(greaterThan(0));
    
    // Test first gig structure
    const firstGig = result.gigs[0];
    expect(firstGig.id).toMatch(/^my-venue-[a-f0-9]{12}$/);
    expect(firstGig.title).toBeDefined();
    expect(firstGig.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('should handle network errors gracefully', async () => {
    // Mock network failure
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    
    const result = await MyVenueScraper.scrape(mockIngestorConfig);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
    expect(result.gigs).toHaveLength(0);
  });
});
```

### Manual Testing

```bash
# Test individual scraper
pnpm ingest:source my-venue

# Test with debug logging
DEBUG=* pnpm ingest:source my-venue

# Test with specific configuration
INGESTOR_LOG_LEVEL=debug pnpm ingest:source my-venue

# Validate output schema
pnpm validate --file data/sources/my-venue.json

# Test merge process
pnpm merge
```

### Integration Testing

```typescript
// integration.test.ts
describe('Integration Tests', () => {
  it('should complete full pipeline', async () => {
    // Run scraper
    await ingestSource('my-venue');
    
    // Check file was created
    const sourceFile = 'data/sources/my-venue.json';
    expect(fs.existsSync(sourceFile)).toBe(true);
    
    // Run merge
    await mergeSources();
    
    // Check catalog was updated
    const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
    expect(catalog.gigs.some(gig => gig.source === 'my-venue')).toBe(true);
  });
});
```

## Best Practices

### 1. Respect Rate Limits

```typescript
// Good: Implement rate limiting
const limiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshInterval: 60 * 1000,
  minTime: 500
});

// Good: Check robots.txt compliance
async function checkRobotsCompliance(url: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', url).href;
    const robotsText = await fetch(robotsUrl).then(r => r.text());
    // Parse robots.txt and check compliance
    return true; // Implement actual check
  } catch {
    return true; // Assume allowed if robots.txt unavailable
  }
}
```

### 2. Handle Errors Gracefully

```typescript
// Good: Comprehensive error handling
async scrape(config: IngestorConfig): Promise<ScraperResult> {
  try {
    const gigs = await this.fetchGigs();
    return this.successResult(gigs);
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      return this.errorResult('Network connectivity issue');
    } else if (error.response?.status === 429) {
      return this.errorResult('Rate limit exceeded, try again later');
    } else if (error.response?.status === 403) {
      return this.errorResult('Access forbidden, check permissions');
    } else {
      logger.error('Unexpected error', { error: error.message });
      return this.errorResult('Unexpected error occurred');
    }
  }
}
```

### 3. Data Quality

```typescript
// Good: Validate and clean data
function validateGigData(gig: Partial<Gig>): string[] {
  const errors: string[] = [];
  
  if (!gig.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (gig.date && !isValidDate(gig.date)) {
    errors.push('Invalid date format');
  }
  
  if (gig.url && !isValidURL(gig.url)) {
    errors.push('Invalid URL format');
  }
  
  return errors;
}

// Good: Implement deduplication
function isDuplicateGig(gig1: Gig, gig2: Gig): boolean {
  return (
    normalizeString(gig1.title) === normalizeString(gig2.title) &&
    gig1.venue === gig2.venue &&
    Math.abs(new Date(gig1.date).getTime() - new Date(gig2.date).getTime()) < 3600000 // 1 hour
  );
}
```

### 4. Performance Optimization

```typescript
// Good: Batch processing
async function processInBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
```

### 5. Configuration

```typescript
// Good: Make scrapers configurable
interface MyVenueConfig {
  apiKey?: string;
  baseUrl?: string;
  maxPages?: number;
  categories?: string[];
}

const MyVenueScraper: ScraperPlugin = {
  // ... other properties
  
  async validateConfig(config: IngestorConfig): Promise<string[]> {
    const errors: string[] = [];
    const venueConfig = config.scraperConfigs?.['my-venue'] as MyVenueConfig;
    
    if (venueConfig?.apiKey && venueConfig.apiKey.length < 10) {
      errors.push('API key must be at least 10 characters');
    }
    
    if (venueConfig?.maxPages && venueConfig.maxPages < 1) {
      errors.push('Max pages must be at least 1');
    }
    
    return errors;
  }
};
```

## Common Patterns

### 1. Date Parsing

```typescript
function parseFlexibleDate(dateStr: string): string | null {
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/, // YYYY-MM-DD HH:mm
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, // MM/DD/YYYY HH:mm
    /^(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{2}):(\d{2})/, // Month DD, YYYY HH:mm
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      // Parse based on pattern and return ISO string
      const date = new Date(/* construct from match groups */);
      return date.toISOString();
    }
  }
  
  // Fallback to Date constructor
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
}
```

### 2. Dynamic Content Loading

```typescript
async function waitForDynamicContent(page: Page): Promise<void> {
  try {
    // Wait for specific selector
    await page.waitForSelector('.event-list', { timeout: 10000 });
    
    // Wait for loading indicator to disappear
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 5000 });
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    
    // Scroll to load more content if needed
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait a bit more for lazy loading
    await page.waitForTimeout(2000);
  } catch (error) {
    logger.warn('Timeout waiting for dynamic content', { error: error.message });
  }
}
```

### 3. Data Normalization

```typescript
class DataNormalizer {
  static normalizeVenueName(name: string): string {
    return name
      .replace(/\b(the|a|an)\b/gi, '') // Remove articles
      .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }
  
  static normalizeLocation(city: string, state: string): string {
    const normalizedCity = city?.trim().replace(/\s+/g, ' ');
    const normalizedState = state?.trim().toUpperCase();
    
    if (normalizedCity && normalizedState) {
      return `${normalizedCity}, ${normalizedState}`;
    }
    
    return normalizedCity || normalizedState || '';
  }
  
  static categorizePrice(priceStr: string): string {
    if (!priceStr || /free|no.charge/i.test(priceStr)) {
      return 'Free';
    }
    
    const match = priceStr.match(/\$?(\d+(?:\.\d{2})?)/);
    if (match) {
      const price = parseFloat(match[1]);
      if (price < 20) return 'Under $20';
      if (price < 50) return '$20-$50';
      if (price < 100) return '$50-$100';
      return 'Over $100';
    }
    
    return 'Price TBD';
  }
}
```

## Troubleshooting

### Common Issues

**1. Network Timeouts**
```typescript
// Solution: Increase timeout and add retries
const fetchWithTimeout = async (url: string, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
```

**2. Rate Limiting**
```typescript
// Solution: Implement exponential backoff
async function fetchWithBackoff(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const delay = Math.min(retryAfter * 1000, Math.pow(2, attempt) * 1000);
        
        logger.info('Rate limited, waiting', { delay, attempt });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

**3. Invalid Data**
```typescript
// Solution: Comprehensive validation
function sanitizeGigData(rawGig: any): Partial<Gig> {
  return {
    title: typeof rawGig.title === 'string' ? rawGig.title.slice(0, 200) : '',
    date: isValidDate(rawGig.date) ? rawGig.date : null,
    venue: typeof rawGig.venue === 'string' ? rawGig.venue.slice(0, 100) : '',
    url: isValidURL(rawGig.url) ? rawGig.url : null,
    // ... other fields
  };
}
```

### Debug Helpers

```typescript
// Add debug logging
function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, data || '');
  }
}

// Profile performance
function profileAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return operation().finally(() => {
    const duration = Date.now() - start;
    logger.info('Operation completed', { name, duration });
  });
}
```

## Contributing

### Before Submitting

1. **Test thoroughly**: Run unit tests and manual testing
2. **Follow conventions**: Match existing code style and patterns
3. **Document changes**: Update relevant documentation
4. **Performance test**: Ensure scraper doesn't impact overall performance

### Pull Request Checklist

- [ ] Scraper follows the plugin interface
- [ ] Includes comprehensive tests
- [ ] Handles errors gracefully
- [ ] Respects rate limits and robots.txt
- [ ] Validates and cleans data appropriately
- [ ] Includes documentation and examples
- [ ] Performance tested with real data
- [ ] No hardcoded secrets or credentials

### Code Review Process

1. **Functionality**: Does it work correctly?
2. **Performance**: Is it efficient and scalable?
3. **Security**: Does it follow security best practices?
4. **Maintainability**: Is the code clean and well-documented?
5. **Testing**: Are there adequate tests?

---

For more information:
- [Development Guide](./DEVELOPMENT.md)
- [System Architecture](../architecture/SYSTEM_DESIGN.md)
- [Plugin Examples](../../services/ingestor/src/plugins/)