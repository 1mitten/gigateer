# 🔄 Scraper Configuration Transformations Guide

This guide covers advanced transformation features in the configuration-driven scraper system for handling complex data extraction and manipulation.

## 🎯 Overview

The configuration-driven scraper supports powerful transformation capabilities that can:

1. **Split complex text** (e.g., "13:00 - 14:45" → separate start/end times)
2. **Extract specific patterns** using regex
3. **Follow links** to get additional information
4. **Clean and normalize data** automatically
5. **Handle missing/incomplete data** gracefully

## 📝 Available Transformations

### Basic Transformations
```json
{
  "selector": ".field",
  "attribute": "text",
  "transform": "trim|lowercase|uppercase|slug|price|date|url"
}
```

### Time Range Splitting
Extract start and end times from ranges like "13:00 - 14:45":

```json
{
  "startTime": {
    "selector": ".event-time",
    "attribute": "text", 
    "transform": "time-range-start",
    "fallback": "00:00"
  },
  "endTime": {
    "selector": ".event-time",
    "attribute": "text",
    "transform": "time-range-end", 
    "fallback": "23:59"
  }
}
```

**Input:** "13:00 - 14:45"
**Output:** startTime: "13:00", endTime: "14:45"

### Pattern Extraction
Extract specific parts using regex:

```json
{
  "artistName": {
    "selector": ".event-title",
    "attribute": "text",
    "transform": "extract-text",
    "transformParams": {
      "pattern": "^([^-]+)\\s*-",
      "flags": "i"
    }
  }
}
```

**Input:** "Coldplay - Music of the Spheres Tour"
**Output:** "Coldplay"

### Text Replacement
Clean up text using regex replacement:

```json
{
  "cleanTitle": {
    "selector": ".event-title",
    "attribute": "text", 
    "transform": "regex",
    "transformParams": {
      "pattern": "\\s*-\\s*SOLD OUT",
      "replacement": "",
      "flags": "gi"
    }
  }
}
```

**Input:** "Arctic Monkeys - SOLD OUT"
**Output:** "Arctic Monkeys"

### URL Normalization
Convert relative URLs to absolute:

```json
{
  "eventUrl": {
    "selector": ".event-link",
    "attribute": "href",
    "transform": "url"
  }
}
```

**Input:** "#e131890" or "/events/123"
**Output:** "https://example.com/whats-on/#e131890"

## 🔗 Follow-Up Extraction

Extract additional data by following links to detail pages:

```json
{
  "description": {
    "selector": ".short-description",
    "attribute": "text",
    "transform": "trim",
    "followUp": {
      "urlField": "eventUrl",
      "fields": {
        "fullDescription": {
          "selector": ".full-description",
          "attribute": "text",
          "transform": "trim"
        },
        "actualDate": {
          "selector": ".event-date",
          "attribute": "text", 
          "transform": "trim"
        },
        "ticketPrice": {
          "selector": ".ticket-price",
          "attribute": "text",
          "transform": "price"
        },
        "venueDetails": {
          "selector": ".venue-info",
          "attribute": "text",
          "transform": "trim"
        }
      }
    }
  }
}
```

**How it works:**
1. Extract basic data from listing page
2. For each event, navigate to the URL in `eventUrl`
3. Extract additional fields from the detail page
4. Merge the follow-up data into the main event object
5. Apply rate limiting between page visits

## 📊 Complete Exchange Bristol Example

Here's the enhanced Exchange Bristol configuration demonstrating time splitting:

```json
{
  "workflow": [
    {
      "type": "extract",
      "containerSelector": ".hf__event-listing",
      "fields": {
        "title": {
          "selector": ".hf__event-listing--name",
          "attribute": "text",
          "transform": "trim"
        },
        
        "timeRange": {
          "selector": ".hf__event-listing--time",
          "attribute": "text",
          "transform": "trim"
        },
        
        "startTime": {
          "selector": ".hf__event-listing--time", 
          "attribute": "text",
          "transform": "time-range-start",
          "fallback": "TBA"
        },
        
        "endTime": {
          "selector": ".hf__event-listing--time",
          "attribute": "text",
          "transform": "time-range-end"
        },
        
        "eventUrl": {
          "selector": ".hf__event-listing--name",
          "attribute": "href",
          "transform": "url"
        }
      }
    }
  ],
  
  "mapping": {
    "title": "title",
    "date": {
      "start": "startTime",
      "end": "endTime"
    },
    "urls": {
      "event": "eventUrl"
    }
  }
}
```

## ⚠️ Performance Considerations

### Follow-Up Extraction
- **Rate Limiting:** Automatically applied between page visits
- **Timeout Handling:** Each follow-up page has its own timeout
- **Error Recovery:** Failed follow-ups don't break the main extraction
- **Performance Impact:** Follow-ups significantly increase scraping time

**Best Practices:**
- Use follow-ups sparingly (only for critical missing data)
- Implement generous rate limiting for sites with follow-ups
- Consider batch processing vs. real-time scraping

### Transformation Overhead
- **Basic transforms** (trim, lowercase): Minimal overhead
- **Regex transforms**: Moderate overhead, optimize patterns
- **Complex patterns**: Can impact performance on large datasets

## 🛠️ Testing Transformations

Test individual transformations:

```bash
# Test the configuration
pnpm --filter ingestor test:config path/to/config.json --screenshots

# Extract just a few items for testing
pnpm --filter ingestor test:config path/to/config.json --limit 3
```

## 🎨 Advanced Patterns

### Multi-Step Extraction
```json
{
  "artistAndVenue": {
    "selector": ".event-info", 
    "attribute": "text",
    "transform": "extract-text",
    "transformParams": {
      "pattern": "(.+?) at (.+)",
      "flags": "i"
    }
  }
}
```

### Conditional Fallbacks
```json
{
  "price": {
    "selector": ".price",
    "attribute": "text",
    "transform": "price",
    "fallback": "Free"
  }
}
```

### Multiple Transformations
Apply transformations in sequence by chaining them through mapping:

```json
{
  "fields": {
    "rawTitle": {
      "selector": ".title",
      "attribute": "text",
      "transform": "trim"
    }
  },
  "mapping": {
    "title": "rawTitle",
    "slug": {
      "source": "rawTitle",
      "transform": "slug"
    }
  }
}
```

## 🔍 Debugging Transformations

Enable debug mode to see transformation results:

```json
{
  "debug": {
    "screenshots": true,
    "saveHtml": true, 
    "logLevel": "debug"
  }
}
```

Debug output shows:
- Input values before transformation
- Applied transformation type and parameters
- Output values after transformation
- Any transformation errors or warnings

## 📚 Transform Reference

| Transform | Purpose | Input Example | Output Example |
|-----------|---------|---------------|----------------|
| `trim` | Remove whitespace | `"  Hello  "` | `"Hello"` |
| `lowercase` | Convert to lowercase | `"HELLO"` | `"hello"` |
| `uppercase` | Convert to uppercase | `"hello"` | `"HELLO"` |
| `slug` | Create URL-safe slug | `"Hello World!"` | `"hello-world"` |
| `price` | Extract numeric price | `"$25.50 each"` | `"25.50"` |
| `date` | Parse to ISO date | `"Dec 25, 2024"` | `"2024-12-25T00:00:00.000Z"` |
| `url` | Make absolute URL | `"#event123"` | `"https://site.com/page#event123"` |
| `time-range-start` | Extract start time | `"13:00 - 14:45"` | `"13:00"` |
| `time-range-end` | Extract end time | `"13:00 - 14:45"` | `"14:45"` |
| `extract-text` | Regex extraction | `"Artist - Song"` | `"Artist"` (with pattern) |
| `regex` | Regex replacement | `"Text - SOLD OUT"` | `"Text"` (with replacement) |

This transformation system makes the scraper highly flexible and capable of handling complex, real-world data extraction scenarios without requiring custom code for each site.