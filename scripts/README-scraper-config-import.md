# Scraper Configuration Import Script

## Overview

This script imports all scraper configuration JSON files into a MongoDB collection called `config_scraper`, with built-in upsert functionality to prevent duplicates.

## Usage

```bash
# Import all scraper configurations
pnpm import:scraper-configs
```

## What it does

1. **Discovers Config Files**: Automatically finds all scraper config JSON files in:
   - `**/scraper-configs/*.json`
   - `**/data/scraper-configs/*.json`
   - `services/ingestor/data/scraper-configs/*.json`

2. **MongoDB Setup**: 
   - Connects to MongoDB (default: `mongodb://localhost:27017`)
   - Uses database specified in `MONGODB_DATABASE_NAME` (default: `gigateer`)
   - Creates collection `config_scraper` with appropriate indexes

3. **Smart Upserts**:
   - Uses `sourceId` (from `site.source` field) as unique identifier
   - Detects changes using SHA-256 hash of configuration content
   - **Insert**: New configurations
   - **Update**: Changed configurations (preserves original `importedAt` timestamp)
   - **Unchanged**: Skips identical configurations

4. **Data Structure**: Each document includes:
   ```typescript
   {
     _id: ObjectId,
     sourceId: string,           // Unique identifier (site.source)
     configPath: string,         // Relative path to config file
     configHash: string,         // SHA-256 hash for change detection
     site: { ... },             // Site information
     browser: { ... },          // Browser configuration
     rateLimit: { ... },        // Rate limiting settings
     workflow: [...],           // Scraping workflow steps
     mapping: { ... },          // Data mapping rules
     validation: { ... },       // Validation rules
     debug: { ... },           // Debug settings
     importedAt: Date,          // First import timestamp
     updatedAt: Date           // Last update timestamp
   }
   ```

## MongoDB Indexes

The script creates these indexes for optimal performance:

- **Unique Index**: `{ sourceId: 1 }` - Prevents duplicate source IDs
- **Search Index**: `{ 'site.source': 1 }` - Fast lookups by source
- **Reference Index**: `{ configPath: 1 }` - Quick path-based queries

## Environment Variables

- `MONGODB_CONNECTION_STRING`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DATABASE_NAME`: Database name (default: `gigateer`)

## Example Output

```
🎯 Scraper Configuration Importer
══════════════════════════════════════════════════
🔗 Connecting to MongoDB...
✅ Connected to MongoDB successfully
📊 Created indexes for config_scraper collection
🔍 Searching for scraper config files...
📋 Found 8 scraper config files

🚀 Starting import process...
✅ Inserted: bristol-electric (Electric Bristol)
🔄 Updated: bristol-fleece (The Fleece Bristol)  
⏸️  Unchanged: bristol-thekla (Thekla Bristol)

📊 Import Summary:
   ✅ Inserted: 1
   🔄 Updated: 1  
   ⏸️  Unchanged: 6
   ❌ Errors: 0
```

## Error Handling

The script handles various error conditions gracefully:

- **Missing required fields**: Skips configs without `site.source` or `site.name`
- **Invalid JSON**: Reports parsing errors and continues with other files
- **MongoDB connection issues**: Provides clear error messages
- **Duplicate files**: Automatically handles duplicate file paths

## Integration

This script can be integrated into CI/CD pipelines or run manually when:
- Adding new scraper configurations
- Updating existing configurations  
- Migrating configurations to production
- Backing up scraper configs to MongoDB

The upsert functionality ensures safe repeated execution without creating duplicates.