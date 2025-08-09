#!/usr/bin/env node

/**
 * Command-line interface for catalog generation and deduplication
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateCatalog, updateCatalog, compareCatalogs, CatalogGenerationOptions } from './catalog-generator';
import { batchValidateGigs } from './error-handling';
import { DEFAULT_TRUST_SCORES } from './trust-score';

interface CLIOptions {
  command: 'generate' | 'update' | 'validate' | 'compare' | 'help';
  sourcesDir: string;
  outputPath: string;
  oldCatalogPath?: string;
  minConfidence?: number;
  dateToleranceHours?: number;
  requireSameDay?: boolean;
  validateInput?: boolean;
  maxFileAgeHours?: number;
  trustScores?: string; // JSON string
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: Partial<CLIOptions> = {
    command: 'generate',
    sourcesDir: './data/sources',
    outputPath: './data/catalog.json',
    minConfidence: 0.7,
    dateToleranceHours: 2,
    requireSameDay: false,
    validateInput: true,
    maxFileAgeHours: 24,
    verbose: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case 'generate':
      case 'update':
      case 'validate':
      case 'compare':
      case 'help':
        options.command = arg;
        break;
      
      case '--sources-dir':
      case '-s':
        if (next) options.sourcesDir = next;
        i++;
        break;
      
      case '--output':
      case '-o':
        if (next) options.outputPath = next;
        i++;
        break;
      
      case '--old-catalog':
        if (next) options.oldCatalogPath = next;
        i++;
        break;
      
      case '--min-confidence':
        if (next) options.minConfidence = parseFloat(next);
        i++;
        break;
      
      case '--date-tolerance':
        if (next) options.dateToleranceHours = parseInt(next);
        i++;
        break;
      
      case '--same-day':
        options.requireSameDay = true;
        break;
      
      case '--no-validate':
        options.validateInput = false;
        break;
      
      case '--max-age':
        if (next) options.maxFileAgeHours = parseInt(next);
        i++;
        break;
      
      case '--trust-scores':
        if (next) options.trustScores = next;
        i++;
        break;
      
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      
      case '--dry-run':
        options.dryRun = true;
        break;
      
      case '--help':
      case '-h':
        options.command = 'help';
        break;
      
      default:
        if (arg.startsWith('-')) {
          console.warn(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options as CLIOptions;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Gigateer Catalog Generator CLI

USAGE:
  dedupe-cli [command] [options]

COMMANDS:
  generate    Generate new catalog from source files (default)
  update      Update existing catalog with change tracking
  validate    Validate source files without generating catalog
  compare     Compare two catalog files
  help        Show this help message

OPTIONS:
  -s, --sources-dir <path>     Directory containing source files (default: ./data/sources)
  -o, --output <path>          Output path for catalog.json (default: ./data/catalog.json)
  --old-catalog <path>         Path to old catalog for comparison (update/compare commands)
  --min-confidence <number>    Minimum confidence for fuzzy matching (0-1, default: 0.7)
  --date-tolerance <hours>     Hours tolerance for date matching (default: 2)
  --same-day                   Require same day for fuzzy matching
  --no-validate               Skip input validation
  --max-age <hours>           Maximum age of source files in hours (default: 24)
  --trust-scores <json>       Custom trust scores as JSON string
  -v, --verbose               Verbose output
  --dry-run                   Show what would be done without writing files
  -h, --help                  Show this help message

EXAMPLES:
  # Generate catalog from default sources
  dedupe-cli generate

  # Update existing catalog with verbose output
  dedupe-cli update --verbose

  # Generate with custom confidence threshold
  dedupe-cli generate --min-confidence 0.8 --date-tolerance 1

  # Validate source files only
  dedupe-cli validate --sources-dir ./my-sources

  # Compare two catalogs
  dedupe-cli compare --old-catalog ./old-catalog.json --output ./new-catalog.json

  # Use custom trust scores
  dedupe-cli generate --trust-scores '{"my-source": 95, "other-source": 60}'
`);
}

/**
 * Generate catalog command
 */
async function generateCommand(options: CLIOptions): Promise<void> {
  if (options.verbose) {
    console.log('Generating catalog with options:', {
      sourcesDir: options.sourcesDir,
      outputPath: options.outputPath,
      minConfidence: options.minConfidence,
      dateToleranceHours: options.dateToleranceHours
    });
  }

  const customTrustScores = options.trustScores ? 
    JSON.parse(options.trustScores) : {};

  const catalogOptions: CatalogGenerationOptions = {
    sourcesDir: options.sourcesDir,
    outputPath: options.outputPath,
    validateInput: options.validateInput,
    maxFileAgeHours: options.maxFileAgeHours,
    deduplication: {
      minConfidence: options.minConfidence,
      dateToleranceHours: options.dateToleranceHours,
      requireSameDay: options.requireSameDay,
      customTrustScores
    }
  };

  if (options.dryRun) {
    console.log('DRY RUN: Would generate catalog with options:', catalogOptions);
    return;
  }

  try {
    const catalog = await generateCatalog(catalogOptions);
    
    console.log(`✅ Generated catalog successfully!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total gigs: ${catalog.gigs.length}`);
    console.log(`   - Sources: ${Object.keys(catalog.sourceStats.sources).length}`);
    console.log(`   - Duplicates removed: ${catalog.metadata.deduplication.duplicatesRemoved}`);
    console.log(`   - Processing time: ${catalog.metadata.performance.processingTimeMs}ms`);
    
    if (options.verbose) {
      console.log(`   - Source breakdown:`);
      for (const [source, stats] of Object.entries(catalog.sourceStats.sources)) {
        console.log(`     * ${source}: ${stats.gigsCount} gigs (${stats.duplicatesRemoved} duplicates removed)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to generate catalog:', error);
    process.exit(1);
  }
}

/**
 * Update catalog command
 */
async function updateCommand(options: CLIOptions): Promise<void> {
  const existingPath = options.oldCatalogPath || options.outputPath;
  
  if (options.verbose) {
    console.log(`Updating catalog: ${existingPath}`);
  }

  const customTrustScores = options.trustScores ? 
    JSON.parse(options.trustScores) : {};

  const catalogOptions: CatalogGenerationOptions = {
    sourcesDir: options.sourcesDir,
    outputPath: options.outputPath,
    validateInput: options.validateInput,
    maxFileAgeHours: options.maxFileAgeHours,
    deduplication: {
      minConfidence: options.minConfidence,
      dateToleranceHours: options.dateToleranceHours,
      requireSameDay: options.requireSameDay,
      customTrustScores
    }
  };

  if (options.dryRun) {
    console.log('DRY RUN: Would update catalog with options:', catalogOptions);
    return;
  }

  try {
    const result = await updateCatalog(existingPath, catalogOptions);
    
    console.log(`✅ Updated catalog successfully!`);
    console.log(`📈 Changes:`);
    console.log(`   - Added: ${result.changes.added}`);
    console.log(`   - Updated: ${result.changes.updated}`);
    console.log(`   - Removed: ${result.changes.removed}`);
    console.log(`   - Unchanged: ${result.changes.unchanged}`);
    
    if (options.verbose && result.changes.changes.length > 0) {
      console.log(`   - Detailed changes:`);
      for (const change of result.changes.changes.slice(0, 10)) { // Show first 10
        console.log(`     * ${change.type.toUpperCase()}: ${change.gig.title} @ ${change.gig.venue.name}`);
      }
      if (result.changes.changes.length > 10) {
        console.log(`     ... and ${result.changes.changes.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to update catalog:', error);
    process.exit(1);
  }
}

/**
 * Validate command
 */
async function validateCommand(options: CLIOptions): Promise<void> {
  if (options.verbose) {
    console.log(`Validating sources in: ${options.sourcesDir}`);
  }

  try {
    const files = await fs.readdir(options.sourcesDir);
    const sourceFiles = files.filter(f => f.endsWith('.normalized.json'));
    
    if (sourceFiles.length === 0) {
      console.log('⚠️  No normalized source files found');
      return;
    }

    let totalGigs = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const filename of sourceFiles) {
      const filePath = path.join(options.sourcesDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const sourceFile = JSON.parse(content);
      
      if (!Array.isArray(sourceFile.gigs)) {
        console.log(`❌ ${filename}: Invalid file structure`);
        continue;
      }

      const result = batchValidateGigs(sourceFile.gigs, {
        autoFix: false,
        strict: true
      });

      totalGigs += sourceFile.gigs.length;
      totalValid += result.valid.length;
      totalInvalid += result.invalid.length;
      totalErrors += result.totalErrors;
      totalWarnings += result.totalWarnings;

      if (options.verbose || result.invalid.length > 0) {
        console.log(`📁 ${filename}:`);
        console.log(`   - Total: ${sourceFile.gigs.length}`);
        console.log(`   - Valid: ${result.valid.length}`);
        console.log(`   - Invalid: ${result.invalid.length}`);
        console.log(`   - Errors: ${result.totalErrors}`);
        console.log(`   - Warnings: ${result.totalWarnings}`);
        
        if (result.invalid.length > 0 && options.verbose) {
          for (const { gig, result: validationResult } of result.invalid.slice(0, 3)) {
            console.log(`     ❌ Gig ID: ${gig.id || 'unknown'}`);
            for (const error of validationResult.errors.slice(0, 2)) {
              console.log(`        - ${error.message}`);
            }
          }
        }
      }
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`   - Files processed: ${sourceFiles.length}`);
    console.log(`   - Total gigs: ${totalGigs}`);
    console.log(`   - Valid gigs: ${totalValid}`);
    console.log(`   - Invalid gigs: ${totalInvalid}`);
    console.log(`   - Total errors: ${totalErrors}`);
    console.log(`   - Total warnings: ${totalWarnings}`);
    
    if (totalInvalid > 0) {
      console.log(`\n⚠️  ${totalInvalid} gigs have validation issues`);
      process.exit(1);
    } else {
      console.log(`\n✅ All gigs are valid!`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

/**
 * Compare command
 */
async function compareCommand(options: CLIOptions): Promise<void> {
  if (!options.oldCatalogPath) {
    console.error('❌ --old-catalog is required for compare command');
    process.exit(1);
  }

  try {
    const oldContent = await fs.readFile(options.oldCatalogPath, 'utf8');
    const newContent = await fs.readFile(options.outputPath, 'utf8');
    
    const oldCatalog = JSON.parse(oldContent);
    const newCatalog = JSON.parse(newContent);
    
    const changes = compareCatalogs(oldCatalog, newCatalog);
    
    console.log(`📊 Catalog Comparison:`);
    console.log(`   - Added: ${changes.added}`);
    console.log(`   - Updated: ${changes.updated}`);
    console.log(`   - Removed: ${changes.removed}`);
    console.log(`   - Unchanged: ${changes.unchanged}`);
    
    if (options.verbose && changes.changes.length > 0) {
      console.log(`\n📋 Changes:`);
      for (const change of changes.changes) {
        const emoji = change.type === 'added' ? '➕' : 
                     change.type === 'updated' ? '🔄' : '➖';
        console.log(`   ${emoji} ${change.gig.title} @ ${change.gig.venue.name}`);
        if (change.reason) {
          console.log(`      Reason: ${change.reason}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  switch (options.command) {
    case 'help':
      showHelp();
      break;
    
    case 'generate':
      await generateCommand(options);
      break;
    
    case 'update':
      await updateCommand(options);
      break;
    
    case 'validate':
      await validateCommand(options);
      break;
    
    case 'compare':
      await compareCommand(options);
      break;
    
    default:
      console.error(`❌ Unknown command: ${options.command}`);
      showHelp();
      process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main, parseArgs, showHelp };