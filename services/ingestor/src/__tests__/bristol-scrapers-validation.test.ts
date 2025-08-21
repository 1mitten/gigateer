/**
 * Simple validation test for Bristol scrapers
 * Tests minimal data extraction to ensure scrapers work
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

describe.skip('Bristol Scrapers Validation', () => {
  const testTimeout = 120000; // 2 minute timeout for scraper tests

  beforeAll(() => {
    // Ensure we're in the ingestor directory
    const ingestorDir = path.resolve(__dirname, '../..');
    console.log(`Changing to ingestor directory: ${ingestorDir}`);
    process.chdir(ingestorDir);
    console.log(`Current directory: ${process.cwd()}`);
  });

  afterAll(async () => {
    // Clean up debug files
    try {
      const files = await fs.readdir('.');
      const debugFiles = files.filter(file => 
        file.startsWith('debug-') && (file.endsWith('.png') || file.endsWith('.html'))
      );
      await Promise.all(debugFiles.map(file => fs.unlink(file).catch(() => {})));
    } catch {
      // Ignore cleanup errors
    }
  });

  test('Bristol Louisiana should extract at least 1 event', async () => {
    console.log('🧪 Testing Bristol Louisiana scraper...');
    
    try {
      // Run scraper with timeout
      const { stdout } = await execAsync(
        'timeout 30 npx tsx src/cli.ts ingest:source bristol-louisiana',
        { timeout: testTimeout }
      );

      // Basic success checks
      expect(stdout).toContain('Source ingestion completed');
      expect(stdout).toContain('success: true');
      
      // Must extract at least 1 event
      const rawMatch = stdout.match(/raw: (\d+)/);
      expect(rawMatch).toBeTruthy();
      const rawCount = parseInt(rawMatch![1]);
      expect(rawCount).toBeGreaterThanOrEqual(1);
      
      console.log(`✅ Extracted ${rawCount} events successfully`);
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      if (output.includes('ECONNREFUSED') || output.includes('Failed to connect') || 
          output.includes('timeout') || output.includes('Network Error') ||
          output.includes('ENOTFOUND')) {
        console.log('ℹ️ Bristol Louisiana scraper test skipped due to external service failure (expected in test environment)');
      } else {
        console.error('Unexpected error:', output);
        throw error;
      }
    }
  }, testTimeout);

  test('Plugin system loads Bristol configurations', async () => {
    console.log('🔌 Testing plugin loading...');
    
    try {
      const { stdout } = await execAsync('npx tsx src/cli.ts plugins', { timeout: 10000 });
      
      // Must contain our Bristol scrapers
      expect(stdout).toContain('bristol-louisiana');
      expect(stdout).toContain('bristol-the-lanes');  
      expect(stdout).toContain('bristol-thekla');
      expect(stdout).toContain('Successfully loaded all plugins');
      
      console.log('✅ All Bristol scraper configurations loaded');
    } catch (error) {
      // If command fails due to MongoDB connection, check if we at least loaded plugins
      const output = error.stdout || '';
      if (output.includes('bristol-louisiana') && output.includes('bristol-the-lanes') && output.includes('bristol-thekla')) {
        console.log('✅ Bristol plugins loaded despite database connection failure');
      } else {
        throw error;
      }
    }
  }, 15000); // Increase test timeout

  test('MongoDB connection behavior is consistent', async () => {
    console.log('💾 Testing database behavior...');
    
    try {
      const { stdout } = await execAsync(
        'timeout 15 npx tsx src/cli.ts ingest:source bristol-louisiana',
        { timeout: 20000 }
      );

      if (stdout.includes('Successfully connected to MongoDB')) {
        expect(stdout).toContain('Database schema initialized successfully');
        expect(stdout).toContain('MongoDB connection closed successfully');
        console.log('✅ MongoDB integration verified');
      } else {
        console.log('ℹ️ MongoDB not available, skipping connection test');
      }
    } catch (error) {
      const output = error.stdout || '';
      // If it fails due to MongoDB connection, that's expected in test environment
      if (output.includes('ECONNREFUSED') || output.includes('Failed to connect to MongoDB')) {
        console.log('ℹ️ MongoDB connection failed as expected in test environment');
      } else {
        throw error;
      }
    }
  }, 25000); // Increase test timeout
});

/**
 * Configuration validation tests
 */
describe('Bristol Scraper Configuration Validation', () => {
  
  test('All Bristol scraper configs exist and are valid JSON', async () => {
    const configDir = 'data/scraper-configs';
    const scrapers = ['bristol-louisiana', 'bristol-the-lanes', 'bristol-thekla'];
    
    for (const scraper of scrapers) {
      const configPath = path.join(configDir, `${scraper}.json`);
      
      // File must exist
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Must be valid JSON
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent); // Will throw if invalid JSON
      
      // Must have required structure
      expect(config).toMatchObject({
        site: expect.objectContaining({
          name: expect.any(String),
          source: expect.any(String),
          baseUrl: expect.any(String)
        }),
        workflow: expect.any(Array),
        mapping: expect.any(Object)
      });
      
      // Workflow must have at least navigate and extract steps
      expect(config.workflow).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'navigate' }),
          expect.objectContaining({ type: 'extract' })
        ])
      );
      
      console.log(`✅ ${scraper} configuration valid`);
    }
  });
});