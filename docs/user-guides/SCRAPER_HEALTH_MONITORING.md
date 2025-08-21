# Scraper Health Monitoring Guide

This guide explains how to use the scraper health monitoring system to detect and diagnose issues with your data scrapers.

## Overview

The scraper health monitoring system provides:
- **Automated testing** for all scrapers
- **Performance monitoring** with response time tracking
- **Health classification** (Healthy, Degraded, Failed)
- **UI-ready API endpoints** for dashboard integration
- **Error categorization** for easier troubleshooting

## Quick Start

### Check All Scrapers
```bash
# Via API (requires Next.js server running)
curl "http://localhost:3000/api/scrapers/health" | jq '.'

# Via Jest tests
pnpm --filter ingestor test --testPathPattern=health-check
```

### Check Specific Scraper
```bash
curl "http://localhost:3000/api/scrapers/health?scraper=bristol-louisiana" | jq '.'
```

## Health Status Classifications

### Healthy ✅
- **Criteria**: Extracted ≥2 records
- **Meaning**: Scraper is working normally
- **Action**: No action needed

### Degraded ⚠️
- **Criteria**: Extracted 1 record
- **Meaning**: Scraper partially working, may indicate:
  - Website layout changes
  - Temporary service issues
  - Rate limiting
- **Action**: Monitor closely, investigate if persistent

### Failed ❌
- **Criteria**: Extracted 0 records
- **Meaning**: Scraper not working, possible causes:
  - Website structure changed completely
  - Network connectivity issues
  - Scraper configuration errors
- **Action**: Immediate investigation required

## Overall System Status

The system calculates an overall health status:

- **Healthy**: 0 failures, ≤1 degraded scraper
- **Degraded**: ≤2 failed scrapers
- **Critical**: >2 failed scrapers

## API Endpoints

### GET `/api/scrapers/health`

Get comprehensive health report for all scrapers.

**Query Parameters:**
- `scraper` (optional): Check specific scraper only

**Response:**
```json
{
  "totalScrapers": 7,
  "healthyScrapers": 5,
  "degradedScrapers": 1,
  "failedScrapers": 1,
  "overallStatus": "degraded",
  "testRunTime": 45000,
  "generatedAt": "2024-08-21T12:00:00.000Z",
  "results": [...]
}
```

### POST `/api/scrapers/health`

Test specific scrapers.

**Request Body:**
```json
{
  "scrapers": ["bristol-louisiana", "bristol-thekla"]
}
```

## Monitoring Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions
- name: Run Scraper Health Checks
  run: pnpm --filter ingestor test --testPathPattern=health-check --verbose
```

### Dashboard Integration
```javascript
// Example dashboard integration
async function fetchScraperHealth() {
  const response = await fetch('/api/scrapers/health');
  const health = await response.json();
  
  // Update dashboard with health status
  updateHealthDashboard(health);
}

// Poll every 5 minutes
setInterval(fetchScraperHealth, 5 * 60 * 1000);
```

### Alerts and Notifications
```bash
# Example monitoring script
#!/bin/bash
HEALTH=$(curl -s "http://localhost:3000/api/scrapers/health" | jq -r '.overallStatus')

if [ "$HEALTH" == "critical" ]; then
  echo "CRITICAL: Multiple scrapers failing" | mail -s "Scraper Alert" admin@example.com
elif [ "$HEALTH" == "degraded" ]; then
  echo "WARNING: Some scrapers degraded" | mail -s "Scraper Warning" admin@example.com
fi
```

## Troubleshooting

### Common Issues and Solutions

#### Network Timeouts
- **Symptom**: `errorMessage: "Timeout after 90s"`
- **Causes**: Slow website response, network issues
- **Solutions**: 
  - Check website availability
  - Increase timeout in health check configuration
  - Add retry logic to scraper

#### Zero Records Found
- **Symptom**: `recordsFound: 0`, `status: "failed"`
- **Causes**: Website structure changed, selectors outdated
- **Solutions**:
  - Use Playwright MCP to inspect current page structure
  - Update scraper selectors in JSON configuration
  - Test scraper manually: `pnpm ingest:source <scraper-name>`

#### Database Connection Issues
- **Symptom**: `errorMessage: "Failed to connect to MongoDB"`
- **Note**: This is expected in test environments
- **Solutions**: 
  - In production: Check MongoDB connection
  - In development: This error is automatically handled

### Debugging Workflow

1. **Identify Failed Scrapers**
   ```bash
   curl "http://localhost:3000/api/scrapers/health" | jq '.results[] | select(.status == "failed")'
   ```

2. **Test Individual Scraper**
   ```bash
   pnpm ingest:source bristol-louisiana --verbose
   ```

3. **Use Playwright MCP for Investigation**
   - Navigate to target website
   - Take snapshots to see current structure
   - Compare with scraper configuration
   - Update selectors if needed

4. **Validate Fix**
   ```bash
   curl "http://localhost:3000/api/scrapers/health?scraper=bristol-louisiana"
   ```

## Performance Monitoring

### Response Time Analysis
```bash
# Get performance metrics
curl "http://localhost:3000/api/scrapers/health" | jq '.results[] | {scraper, responseTime, status}'

# Find slow scrapers (>30 seconds)
curl "http://localhost:3000/api/scrapers/health" | jq '.results[] | select(.responseTime > 30000)'
```

### Performance Thresholds
- **Normal**: <10 seconds
- **Slow**: 10-30 seconds
- **Very Slow**: >30 seconds (investigate optimization)
- **Timeout**: >90 seconds (fails automatically)

## Best Practices

### Regular Monitoring
- **Daily**: Check overall system status
- **Weekly**: Review individual scraper performance
- **After Changes**: Always run health checks after scraper modifications

### Proactive Maintenance
- **Set up alerts** for critical status changes
- **Monitor trends** in response times
- **Update selectors** proactively when websites change
- **Test scrapers** before major data ingestion runs

### Development Workflow
1. Make scraper changes
2. Run health check immediately: `pnpm --filter ingestor test --testPathPattern=health-check`
3. Check specific scraper: `curl "localhost:3000/api/scrapers/health?scraper=<name>"`
4. Validate in full data ingestion: `pnpm ingest:source <name>`
5. Update catalog: `node packages/dedupe/dist/cli.js generate`

## Configuration

### Health Check Thresholds
Located in `services/ingestor/src/__tests__/scraper-health-check.test.ts`:

```typescript
const HEALTH_THRESHOLDS = {
  HEALTHY_MIN_RECORDS: 2,    // Minimum records for healthy status
  DEGRADED_MIN_RECORDS: 1,   // Minimum records for degraded status
  MAX_RESPONSE_TIME: 60000,  // 60 seconds warning threshold
  TIMEOUT: 90000             // 90 seconds timeout
};
```

### Scrapers Monitored
The system currently monitors these scrapers:
- bristol-louisiana
- bristol-thekla
- bristol-exchange  
- bristol-fleece
- bristol-the-lanes
- bristol-the-croft
- bristol-strange-brew

To add new scrapers, update the `SCRAPERS_TO_TEST` array in the health check files.

## Sample Output

### Healthy System
```json
{
  "overallStatus": "healthy",
  "healthyScrapers": 7,
  "degradedScrapers": 0,
  "failedScrapers": 0,
  "totalScrapers": 7,
  "testRunTime": 28450
}
```

### System with Issues
```json
{
  "overallStatus": "degraded",
  "healthyScrapers": 5,
  "degradedScrapers": 1,
  "failedScrapers": 1,
  "results": [
    {
      "scraper": "bristol-thekla",
      "status": "failed",
      "recordsFound": 0,
      "errorMessage": "Timeout after 90s",
      "responseTime": 90000
    }
  ]
}
```

## Future Enhancements

- **Historical tracking**: Store health check results over time
- **Trend analysis**: Identify patterns in scraper failures
- **Automated recovery**: Restart failed scrapers automatically
- **Slack/Discord integration**: Send alerts to team channels
- **Web dashboard**: Visual interface for monitoring