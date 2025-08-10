/**
 * Simple validation test for Bristol scrapers
 * Tests minimal data extraction to ensure scrapers work
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

describe('Bristol Scrapers Validation', () => {
  const testTimeout = 30000; // 30 second timeout for quicker tests

  beforeAll(() => {
    // Ensure we're in the ingestor directory
    process.chdir(path.resolve(__dirname, '../..'));
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

    console.log(`✅ Bristol Louisiana extracted ${rawCount} events`);

    // Verify data file exists and has content
    const dataPath = '../../data/sources/bristol-louisiana.raw.json';
    const dataExists = await fs.access(dataPath).then(() => true).catch(() => false);
    expect(dataExists).toBe(true);

    const rawData = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
    expect(rawData.count).toBeGreaterThanOrEqual(1);
    expect(rawData.data).toHaveLength(rawData.count);

    // Validate first event has required structure
    const firstEvent = rawData.data[0];
    expect(firstEvent).toMatchObject({
      title: expect.any(String),
      artists: expect.arrayContaining([expect.any(String)]),
      dateStart: expect.any(String),
      source: 'bristol-louisiana'
    });

    console.log(`📋 Sample event: "${firstEvent.title}" on ${firstEvent.dateStart}`);
    
  }, testTimeout);

  test('Plugin system loads Bristol configurations', async () => {
    console.log('🔌 Testing plugin loading...');
    
    const { stdout } = await execAsync('npx tsx src/cli.ts plugins', { timeout: 10000 });
    
    // Must contain our Bristol scrapers
    expect(stdout).toContain('bristol-louisiana');
    expect(stdout).toContain('bristol-the-lanes');  
    expect(stdout).toContain('bristol-thekla');
    expect(stdout).toContain('Configuration-driven Plugins:');
    
    console.log('✅ All Bristol scraper configurations loaded');
  });

  test('MongoDB connection works', async () => {
    console.log('💾 Testing database connection...');
    
    const { stdout } = await execAsync(
      'timeout 15 npx tsx src/cli.ts ingest:source bristol-louisiana',
      { timeout: 20000 }
    );

    expect(stdout).toContain('Successfully connected to MongoDB');
    expect(stdout).toContain('Database schema initialized successfully');
    expect(stdout).toContain('MongoDB connection closed successfully');
    
    console.log('✅ MongoDB integration verified');
  });
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