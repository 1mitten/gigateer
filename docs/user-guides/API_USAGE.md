# API Usage Guide

This guide covers how to interact with the Gigateer API, including authentication, endpoints, request/response formats, and practical examples.

## Table of Contents

- [API Overview](#api-overview)
- [Base URL and Versioning](#base-url-and-versioning)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Request/Response Format](#requestresponse-format)
- [Filtering and Pagination](#filtering-and-pagination)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)
- [Client Libraries](#client-libraries)
- [Testing and Development](#testing-and-development)

## API Overview

The Gigateer API is a RESTful API that provides access to aggregated gig data from multiple sources. It supports:

- **Read-only access** to gig listings and details
- **Advanced filtering** by date, venue, location, and genre
- **Pagination** for efficient data retrieval
- **Metadata** about the catalog and data sources
- **JSON responses** with consistent schema validation

### Core Features

- 🔍 **Search and Filter**: Find gigs by multiple criteria
- 📄 **Pagination**: Handle large datasets efficiently
- 🕒 **Real-time Data**: Always up-to-date with latest scraping
- 🔒 **Schema Validation**: Reliable, typed responses
- ⚡ **Caching**: Optimized for performance

## Base URL and Versioning

### Base URL
```
https://your-domain.com/api
```

### API Version
Currently v1 (implicit). Future versions may use explicit versioning:
```
https://your-domain.com/api/v1/
```

## Authentication

**Current Status**: No authentication required (read-only API).

**Future Enhancement**: API key authentication may be added for:
- Rate limiting per client
- Usage analytics
- Premium features

## Endpoints

### 1. List Gigs

**GET `/api/gigs`**

Retrieve a paginated list of gigs with optional filtering.

**Parameters:**
- `search` (string, optional): Search term for venue names, artists, descriptions
- `venue` (string, optional): Filter by specific venue name
- `location` (string, optional): Filter by city or area
- `genre` (string, optional): Filter by music genre
- `dateFrom` (string, optional): Start date filter (ISO 8601 format)
- `dateTo` (string, optional): End date filter (ISO 8601 format)
- `sortBy` (string, optional): Sort field (`date`, `venue`, `artist`)
- `sortOrder` (string, optional): Sort direction (`asc`, `desc`)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "gigs": [
    {
      "id": "unique-gig-id",
      "title": "Band Name at Venue",
      "artist": "Band Name",
      "venue": "Venue Name",
      "location": "City, State",
      "date": "2024-03-15T20:00:00Z",
      "genre": "Rock",
      "description": "Concert description...",
      "url": "https://venue.com/event/123",
      "imageUrl": "https://venue.com/image.jpg",
      "price": "$25",
      "source": "bandsintown",
      "createdAt": "2024-03-01T10:00:00Z",
      "updatedAt": "2024-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "genre": "Rock",
      "location": "New York"
    },
    "available": {
      "venues": ["Venue A", "Venue B"],
      "locations": ["New York", "Boston"],
      "genres": ["Rock", "Jazz", "Folk"]
    }
  },
  "meta": {
    "totalGigs": 1500,
    "lastUpdated": "2024-03-01T09:30:00Z",
    "responseTime": 45
  }
}
```

### 2. Get Gig Details

**GET `/api/gigs/[id]`**

Retrieve detailed information for a specific gig.

**Parameters:**
- `id` (string, required): Unique gig identifier

**Response:**
```json
{
  "gig": {
    "id": "unique-gig-id",
    "title": "Band Name at Venue",
    "artist": "Band Name",
    "venue": "Venue Name",
    "location": "City, State",
    "date": "2024-03-15T20:00:00Z",
    "genre": "Rock",
    "description": "Detailed concert description...",
    "url": "https://venue.com/event/123",
    "imageUrl": "https://venue.com/image.jpg",
    "price": "$25",
    "source": "bandsintown",
    "sourceData": {
      "originalUrl": "https://bandsintown.com/event/123",
      "scrapedAt": "2024-03-01T10:00:00Z"
    },
    "relatedGigs": [
      {
        "id": "related-gig-1",
        "title": "Same Artist at Different Venue",
        "date": "2024-03-20T19:00:00Z"
      }
    ],
    "createdAt": "2024-03-01T10:00:00Z",
    "updatedAt": "2024-03-01T10:00:00Z"
  }
}
```

### 3. Get Metadata

**GET `/api/meta`**

Retrieve catalog metadata and statistics.

**Response:**
```json
{
  "catalog": {
    "totalGigs": 1500,
    "totalVenues": 45,
    "totalArtists": 892,
    "dateRange": {
      "earliest": "2024-03-01T19:00:00Z",
      "latest": "2024-06-30T22:00:00Z"
    },
    "lastUpdated": "2024-03-01T09:30:00Z",
    "nextUpdate": "2024-03-01T12:30:00Z"
  },
  "sources": [
    {
      "name": "bandsintown",
      "displayName": "Bandsintown",
      "gigCount": 650,
      "lastScraped": "2024-03-01T09:15:00Z",
      "status": "healthy",
      "averageResponseTime": 1200
    },
    {
      "name": "eventbrite",
      "displayName": "Eventbrite",
      "gigCount": 340,
      "lastScraped": "2024-03-01T09:20:00Z",
      "status": "healthy",
      "averageResponseTime": 890
    }
  ],
  "statistics": {
    "gigsPerGenre": {
      "Rock": 450,
      "Jazz": 320,
      "Folk": 280,
      "Electronic": 250,
      "Other": 200
    },
    "gigsPerLocation": {
      "New York": 380,
      "Los Angeles": 290,
      "Chicago": 210,
      "Boston": 190,
      "Other": 430
    },
    "upcomingGigs": 1200,
    "pastGigs": 300
  }
}
```

## Request/Response Format

### Content Types
- **Request**: `application/json` (for POST/PUT operations, if added)
- **Response**: `application/json`

### Headers
```http
Accept: application/json
User-Agent: YourApp/1.0
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (gig not found)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'dateFrom' parameter must be a valid ISO 8601 date",
    "details": {
      "parameter": "dateFrom",
      "provided": "invalid-date",
      "expected": "YYYY-MM-DDTHH:mm:ssZ"
    }
  },
  "timestamp": "2024-03-01T10:30:00Z",
  "path": "/api/gigs"
}
```

## Filtering and Pagination

### Advanced Filtering

**Date Range Filtering:**
```bash
# Gigs in March 2024
/api/gigs?dateFrom=2024-03-01T00:00:00Z&dateTo=2024-03-31T23:59:59Z

# Gigs this weekend
/api/gigs?dateFrom=2024-03-16T00:00:00Z&dateTo=2024-03-17T23:59:59Z
```

**Text Search:**
```bash
# Search across multiple fields
/api/gigs?search=jazz+blue+note

# Search for specific artist
/api/gigs?search=John+Coltrane

# Search for venue
/api/gigs?search=Madison+Square+Garden
```

**Multiple Filters:**
```bash
# Combine multiple filters
/api/gigs?genre=Jazz&location=New York&dateFrom=2024-03-01T00:00:00Z&limit=50
```

### Pagination Examples

**Basic Pagination:**
```bash
# First page (default)
/api/gigs?page=1&limit=20

# Second page
/api/gigs?page=2&limit=20

# Large page size
/api/gigs?limit=100
```

**Pagination with Filtering:**
```bash
# Page 2 of rock concerts
/api/gigs?genre=Rock&page=2&limit=25
```

### Sorting

**Sort Options:**
```bash
# Sort by date (chronological)
/api/gigs?sortBy=date&sortOrder=asc

# Sort by venue name
/api/gigs?sortBy=venue&sortOrder=asc

# Sort by artist name (reverse alphabetical)
/api/gigs?sortBy=artist&sortOrder=desc
```

## Error Handling

### Common Error Scenarios

**Invalid Parameters:**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid date format",
    "details": {
      "parameter": "dateFrom",
      "provided": "2024-13-01",
      "expected": "Valid ISO 8601 date"
    }
  }
}
```

**Gig Not Found:**
```json
{
  "error": {
    "code": "GIG_NOT_FOUND",
    "message": "Gig with ID 'invalid-id' was not found",
    "details": {
      "gigId": "invalid-id"
    }
  }
}
```

**Rate Limit Exceeded:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "windowSeconds": 3600
    }
  }
}
```

## Rate Limiting

**Current Limits:**
- **Per IP**: 100 requests per hour
- **Per Endpoint**: 60 requests per 10 minutes
- **Burst**: Up to 10 requests per minute

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Best Practices:**
- Cache responses locally when possible
- Use appropriate page sizes (don't request more data than needed)
- Implement exponential backoff on errors
- Monitor rate limit headers

## Examples

### JavaScript/Node.js

**Basic Gig Fetching:**
```javascript
const API_BASE = 'https://your-domain.com/api';

async function fetchGigs(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/gigs?${params}`);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return await response.json();
}

// Usage
const rockGigs = await fetchGigs({
  genre: 'Rock',
  location: 'New York',
  limit: 50
});

console.log(`Found ${rockGigs.gigs.length} rock gigs in New York`);
```

**Pagination Helper:**
```javascript
async function fetchAllGigs(filters = {}) {
  const allGigs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchGigs({ ...filters, page, limit: 100 });
    allGigs.push(...response.gigs);
    
    hasMore = response.pagination.hasNext;
    page++;
    
    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allGigs;
}
```

### Python

**Using requests library:**
```python
import requests
from datetime import datetime, timedelta

API_BASE = 'https://your-domain.com/api'

class GigateerAPI:
    def __init__(self, base_url=API_BASE):
        self.base_url = base_url
        self.session = requests.Session()
    
    def fetch_gigs(self, **filters):
        """Fetch gigs with optional filters"""
        response = self.session.get(f'{self.base_url}/gigs', params=filters)
        response.raise_for_status()
        return response.json()
    
    def fetch_gig_details(self, gig_id):
        """Fetch details for specific gig"""
        response = self.session.get(f'{self.base_url}/gigs/{gig_id}')
        response.raise_for_status()
        return response.json()
    
    def fetch_metadata(self):
        """Fetch catalog metadata"""
        response = self.session.get(f'{self.base_url}/meta')
        response.raise_for_status()
        return response.json()

# Usage
api = GigateerAPI()

# Get jazz gigs this month
today = datetime.now()
next_month = today + timedelta(days=30)

jazz_gigs = api.fetch_gigs(
    genre='Jazz',
    dateFrom=today.isoformat(),
    dateTo=next_month.isoformat(),
    limit=100
)

print(f"Found {len(jazz_gigs['gigs'])} jazz gigs this month")

# Get catalog statistics
meta = api.fetch_metadata()
print(f"Total gigs in catalog: {meta['catalog']['totalGigs']}")
```

### curl Examples

**Basic Requests:**
```bash
# Get recent gigs
curl "https://your-domain.com/api/gigs?limit=5"

# Search for specific artist
curl "https://your-domain.com/api/gigs?search=John+Coltrane"

# Get gig details
curl "https://your-domain.com/api/gigs/specific-gig-id"

# Get metadata
curl "https://your-domain.com/api/meta"
```

**Advanced Filtering:**
```bash
# Complex filter with JSON output formatting
curl -s "https://your-domain.com/api/gigs" \
  -G \
  -d "genre=Rock" \
  -d "location=New York" \
  -d "dateFrom=2024-03-01T00:00:00Z" \
  -d "limit=10" \
  | jq '.gigs[] | {title, venue, date}'
```

### React/Next.js

**Custom Hook for Gigs:**
```javascript
import { useState, useEffect } from 'react';

export function useGigs(filters = {}) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchGigs() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/gigs?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch gigs');
        }

        const data = await response.json();
        setGigs(data.gigs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGigs();
  }, [JSON.stringify(filters)]);

  return { gigs, loading, error, pagination };
}

// Usage in component
function GigsList({ genre, location }) {
  const { gigs, loading, error, pagination } = useGigs({
    genre,
    location,
    limit: 20
  });

  if (loading) return <div>Loading gigs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Found {pagination.total} gigs</h2>
      {gigs.map(gig => (
        <div key={gig.id}>
          <h3>{gig.title}</h3>
          <p>{gig.venue} - {new Date(gig.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## Client Libraries

### Official SDK (Future)

Plans for official client libraries:
- **JavaScript/TypeScript**: Full-featured client with TypeScript support
- **Python**: Pythonic interface with async support
- **PHP**: Laravel/Symfony integration
- **Ruby**: Rails-friendly gem

### Community Libraries

Encourage community-built clients for other languages and frameworks.

## Testing and Development

### Development Environment

**Local API Testing:**
```bash
# Start local development server
cd gigateer
pnpm dev

# Test API endpoints
curl http://localhost:3000/api/gigs
curl http://localhost:3000/api/meta
```

### API Testing Tools

**Postman Collection:**
```json
{
  "info": {
    "name": "Gigateer API",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "List Gigs",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/api/gigs?limit=10",
          "host": ["{{baseUrl}}"],
          "path": ["api", "gigs"],
          "query": [{"key": "limit", "value": "10"}]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-domain.com"
    }
  ]
}
```

**Testing Scripts:**
```bash
# Test script for CI/CD
#!/bin/bash
API_BASE="http://localhost:3000/api"

echo "Testing Gigateer API..."

# Test gigs endpoint
echo "Testing /api/gigs..."
curl -f "$API_BASE/gigs?limit=1" > /dev/null || exit 1

# Test meta endpoint
echo "Testing /api/meta..."
curl -f "$API_BASE/meta" > /dev/null || exit 1

# Test gig details (if any gigs exist)
FIRST_GIG_ID=$(curl -s "$API_BASE/gigs?limit=1" | jq -r '.gigs[0].id // empty')
if [ ! -z "$FIRST_GIG_ID" ]; then
  echo "Testing /api/gigs/$FIRST_GIG_ID..."
  curl -f "$API_BASE/gigs/$FIRST_GIG_ID" > /dev/null || exit 1
fi

echo "All tests passed!"
```

### Mock Data for Testing

```javascript
// Mock API responses for testing
export const mockGigsResponse = {
  gigs: [
    {
      id: 'test-gig-1',
      title: 'Test Band at Test Venue',
      artist: 'Test Band',
      venue: 'Test Venue',
      location: 'Test City',
      date: '2024-03-15T20:00:00Z',
      genre: 'Rock',
      description: 'Test concert description',
      url: 'https://test.com/event/1',
      price: '$25',
      source: 'test-source'
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    pages: 1,
    hasNext: false,
    hasPrev: false
  }
};
```

---

For more information:
- [API Endpoints Documentation](../api/ENDPOINTS.md)
- [Development Guide](./DEVELOPMENT.md)
- [System Architecture](../architecture/SYSTEM_DESIGN.md)