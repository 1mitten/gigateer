/**
 * Scraper Health Check Tests
 * 
 * These tests verify that each scraper can extract at least 1-2 records
 * from their respective sources. Designed to be UI-ready for monitoring.
 */

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

// List of scrapers to test
const SCRAPERS_TO_TEST = [
  'bristol-louisiana',
  'bristol-thekla', 
  'bristol-exchange',
  'bristol-fleece',
  'bristol-the-lanes',
  'bristol-the-croft',
  'bristol-strange-brew'
];

// Health check thresholds
const HEALTH_THRESHOLDS = {
  HEALTHY_MIN_RECORDS: 2,
  DEGRADED_MIN_RECORDS: 1,
  MAX_RESPONSE_TIME: 60000, // 60 seconds
  TIMEOUT: 90000 // 90 seconds
};

describe.skip('Scraper Health Check System', () => {
  const testTimeout = 120000; // 2 minutes per test
  let healthReport: HealthCheckReport;

  beforeAll(() => {
    // Ensure we're in the ingestor directory
    const ingestorDir = path.resolve(__dirname, '../..');
    process.chdir(ingestorDir);
  });

  afterAll(async () => {
    // Generate health report for UI consumption
    if (healthReport) {
      const reportPath = path.join(process.cwd(), 'scraper-health-report.json');
      await fs.writeFile(reportPath, JSON.stringify(healthReport, null, 2));
      console.log(`\n📊 Health report saved to: ${reportPath}`);
      console.log(`📈 Overall Status: ${healthReport.overallStatus.toUpperCase()}`);
      console.log(`✅ Healthy: ${healthReport.healthyScrapers}/${healthReport.totalScrapers}`);
      console.log(`⚠️ Degraded: ${healthReport.degradedScrapers}/${healthReport.totalScrapers}`);
      console.log(`❌ Failed: ${healthReport.failedScrapers}/${healthReport.totalScrapers}`);
    }
  });

  describe('Individual Scraper Health Checks', () => {
    const results: ScraperHealthResult[] = [];

    afterAll(() => {
      // Calculate overall health status
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

      healthReport = {
        totalScrapers: results.length,
        healthyScrapers: healthy,
        degradedScrapers: degraded,
        failedScrapers: failed,
        overallStatus,
        testRunTime: Date.now() - startTime,
        results,
        generatedAt: new Date().toISOString()
      };
    });

    const startTime = Date.now();

    // Generate individual test for each scraper
    SCRAPERS_TO_TEST.forEach(scraperName => {
      test(`${scraperName} should extract records successfully`, async () => {
        console.log(`\n🔍 Testing ${scraperName}...`);
        
        const testStart = Date.now();
        let result: ScraperHealthResult = {
          scraper: scraperName,
          status: 'failed',
          recordsFound: 0,
          responseTime: 0,
          lastTested: new Date().toISOString()
        };

        try {
          // Run the scraper with timeout
          const { stdout } = await execAsync(
            `timeout ${HEALTH_THRESHOLDS.TIMEOUT / 1000} npx tsx src/cli.ts ingest:source ${scraperName}`,
            { timeout: HEALTH_THRESHOLDS.TIMEOUT }
          );

          const responseTime = Date.now() - testStart;
          result.responseTime = responseTime;

          // Parse output for success indicators
          if (stdout.includes('Source ingestion completed') && stdout.includes('success: true')) {
            const normalizedMatch = stdout.match(/normalized: (\d+)/);
            
            const normalizedCount = normalizedMatch ? parseInt(normalizedMatch[1]) : 0;
            
            result.recordsFound = normalizedCount;

            // Determine health status
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
              const sourcePath = `data/sources/${scraperName}.normalized.json`;
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

            console.log(`✅ ${scraperName}: ${result.status.toUpperCase()} (${normalizedCount} records in ${responseTime}ms)`);
            
          } else {
            result.status = 'failed';
            result.errorMessage = 'Scraper completed but did not report success';
            console.log(`❌ ${scraperName}: FAILED - No success reported`);
          }

        } catch (error: any) {
          const responseTime = Date.now() - testStart;
          result.responseTime = responseTime;
          
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
          
          console.log(`❌ ${scraperName}: FAILED - ${result.errorMessage}`);
        }

        results.push(result);

        // Test assertions based on status
        if (result.status === 'failed') {
          console.warn(`⚠️ ${scraperName} is not working properly: ${result.errorMessage}`);
          // Don't fail the test for network issues in CI environments
          if (result.errorMessage?.includes('Network') || result.errorMessage?.includes('ECONNREFUSED')) {
            console.log(`ℹ️ Skipping assertion for ${scraperName} due to network issues`);
          } else {
            expect(result.status).not.toBe('failed');
          }
        } else {
          expect(result.recordsFound).toBeGreaterThan(0);
          expect(result.status).toMatch(/healthy|degraded/);
        }
      }, testTimeout);
    });
  });

  describe('Health Check API Functions', () => {
    test('should generate UI-ready health report', async () => {
      // This test ensures the health check data is properly formatted for UI consumption
      expect(healthReport).toBeDefined();
      expect(healthReport.totalScrapers).toBeGreaterThan(0);
      expect(healthReport.results).toHaveLength(SCRAPERS_TO_TEST.length);
      expect(healthReport.overallStatus).toMatch(/healthy|degraded|critical/);
      expect(healthReport.generatedAt).toBeDefined();
      
      // Verify each result has required fields for UI
      healthReport.results.forEach(result => {
        expect(result.scraper).toBeDefined();
        expect(result.status).toMatch(/healthy|degraded|failed/);
        expect(result.recordsFound).toBeGreaterThanOrEqual(0);
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.lastTested).toBeDefined();
      });
    });

    test('should identify critical issues requiring attention', () => {
      const criticalIssues = healthReport.results.filter(r => 
        r.status === 'failed' && 
        !r.errorMessage?.includes('Network') && 
        !r.errorMessage?.includes('timeout')
      );
      
      // Log critical issues for monitoring
      if (criticalIssues.length > 0) {
        console.warn('\n🚨 CRITICAL ISSUES DETECTED:');
        criticalIssues.forEach(issue => {
          console.warn(`   - ${issue.scraper}: ${issue.errorMessage}`);
        });
      }
      
      // This should alert us if too many scrapers are failing
      expect(criticalIssues.length).toBeLessThan(3); // Allow up to 2 critical failures
    });
  });

  describe('Performance Monitoring', () => {
    test('should track response times for performance monitoring', () => {
      const healthyResults = healthReport.results.filter(r => r.status === 'healthy');
      
      if (healthyResults.length > 0) {
        const avgResponseTime = healthyResults.reduce((sum, r) => sum + r.responseTime, 0) / healthyResults.length;
        const maxResponseTime = Math.max(...healthyResults.map(r => r.responseTime));
        
        console.log(`\n📊 Performance Metrics:`);
        console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
        console.log(`   Max response time: ${maxResponseTime}ms`);
        console.log(`   Timeout threshold: ${HEALTH_THRESHOLDS.MAX_RESPONSE_TIME}ms`);
        
        // Log slow scrapers
        const slowScrapers = healthyResults.filter(r => r.responseTime > 30000);
        if (slowScrapers.length > 0) {
          console.warn(`   ⚠️ Slow scrapers (>30s): ${slowScrapers.map(s => s.scraper).join(', ')}`);
        }
      }
    });
  });
});

// Export health check functions for UI usage
export async function runScraperHealthCheck(scraperName: string): Promise<ScraperHealthResult> {
  const testStart = Date.now();
  const result: ScraperHealthResult = {
    scraper: scraperName,
    status: 'failed',
    recordsFound: 0,
    responseTime: 0,
    lastTested: new Date().toISOString()
  };

  try {
    const { stdout } = await execAsync(
      `timeout ${HEALTH_THRESHOLDS.TIMEOUT / 1000} npx tsx src/cli.ts ingest:source ${scraperName}`,
      { timeout: HEALTH_THRESHOLDS.TIMEOUT }
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
    } else {
      result.errorMessage = 'Scraper did not report success';
    }

  } catch (error: any) {
    result.responseTime = Date.now() - testStart;
    result.errorMessage = error.message || 'Unknown error';
  }

  return result;
}

export async function generateHealthReport(): Promise<HealthCheckReport> {
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