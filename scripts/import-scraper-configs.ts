#!/usr/bin/env node

/**
 * Import Scraper Configurations to MongoDB
 * 
 * This script finds all scraper configuration JSON files and imports them into 
 * a MongoDB collection called 'config_scraper' with proper upsert functionality.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { MongoClient, Db } from 'mongodb';
import { glob } from 'glob';
import { createHash } from 'crypto';

interface ScraperConfig {
  _id?: string;
  sourceId: string;
  configPath: string;
  configHash: string;
  site: {
    name: string;
    baseUrl: string;
    source: string;
    description?: string;
    maintainer?: string;
    lastUpdated?: string;
  };
  browser?: any;
  rateLimit?: any;
  workflow?: any[];
  mapping?: any;
  validation?: any;
  debug?: any;
  importedAt: Date;
  updatedAt: Date;
}

class ScraperConfigImporter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly connectionString: string;
  private readonly databaseName: string;
  private readonly collectionName = 'config_scraper';

  constructor() {
    this.connectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017';
    this.databaseName = process.env.MONGODB_DATABASE_NAME || 'gigateer';
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`   Connection: ${this.connectionString}`);
    console.log(`   Database: ${this.databaseName}`);
    
    this.client = new MongoClient(this.connectionString, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    await this.client.connect();
    await this.client.db('admin').command({ ping: 1 });
    
    this.db = this.client.db(this.databaseName);
    console.log('✅ Connected to MongoDB successfully');
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  /**
   * Create indexes for the collection
   */
  async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(this.collectionName);
    
    // Create unique index on sourceId to prevent duplicates
    await collection.createIndex({ sourceId: 1 }, { unique: true });
    
    // Create index on site.source for quick lookups
    await collection.createIndex({ 'site.source': 1 });
    
    // Create index on configPath for reference
    await collection.createIndex({ configPath: 1 });
    
    console.log('📊 Created indexes for config_scraper collection');
  }

  /**
   * Find all scraper config JSON files
   */
  async findConfigFiles(): Promise<string[]> {
    const baseDir = path.resolve(process.cwd());
    console.log(`🔍 Searching for scraper config files in: ${baseDir}`);
    
    // Search for scraper config JSON files in all possible locations
    const patterns = [
      '**/scraper-configs/*.json',
      '**/data/scraper-configs/*.json',
      'services/ingestor/data/scraper-configs/*.json'
    ];
    
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { 
        cwd: baseDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      });
      allFiles.push(...files);
    }
    
    // Remove duplicates and sort
    const uniqueFiles = [...new Set(allFiles)].sort();
    
    console.log(`📋 Found ${uniqueFiles.length} scraper config files:`);
    uniqueFiles.forEach(file => {
      console.log(`   📄 ${path.relative(baseDir, file)}`);
    });
    
    return uniqueFiles;
  }

  /**
   * Generate a hash for the config content to detect changes
   */
  private generateConfigHash(configContent: any): string {
    const configString = JSON.stringify(configContent, null, 0);
    return createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Load and validate a scraper config file
   */
  async loadConfigFile(filePath: string): Promise<ScraperConfig | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content);
      
      // Validate required fields
      if (!config.site?.source) {
        console.warn(`⚠️  Skipping ${filePath}: Missing site.source field`);
        return null;
      }
      
      if (!config.site?.name) {
        console.warn(`⚠️  Skipping ${filePath}: Missing site.name field`);
        return null;
      }
      
      // Generate unique sourceId and config hash
      const sourceId = config.site.source;
      const configHash = this.generateConfigHash(config);
      const relativePath = path.relative(process.cwd(), filePath);
      
      const scraperConfig: ScraperConfig = {
        sourceId,
        configPath: relativePath,
        configHash,
        site: config.site,
        browser: config.browser,
        rateLimit: config.rateLimit,
        workflow: config.workflow,
        mapping: config.mapping,
        validation: config.validation,
        debug: config.debug,
        importedAt: new Date(),
        updatedAt: new Date()
      };
      
      return scraperConfig;
      
    } catch (error) {
      console.error(`❌ Error loading ${filePath}:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Upsert a scraper config into MongoDB
   */
  async upsertConfig(config: ScraperConfig): Promise<'inserted' | 'updated' | 'unchanged'> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(this.collectionName);
    
    // Check if config already exists and if it has changed
    const existing = await collection.findOne({ sourceId: config.sourceId });
    
    if (existing) {
      // If the config hash is the same, no update needed
      if (existing.configHash === config.configHash) {
        return 'unchanged';
      }
      
      // Update existing config, preserving importedAt
      const updateResult = await collection.replaceOne(
        { sourceId: config.sourceId },
        {
          ...config,
          importedAt: existing.importedAt, // Preserve original import time
          updatedAt: new Date()
        }
      );
      
      return updateResult.modifiedCount > 0 ? 'updated' : 'unchanged';
    } else {
      // Insert new config
      await collection.insertOne(config);
      return 'inserted';
    }
  }

  /**
   * Import all scraper configurations
   */
  async importConfigs(): Promise<void> {
    const configFiles = await this.findConfigFiles();
    
    if (configFiles.length === 0) {
      console.log('⚠️  No scraper config files found');
      return;
    }
    
    console.log('\n🚀 Starting import process...');
    
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    for (const filePath of configFiles) {
      try {
        const config = await this.loadConfigFile(filePath);
        
        if (!config) {
          errors++;
          continue;
        }
        
        const result = await this.upsertConfig(config);
        
        switch (result) {
          case 'inserted':
            console.log(`✅ Inserted: ${config.sourceId} (${config.site.name})`);
            inserted++;
            break;
          case 'updated':
            console.log(`🔄 Updated: ${config.sourceId} (${config.site.name})`);
            updated++;
            break;
          case 'unchanged':
            console.log(`⏸️  Unchanged: ${config.sourceId} (${config.site.name})`);
            unchanged++;
            break;
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, (error as Error).message);
        errors++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏸️  Unchanged: ${unchanged}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total Processed: ${configFiles.length}`);
  }

  /**
   * List all imported configurations
   */
  async listConfigs(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(this.collectionName);
    const configs = await collection.find({})
      .sort({ 'site.name': 1 })
      .toArray();
    
    console.log(`\n📋 Imported Scraper Configurations (${configs.length}):`);
    console.log('─'.repeat(80));
    
    for (const config of configs) {
      const updatedDiff = config.updatedAt.getTime() - config.importedAt.getTime();
      const status = updatedDiff > 1000 ? '🔄 Updated' : '✅ Original';
      
      console.log(`${status} ${config.sourceId.padEnd(25)} ${config.site.name}`);
      console.log(`${''.padEnd(27)} Path: ${config.configPath}`);
      console.log(`${''.padEnd(27)} Imported: ${config.importedAt.toISOString()}`);
      if (updatedDiff > 1000) {
        console.log(`${''.padEnd(27)} Updated: ${config.updatedAt.toISOString()}`);
      }
      console.log();
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Scraper Configuration Importer');
  console.log('═'.repeat(50));
  
  const importer = new ScraperConfigImporter();
  
  try {
    // Connect to MongoDB
    await importer.connect();
    
    // Create indexes
    await importer.createIndexes();
    
    // Import configurations
    await importer.importConfigs();
    
    // List imported configurations
    await importer.listConfigs();
    
  } catch (error) {
    console.error('❌ Import failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await importer.disconnect();
  }
  
  console.log('\n🎉 Import completed successfully!');
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

export { ScraperConfigImporter };