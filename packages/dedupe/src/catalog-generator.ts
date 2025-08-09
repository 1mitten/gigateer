/**
 * Catalog generation logic
 * Reads normalized JSON files, applies deduplication, and generates catalog.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Gig } from '@gigateer/contracts';
import { deduplicateGigs, DeduplicationOptions, validateGigsForDeduplication } from './deduplicator';
import { createGigContentHash } from './utils/hash-utils';

/**
 * Catalog structure
 */
export interface Catalog {
  gigs: Gig[];
  sourceStats: SourceStats;
  metadata: CatalogMetadata;
}

/**
 * Source statistics
 */
export interface SourceStats {
  lastUpdate: string;
  totalGigs: number;
  newGigs: number;
  updatedGigs: number;
  sources: Record<string, SourceInfo>;
}

/**
 * Individual source information
 */
export interface SourceInfo {
  name: string;
  lastRun: string;
  gigsCount: number;
  newGigs: number;
  updatedGigs: number;
  errors: string[];
  duplicatesRemoved: number;
  trustScore: number;
  isActive: boolean;
}

/**
 * Catalog metadata
 */
export interface CatalogMetadata {
  version: string;
  generatedAt: string;
  schema: string;
  deduplication: {
    enabled: boolean;
    duplicatesRemoved: number;
    mergedGroups: number;
    algorithm: string;
  };
  performance: {
    processingTimeMs: number;
    sourceCount: number;
    totalProcessed: number;
  };
}

/**
 * Source file structure
 */
export interface SourceFile {
  gigs: Gig[];
  metadata?: {
    lastRun?: string;
    source?: string;
    errors?: string[];
  };
}

/**
 * Catalog generation options
 */
export interface CatalogGenerationOptions {
  /** Directory containing source files */
  sourcesDir: string;
  /** Output path for catalog.json */
  outputPath: string;
  /** Deduplication options */
  deduplication?: DeduplicationOptions;
  /** Whether to validate input data */
  validateInput?: boolean;
  /** Maximum age of source files to include (hours) */
  maxFileAgeHours?: number;
  /** Pattern for source files */
  sourceFilePattern?: RegExp;
}

/**
 * Generate catalog from source files
 * @param options Catalog generation options
 * @returns Generated catalog
 */
export async function generateCatalog(
  options: CatalogGenerationOptions
): Promise<Catalog> {
  const startTime = Date.now();
  const {
    sourcesDir,
    outputPath,
    deduplication = {},
    validateInput = true,
    maxFileAgeHours = 24,
    sourceFilePattern = /\.normalized\.json$/
  } = options;

  try {
    // Read all source files
    const sourceFiles = await readSourceFiles(sourcesDir, {
      pattern: sourceFilePattern,
      maxAgeHours: maxFileAgeHours
    });

    // Collect all gigs from sources
    const allGigs: Gig[] = [];
    const sourceStats: Record<string, SourceInfo> = {};
    let totalNewGigs = 0;
    let totalUpdatedGigs = 0;

    for (const [filename, sourceFile] of sourceFiles) {
      const sourceName = extractSourceName(filename);
      
      // Validate gigs if requested
      if (validateInput) {
        const errors = validateGigsForDeduplication(sourceFile.gigs);
        if (errors.length > 0) {
          console.warn(`Validation errors in ${filename}:`, errors);
        }
      }

      // Add gigs to collection
      allGigs.push(...sourceFile.gigs);

      // Calculate source statistics
      const newGigs = sourceFile.gigs.filter(g => g.updatedAt === g.updatedAt).length; // Placeholder logic
      const updatedGigs = sourceFile.gigs.length - newGigs;

      sourceStats[sourceName] = {
        name: sourceName,
        lastRun: sourceFile.metadata?.lastRun || new Date().toISOString(),
        gigsCount: sourceFile.gigs.length,
        newGigs,
        updatedGigs,
        errors: sourceFile.metadata?.errors || [],
        duplicatesRemoved: 0, // Will be updated after deduplication
        trustScore: 0, // Will be calculated during deduplication
        isActive: true
      };

      totalNewGigs += newGigs;
      totalUpdatedGigs += updatedGigs;
    }

    // Apply deduplication
    const dedupResult = deduplicateGigs(allGigs, deduplication);

    // Update source stats with deduplication info
    for (const [source, stats] of Object.entries(dedupResult.sourceStats)) {
      if (sourceStats[source]) {
        sourceStats[source].duplicatesRemoved = stats.duplicatesRemoved;
      }
    }

    // Create catalog
    const catalog: Catalog = {
      gigs: dedupResult.dedupedGigs.sort((a, b) => 
        new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
      ),
      sourceStats: {
        lastUpdate: new Date().toISOString(),
        totalGigs: dedupResult.dedupedGigs.length,
        newGigs: totalNewGigs,
        updatedGigs: totalUpdatedGigs,
        sources: sourceStats
      },
      metadata: {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        schema: '@gigateer/contracts/GigSchema',
        deduplication: {
          enabled: true,
          duplicatesRemoved: dedupResult.duplicatesRemoved,
          mergedGroups: dedupResult.mergedGroups,
          algorithm: 'fuzzy-matching-v1'
        },
        performance: {
          processingTimeMs: Date.now() - startTime,
          sourceCount: sourceFiles.size,
          totalProcessed: allGigs.length
        }
      }
    };

    // Write catalog to file
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf8');
    
    console.log(`Generated catalog with ${catalog.gigs.length} gigs from ${sourceFiles.size} sources`);
    console.log(`Removed ${dedupResult.duplicatesRemoved} duplicates in ${Date.now() - startTime}ms`);

    return catalog;

  } catch (error) {
    console.error('Error generating catalog:', error);
    throw error;
  }
}

/**
 * Read source files from directory
 * @param sourcesDir Source directory
 * @param options Read options
 * @returns Map of filename to source file data
 */
async function readSourceFiles(
  sourcesDir: string,
  options: {
    pattern: RegExp;
    maxAgeHours: number;
  }
): Promise<Map<string, SourceFile>> {
  const { pattern, maxAgeHours } = options;
  const sourceFiles = new Map<string, SourceFile>();
  
  try {
    const files = await fs.readdir(sourcesDir);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    
    for (const filename of files) {
      if (!pattern.test(filename)) {
        continue;
      }
      
      const filePath = path.join(sourcesDir, filename);
      
      try {
        const stat = await fs.stat(filePath);
        
        // Check file age
        if (Date.now() - stat.mtime.getTime() > maxAge) {
          console.warn(`Skipping old file: ${filename} (${Math.round((Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60))}h old)`);
          continue;
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        const sourceFile = JSON.parse(content) as SourceFile;
        
        // Validate structure
        if (!Array.isArray(sourceFile.gigs)) {
          console.warn(`Invalid structure in ${filename}: missing or invalid gigs array`);
          continue;
        }
        
        sourceFiles.set(filename, sourceFile);
        
      } catch (error) {
        console.error(`Error reading source file ${filename}:`, error);
        continue;
      }
    }
    
  } catch (error) {
    console.error(`Error reading sources directory ${sourcesDir}:`, error);
    throw error;
  }
  
  return sourceFiles;
}

/**
 * Extract source name from filename
 * @param filename Source filename
 * @returns Source name
 */
function extractSourceName(filename: string): string {
  return filename
    .replace('.normalized.json', '')
    .replace('.json', '')
    .toLowerCase();
}

/**
 * Compare two catalogs and detect changes
 * @param oldCatalog Previous catalog
 * @param newCatalog New catalog
 * @returns Change summary
 */
export function compareCatalogs(
  oldCatalog: Catalog,
  newCatalog: Catalog
): {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  changes: Array<{
    type: 'added' | 'updated' | 'removed';
    gig: Gig;
    reason?: string;
  }>;
} {
  const oldGigMap = new Map<string, Gig>();
  const newGigMap = new Map<string, Gig>();
  
  for (const gig of oldCatalog.gigs) {
    oldGigMap.set(gig.id, gig);
  }
  
  for (const gig of newCatalog.gigs) {
    newGigMap.set(gig.id, gig);
  }
  
  const changes: Array<{
    type: 'added' | 'updated' | 'removed';
    gig: Gig;
    reason?: string;
  }> = [];
  
  let added = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;
  
  // Check for new and updated gigs
  for (const [id, newGig] of newGigMap) {
    const oldGig = oldGigMap.get(id);
    
    if (!oldGig) {
      added++;
      changes.push({ type: 'added', gig: newGig });
    } else if (oldGig.hash !== newGig.hash) {
      updated++;
      changes.push({ 
        type: 'updated', 
        gig: newGig, 
        reason: 'Content hash changed' 
      });
    } else {
      unchanged++;
    }
  }
  
  // Check for removed gigs
  for (const [id, oldGig] of oldGigMap) {
    if (!newGigMap.has(id)) {
      removed++;
      changes.push({ type: 'removed', gig: oldGig });
    }
  }
  
  return {
    added,
    updated,
    removed,
    unchanged,
    changes
  };
}

/**
 * Update existing catalog with new data
 * @param existingPath Path to existing catalog
 * @param options Catalog generation options
 * @returns Updated catalog with change tracking
 */
export async function updateCatalog(
  existingPath: string,
  options: CatalogGenerationOptions
): Promise<{
  catalog: Catalog;
  changes: ReturnType<typeof compareCatalogs>;
}> {
  let oldCatalog: Catalog | null = null;
  
  try {
    const existingContent = await fs.readFile(existingPath, 'utf8');
    oldCatalog = JSON.parse(existingContent) as Catalog;
  } catch (error) {
    console.log('No existing catalog found, creating new one');
  }
  
  const newCatalog = await generateCatalog(options);
  
  const changes = oldCatalog ? 
    compareCatalogs(oldCatalog, newCatalog) :
    {
      added: newCatalog.gigs.length,
      updated: 0,
      removed: 0,
      unchanged: 0,
      changes: newCatalog.gigs.map(gig => ({ type: 'added' as const, gig }))
    };
  
  return {
    catalog: newCatalog,
    changes
  };
}