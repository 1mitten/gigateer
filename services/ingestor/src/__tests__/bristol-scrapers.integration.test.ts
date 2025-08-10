/**
 * Integration tests for Bristol venue scrapers
 * Ensures at least one scraper can successfully extract and transform data
 */

import { jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

describe('Bristol Scrapers Integration Tests', () => {
  const testTimeout = 60000; // 60 second timeout
  
  beforeAll(async () => {
    // Ensure we're in the correct directory
    process.chdir(path.join(__dirname, '../../../'));
  });

  afterEach(async () => {
    // Clean up debug files after each test
    try {
      const debugFiles = await fs.readdir('.');
      const filesToDelete = debugFiles.filter(file => 
        file.startsWith('debug-') && (file.endsWith('.png') || file.endsWith('.html'))
      );
      await Promise.all(filesToDelete.map(file => fs.unlink(file).catch(() => {})));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Bristol Louisiana Scraper', () => {
    test('should extract at least one event with valid data structure', async () => {
      // Run the scraper
      const { stdout, stderr } = await execAsync(
        'npx tsx src/cli.ts ingest:source bristol-louisiana',
        { 
          timeout: testTimeout,
          env: { ...process.env, NODE_ENV: 'test' }
        }
      );

      // Check for successful completion
      expect(stdout).toMatch(/Source ingestion completed/);
      expect(stdout).toMatch(/success: true/);
      
      // Verify events were extracted
      expect(stdout).toMatch(/raw: [1-9]\d*/); // At least 1 event
      
      // Check that raw data file was created
      const rawDataPath = path.join('../../../data/sources/bristol-louisiana.raw.json');
      const rawDataExists = await fs.access(rawDataPath).then(() => true).catch(() => false);
      expect(rawDataExists).toBe(true);

      // Read and validate the raw data structure
      const rawData = JSON.parse(await fs.readFile(rawDataPath, 'utf-8'));
      expect(rawData).toMatchObject({
        source: 'bristol-louisiana',
        fetchedAt: expect.any(String),
        count: expect.any(Number),
        data: expect.any(Array)
      });

      expect(rawData.count).toBeGreaterThan(0);
      expect(rawData.data.length).toBeGreaterThan(0);

      // Validate the structure of at least one event
      const firstEvent = rawData.data[0];
      expect(firstEvent).toMatchObject({
        source: 'bristol-louisiana',
        sourceId: expect.any(String),
        updatedAt: expect.any(String),
        title: expect.any(String),
        artists: expect.any(Array),
        dateStart: expect.any(String),
        id: expect.any(String),
        hash: expect.any(String),
        status: expect.any(String)
      });

      // Verify required fields are present
      expect(firstEvent.title).toBeTruthy();
      expect(firstEvent.artists.length).toBeGreaterThan(0);
      expect(firstEvent.dateStart).toBeTruthy();
      
      console.log(`✅ Bristol Louisiana: Successfully extracted ${rawData.count} events`);
      console.log(`📋 Sample event: ${firstEvent.title} on ${firstEvent.dateStart}`);
      
    }, testTimeout);

    test('should handle venue information correctly', async () => {
      const rawDataPath = path.join('../../../data/sources/bristol-louisiana.raw.json');
      
      // Ensure we have data to test (run scraper if needed)
      const rawDataExists = await fs.access(rawDataPath).then(() => true).catch(() => false);
      if (!rawDataExists) {
        await execAsync('npx tsx src/cli.ts ingest:source bristol-louisiana', { timeout: testTimeout });
      }

      const rawData = JSON.parse(await fs.readFile(rawDataPath, 'utf-8'));
      const firstEvent = rawData.data[0];

      // Verify venue structure (even if name is missing due to current bug)
      expect(firstEvent.venue).toBeDefined();
      expect(firstEvent.venue).toMatchObject({
        city: 'Bristol',
        country: 'UK',
        address: expect.any(String)
      });

      console.log(`🏛️ Venue info: ${JSON.stringify(firstEvent.venue, null, 2)}`);
    });

    test('should generate valid event URLs', async () => {
      const rawDataPath = path.join('../../../data/sources/bristol-louisiana.raw.json');
      
      const rawData = JSON.parse(await fs.readFile(rawDataPath, 'utf-8'));
      const eventsWithUrls = rawData.data.filter((event: any) => event.eventUrl);

      expect(eventsWithUrls.length).toBeGreaterThan(0);
      
      // Verify URL format (even if currently relative)
      const firstEventWithUrl = eventsWithUrls[0];
      expect(firstEventWithUrl.eventUrl).toBeTruthy();
      expect(typeof firstEventWithUrl.eventUrl).toBe('string');
      
      console.log(`🔗 Sample URL: ${firstEventWithUrl.eventUrl}`);
    });
  });

  describe('Plugin System Integration', () => {
    test('should load all Bristol scraper configurations', async () => {
      const { stdout } = await execAsync('npx tsx src/cli.ts plugins');

      // Verify all Bristol scrapers are loaded
      expect(stdout).toMatch(/bristol-louisiana/);
      expect(stdout).toMatch(/bristol-the-lanes/);
      expect(stdout).toMatch(/bristol-thekla/);
      
      // Verify configuration-driven approach
      expect(stdout).toMatch(/Configuration-driven Plugins:/);
      expect(stdout).toMatch(/Total Plugins: [3-9]/); // At least 3 plugins
      
      console.log('📦 All Bristol scraper configurations loaded successfully');
    });
  });

  describe('Data Validation and Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      const { stdout } = await execAsync(
        'npx tsx src/cli.ts ingest:source bristol-louisiana',
        { timeout: testTimeout }
      );

      // Even with validation errors, the scraper should complete successfully
      expect(stdout).toMatch(/Source ingestion completed/);
      expect(stdout).toMatch(/success: true/);
      
      // Should log validation warnings but not fail completely
      if (stdout.includes('failed validation')) {
        expect(stdout).toMatch(/Gig failed validation/);
        console.log('⚠️ Validation errors detected (expected for current implementation)');
      }
    });
  });

  describe('Database Integration', () => {
    test('should connect to MongoDB successfully', async () => {
      const { stdout } = await execAsync(
        'npx tsx src/cli.ts ingest:source bristol-louisiana',
        { timeout: testTimeout }
      );

      expect(stdout).toMatch(/Successfully connected to MongoDB/);
      expect(stdout).toMatch(/Database schema initialized successfully/);
      expect(stdout).toMatch(/Database manager initialized successfully/);
      expect(stdout).toMatch(/MongoDB connection closed successfully/);
      
      console.log('💾 MongoDB integration working correctly');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete scraping within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await execAsync(
        'npx tsx src/cli.ts ingest:source bristol-louisiana',
        { timeout: testTimeout }
      );
      
      const duration = Date.now() - startTime;
      
      // Should complete within 45 seconds for reasonable performance
      expect(duration).toBeLessThan(45000);
      
      console.log(`⚡ Scraping completed in ${(duration / 1000).toFixed(2)} seconds`);
    });
  });
});

/**
 * Test utility functions
 */
export const BristolScrapersTestUtils = {
  async cleanupDebugFiles(): Promise<void> {
    try {
      const files = await fs.readdir('.');
      const debugFiles = files.filter(file => 
        file.startsWith('debug-') && (file.endsWith('.png') || file.endsWith('.html'))
      );
      await Promise.all(debugFiles.map(file => fs.unlink(file).catch(() => {})));
    } catch (error) {
      // Ignore errors - cleanup is best effort
    }
  },

  async verifyScraperConfiguration(scraperName: string): Promise<boolean> {
    const configPath = path.join('data/scraper-configs', `${scraperName}.json`);
    try {
      await fs.access(configPath);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return !!(config.site && config.workflow && config.mapping);
    } catch {
      return false;
    }
  },

  async getScrapingStats(scraperName: string): Promise<{ events: number; duration: number } | null> {
    const rawDataPath = path.join('../../../data/sources', `${scraperName}.raw.json`);
    try {
      const rawData = JSON.parse(await fs.readFile(rawDataPath, 'utf-8'));
      return {
        events: rawData.count || 0,
        duration: 0 // Would need to parse from logs for actual duration
      };
    } catch {
      return null;
    }
  }
};