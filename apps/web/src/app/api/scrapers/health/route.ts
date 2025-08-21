/**
 * Scraper Health Check API
 * 
 * Provides endpoints for monitoring scraper health status.
 * Designed for dashboard UI consumption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface ScraperHealthResult {
  scraper: string;
  status: 'healthy' | 'degraded' | 'failed';
  recordsFound: number;
  errorMessage?: string;
  responseTime: number;
  lastTested: string;
  details?: {
    sampleTitles?: string[];
    venueInfo?: string;
    dateRange?: string;
  };
}

interface HealthCheckReport {
  totalScrapers: number;
  healthyScrapers: number;
  degradedScrapers: number;
  failedScrapers: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  testRunTime: number;
  results: ScraperHealthResult[];
  generatedAt: string;
}

const SCRAPERS_TO_TEST = [
  'bristol-louisiana',
  'bristol-thekla', 
  'bristol-exchange',
  'bristol-fleece',
  'bristol-the-lanes',
  'bristol-the-croft',
  'bristol-strange-brew'
];

const HEALTH_THRESHOLDS = {
  HEALTHY_MIN_RECORDS: 2,
  DEGRADED_MIN_RECORDS: 1,
  MAX_RESPONSE_TIME: 60000, // 60 seconds
  TIMEOUT: 90000 // 90 seconds
};

/**
 * Run health check for a single scraper
 */
async function runScraperHealthCheck(scraperName: string): Promise<ScraperHealthResult> {
  const testStart = Date.now();
  const result: ScraperHealthResult = {
    scraper: scraperName,
    status: 'failed',
    recordsFound: 0,
    responseTime: 0,
    lastTested: new Date().toISOString()
  };

  try {
    // Change to ingestor directory for CLI execution
    const ingestorDir = path.resolve(process.cwd(), '../../services/ingestor');
    
    const { stdout } = await execAsync(
      `timeout ${HEALTH_THRESHOLDS.TIMEOUT / 1000} npx tsx src/cli.ts ingest:source ${scraperName}`,
      { 
        timeout: HEALTH_THRESHOLDS.TIMEOUT,
        cwd: ingestorDir
      }
    );

    result.responseTime = Date.now() - testStart;

    if (stdout.includes('Source ingestion completed') && stdout.includes('success: true')) {
      const normalizedMatch = stdout.match(/normalized: (\d+)/);
      const normalizedCount = normalizedMatch ? parseInt(normalizedMatch[1]) : 0;
      
      result.recordsFound = normalizedCount;

      if (normalizedCount >= HEALTH_THRESHOLDS.HEALTHY_MIN_RECORDS) {
        result.status = 'healthy';
      } else if (normalizedCount >= HEALTH_THRESHOLDS.DEGRADED_MIN_RECORDS) {
        result.status = 'degraded';
      } else {
        result.status = 'failed';
        result.errorMessage = 'No records extracted';
      }

      // Try to get sample data for additional details
      try {
        const sourcePath = path.resolve(ingestorDir, `data/sources/${scraperName}.normalized.json`);
        const sourceData = JSON.parse(await fs.readFile(sourcePath, 'utf-8'));
        
        if (sourceData.gigs && sourceData.gigs.length > 0) {
          const sampleGigs = sourceData.gigs.slice(0, 3);
          result.details = {
            sampleTitles: sampleGigs.map((g: any) => g.title),
            venueInfo: sampleGigs[0]?.venue?.name,
            dateRange: `${sampleGigs[0]?.dateStart} to ${sampleGigs[sampleGigs.length - 1]?.dateStart}`
          };
        }
      } catch (detailError) {
        // Details are optional
      }

    } else {
      result.errorMessage = 'Scraper did not report success';
    }

  } catch (error: any) {
    result.responseTime = Date.now() - testStart;
    
    // Check for specific error types
    if (error.message?.includes('timeout')) {
      result.errorMessage = `Timeout after ${HEALTH_THRESHOLDS.TIMEOUT / 1000}s`;
    } else if (error.stdout?.includes('ECONNREFUSED') || error.stdout?.includes('Network Error')) {
      result.errorMessage = 'Network/Connection error';
    } else if (error.stdout?.includes('Failed to connect to MongoDB')) {
      result.errorMessage = 'Database connection error (expected in test environment)';
      // Database errors are less critical - treat as degraded if we got some data
      const rawMatch = error.stdout?.match(/raw: (\d+)/);
      if (rawMatch && parseInt(rawMatch[1]) > 0) {
        result.status = 'degraded';
        result.recordsFound = parseInt(rawMatch[1]);
      }
    } else {
      result.errorMessage = error.message || 'Unknown error';
    }
  }

  return result;
}

/**
 * Generate complete health check report
 */
async function generateHealthReport(): Promise<HealthCheckReport> {
  const results: ScraperHealthResult[] = [];
  const startTime = Date.now();

  // Test all scrapers in parallel for faster execution
  const healthPromises = SCRAPERS_TO_TEST.map(scraper => runScraperHealthCheck(scraper));
  const healthResults = await Promise.all(healthPromises);
  results.push(...healthResults);

  const healthy = results.filter(r => r.status === 'healthy').length;
  const degraded = results.filter(r => r.status === 'degraded').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'critical';
  if (failed === 0 && degraded <= 1) {
    overallStatus = 'healthy';
  } else if (failed <= 2) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'critical';
  }

  return {
    totalScrapers: results.length,
    healthyScrapers: healthy,
    degradedScrapers: degraded,
    failedScrapers: failed,
    overallStatus,
    testRunTime: Date.now() - startTime,
    results,
    generatedAt: new Date().toISOString()
  };
}

/**
 * GET /api/scrapers/health - Get complete health report
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scraper = searchParams.get('scraper');
    
    if (scraper) {
      // Test single scraper
      const result = await runScraperHealthCheck(scraper);
      return NextResponse.json(result);
    } else {
      // Generate full health report
      const report = await generateHealthReport();
      return NextResponse.json(report);
    }
  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      { error: 'Failed to run health check', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scrapers/health - Run health check for specific scrapers
 */
export async function POST(request: NextRequest) {
  try {
    const { scrapers } = await request.json();
    
    if (!Array.isArray(scrapers)) {
      return NextResponse.json(
        { error: 'Invalid request: scrapers must be an array' },
        { status: 400 }
      );
    }

    // Validate scraper names
    const invalidScrapers = scrapers.filter(s => !SCRAPERS_TO_TEST.includes(s));
    if (invalidScrapers.length > 0) {
      return NextResponse.json(
        { error: `Invalid scrapers: ${invalidScrapers.join(', ')}` },
        { status: 400 }
      );
    }

    // Run health checks for specified scrapers
    const healthPromises = scrapers.map((scraper: string) => runScraperHealthCheck(scraper));
    const results = await Promise.all(healthPromises);

    return NextResponse.json({
      scrapers: scrapers.length,
      results,
      testedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to run health check', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}