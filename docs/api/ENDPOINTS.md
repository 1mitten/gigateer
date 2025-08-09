# Gigateer API Endpoints

This document describes the REST API endpoints provided by the Gigateer web application for accessing aggregated gig data.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication
Currently, no authentication is required. The API is read-only and publicly accessible.

## Content Type
All API endpoints return JSON responses with `Content-Type: application/json`.

## Endpoints

### GET `/api/gigs`
Retrieve gigs with optional filtering, searching, and pagination.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `city` | string | No | Filter by city/location (case-insensitive) | `?city=New%20York` |
| `genre` | string | No | Filter by genre (case-insensitive) | `?genre=rock` |
| `dateFrom` | string | No | Start date filter (YYYY-MM-DD or ISO datetime) | `?dateFrom=2024-03-01` |
| `dateTo` | string | No | End date filter (YYYY-MM-DD or ISO datetime) | `?dateTo=2024-12-31` |
| `venue` | string | No | Filter by venue name (partial match) | `?venue=Madison%20Square` |
| `q` | string | No | Search across title, artist, venue, and description | `?q=jazz%20festival` |
| `page` | number | No | Page number for pagination (default: 1) | `?page=2` |
| `limit` | number | No | Results per page (default: 20, max: 100) | `?limit=50` |

#### Example Requests
```bash
# Get all gigs (first page)
GET /api/gigs

# Search for jazz events
GET /api/gigs?q=jazz

# Filter by city and date range
GET /api/gigs?city=New%20York&dateFrom=2024-03-01&dateTo=2024-03-31

# Get second page with 50 results per page
GET /api/gigs?page=2&limit=50

# Complex filtering
GET /api/gigs?genre=rock&city=London&venue=O2&q=metalcore&page=1&limit=20
```

#### Response Format
```json
{
  "data": [
    {
      "id": "bandsintown-1234567890abcdef",
      "title": "Arctic Monkeys at Madison Square Garden",
      "artist": "Arctic Monkeys",
      "venue": "Madison Square Garden",
      "location": "New York, NY",
      "date": "2024-03-15T20:00:00.000Z",
      "description": "Arctic Monkeys bring their tour to NYC...",
      "url": "https://bandsintown.com/event/1234567890",
      "imageUrl": "https://images.bandsintown.com/thumb/1234.jpeg",
      "price": "$75-$150",
      "genre": "rock",
      "source": "bandsintown",
      "createdAt": "2024-03-01T10:15:30.000Z",
      "updatedAt": "2024-03-01T10:15:30.000Z"
    }
    // ... more gigs
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  },
  "meta": {
    "query": "jazz festival",
    "filters": {
      "city": "New York",
      "genre": "jazz",
      "dateFrom": "2024-03-01",
      "dateTo": "2024-03-31",
      "venue": "Blue Note"
    }
  }
}
```

#### Response Headers
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### GET `/api/gigs/[id]`
Retrieve detailed information for a specific gig by its unique identifier.

#### Parameters
- `id` (path): Unique gig identifier (e.g., `bandsintown-1234567890abcdef`)

#### Example Request
```bash
GET /api/gigs/bandsintown-1234567890abcdef
```

#### Response Format
```json
{
  "data": {
    "id": "bandsintown-1234567890abcdef",
    "title": "Arctic Monkeys at Madison Square Garden",
    "artist": "Arctic Monkeys",
    "venue": "Madison Square Garden",
    "location": "New York, NY",
    "date": "2024-03-15T20:00:00.000Z",
    "description": "Arctic Monkeys bring their tour to NYC with special guest...",
    "url": "https://bandsintown.com/event/1234567890",
    "imageUrl": "https://images.bandsintown.com/thumb/1234.jpeg",
    "price": "$75-$150",
    "genre": "rock",
    "source": "bandsintown",
    "createdAt": "2024-03-01T10:15:30.000Z",
    "updatedAt": "2024-03-01T10:15:30.000Z"
  }
}
```

#### Error Response (404)
```json
{
  "error": "Gig not found",
  "code": "GIG_NOT_FOUND"
}
```

### GET `/api/meta`
Retrieve metadata about the catalog, including statistics and source information.

#### Example Request
```bash
GET /api/meta
```

#### Response Format
```json
{
  "data": {
    "totalGigs": 1234,
    "sources": [
      {
        "name": "bandsintown",
        "lastRun": "2024-03-01T12:00:00.000Z",
        "gigCount": 456,
        "status": "success"
      },
      {
        "name": "eventbrite",
        "lastRun": "2024-03-01T11:45:00.000Z",
        "gigCount": 234,
        "status": "success"
      },
      {
        "name": "venue-calendar",
        "lastRun": "2024-03-01T11:30:00.000Z",
        "gigCount": 123,
        "status": "error"
      }
    ],
    "lastUpdated": "2024-03-01T12:00:00.000Z",
    "upcomingGigs": 1156,
    "pastGigs": 78
  }
}
```

## Data Schema

### Gig Object
```typescript
interface Gig {
  id: string;              // Unique identifier (source-prefixed hash)
  title: string;           // Event title
  artist: string;          // Primary artist/performer name
  venue: string;           // Venue name
  location: string;        // Location in "City, State" format
  date: string;            // ISO 8601 datetime string
  description?: string;    // Event description (optional)
  url: string;             // Original event URL
  imageUrl?: string;       // Event image URL (optional)
  price?: string;          // Price information (optional)
  genre?: string;          // Music genre (optional)
  source: string;          // Data source identifier
  createdAt: string;       // When first scraped (ISO 8601)
  updatedAt: string;       // Last update time (ISO 8601)
}
```

### Pagination Object
```typescript
interface Pagination {
  page: number;            // Current page number (1-indexed)
  limit: number;           // Results per page
  total: number;           // Total number of results
  pages: number;           // Total number of pages
}
```

### Source Stats Object
```typescript
interface SourceStats {
  name: string;            // Source identifier
  lastRun: string;         // Last scrape time (ISO 8601)
  gigCount: number;        // Number of gigs from this source
  status: 'success' | 'error' | 'running';  // Current status
}
```

## Error Responses

All error responses follow a consistent format:

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  code: string;            // Machine-readable error code
  details?: Record<string, string>;  // Additional error details (optional)
  retryAfter?: number;     // Seconds to wait before retrying (optional)
}
```

### 400 Bad Request
Invalid query parameters or request format.

```json
{
  "error": "Invalid query parameters",
  "code": "INVALID_PARAMS",
  "details": {
    "dateFrom": "Invalid date format. Expected YYYY-MM-DD or ISO datetime",
    "limit": "Must be between 1 and 100"
  }
}
```

### 404 Not Found
Requested gig was not found.

```json
{
  "error": "Gig not found",
  "code": "GIG_NOT_FOUND"
}
```

### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### 500 Internal Server Error
Server error occurred.

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

### 503 Service Unavailable
Service temporarily unavailable (e.g., catalog not loaded).

```json
{
  "error": "Catalog data not available",
  "code": "CATALOG_NOT_FOUND"
}
```

## Rate Limiting

### Limits
- **Per IP**: 100 requests per minute
- **Burst**: 10 requests per second
- **Global**: Shared across all endpoints

### Headers
Rate limit information is included in response headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Requests allowed per window | `100` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `95` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1640995200` |

### Handling Rate Limits
When rate limited, implement exponential backoff:

```javascript
async function makeRequest(url, retries = 3) {
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return makeRequest(url, retries - 1);
      }
      
      throw new Error('Rate limit exceeded');
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}
```

## Caching

### HTTP Caching
API responses include caching headers:

```http
Cache-Control: public, max-age=300
```

Responses are cached for 5 minutes. Use `If-None-Match` with ETags for conditional requests.

### Client-Side Caching
Implement client-side caching for better performance:

```javascript
class GigAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }
  
  async fetchGigs(params = {}) {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const response = await fetch(`/api/gigs?${new URLSearchParams(params)}`);
    const data = await response.json();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
}
```

## Filtering and Search

### Text Search (`q` parameter)
The search functionality looks for matches in:
- Event title
- Artist name
- Venue name
- Event description (if available)

Search is case-insensitive and supports partial matches.

### Date Filtering
Date parameters accept:
- **Date only**: `YYYY-MM-DD` (e.g., `2024-03-01`)
- **Full datetime**: ISO 8601 format (e.g., `2024-03-01T20:00:00Z`)

When using date-only format, times are interpreted as:
- `dateFrom`: Start of day (00:00:00)
- `dateTo`: End of day (23:59:59)

### Combining Filters
All filters can be combined. They work as AND conditions:

```bash
# Rock concerts in New York during March 2024 at venues containing "Garden"
GET /api/gigs?genre=rock&city=New%20York&dateFrom=2024-03-01&dateTo=2024-03-31&venue=Garden
```

## Pagination

### Best Practices
1. **Use appropriate page sizes**: Default 20, max 100
2. **Handle pagination properly**: Check `pages` field for total pages
3. **Implement progressive loading**: Load additional pages as needed

### Example Pagination Logic
```javascript
async function loadAllGigs(filters = {}) {
  const allGigs = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`/api/gigs?${new URLSearchParams({
      ...filters,
      page: page.toString(),
      limit: '100'
    })}`);
    
    const data = await response.json();
    allGigs.push(...data.data);
    
    hasMore = page < data.pagination.pages;
    page++;
  }
  
  return allGigs;
}
```

## Examples

### JavaScript/Node.js
```javascript
// Basic usage
const response = await fetch('/api/gigs?city=New%20York&limit=10');
const { data: gigs, pagination, meta } = await response.json();

console.log(`Found ${pagination.total} gigs in New York`);
console.log(`Showing page ${pagination.page} of ${pagination.pages}`);

// Get specific gig
const gigResponse = await fetch(`/api/gigs/${gigs[0].id}`);
const { data: gig } = await gigResponse.json();

console.log(`${gig.artist} at ${gig.venue} on ${new Date(gig.date).toLocaleDateString()}`);
```

### Python
```python
import requests
from datetime import datetime, timedelta

# Search for upcoming jazz events
params = {
    'genre': 'jazz',
    'dateFrom': datetime.now().isoformat(),
    'dateTo': (datetime.now() + timedelta(days=30)).isoformat(),
    'limit': 50
}

response = requests.get('http://localhost:3000/api/gigs', params=params)
data = response.json()

print(f"Found {data['pagination']['total']} upcoming jazz events")

for gig in data['data']:
    print(f"- {gig['artist']} at {gig['venue']} on {gig['date']}")
```

### curl
```bash
# Get all gigs
curl "http://localhost:3000/api/gigs"

# Search with filters
curl "http://localhost:3000/api/gigs?q=jazz&city=New%20York&limit=5"

# Get catalog metadata
curl "http://localhost:3000/api/meta"

# Get specific gig details
curl "http://localhost:3000/api/gigs/bandsintown-1234567890abcdef"
```

## Changelog

### v1.0.0 (Current)
- Initial API implementation
- File-based data storage
- Basic filtering and search
- Rate limiting
- Caching support

### Future Versions
- **v1.1**: Enhanced search with fuzzy matching
- **v1.2**: Geographic filtering with coordinates
- **v2.0**: Database migration with improved performance