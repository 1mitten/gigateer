import { Command } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { ScraperConfigSchema } from '../schemas/scraper-config.js';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'config-manager' });

export function addConfigManagerCommands(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage scraper configurations');

  // List all configurations
  configCmd
    .command('list')
    .description('List all available scraper configurations')
    .option('--detailed', 'Show detailed information about each config')
    .action(async (options) => {
      try {
        const configsDir = path.join(process.cwd(), 'data', 'scraper-configs');
        
        // Check if configs directory exists
        try {
          await fs.access(configsDir);
        } catch {
          logger.info('No scraper configurations directory found');
          logger.info(`Expected directory: ${configsDir}`);
          return;
        }
        
        const files = await fs.readdir(configsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
          logger.info('No scraper configurations found');
          return;
        }
        
        logger.info(`Found ${jsonFiles.length} scraper configuration(s):\n`);
        
        for (const file of jsonFiles) {
          const configPath = path.join(configsDir, file);
          
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            console.log(`📋 ${file}`);
            console.log(`   Name: ${config.site?.name || 'Unknown'}`);
            console.log(`   Source: ${config.site?.source || 'Unknown'}`);
            console.log(`   URL: ${config.site?.baseUrl || 'Unknown'}`);
            
            if (options.detailed) {
              console.log(`   Description: ${config.site?.description || 'None'}`);
              console.log(`   Last Updated: ${config.site?.lastUpdated || 'Unknown'}`);
              console.log(`   Workflow Steps: ${config.workflow?.length || 0}`);
              console.log(`   Browser Headless: ${config.browser?.headless !== false ? 'Yes' : 'No'}`);
              
              if (config.validation) {
                const validation = config.validation;
                console.log(`   Min Events Expected: ${validation.minEventsExpected || 0}`);
                console.log(`   Required Fields: ${validation.required?.join(', ') || 'None'}`);
              }
            }
            console.log();
            
          } catch (error) {
            console.log(`❌ ${file} - Invalid configuration file`);
            if (options.detailed) {
              console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            console.log();
          }
        }
        
      } catch (error) {
        logger.error('Failed to list configurations:', error);
        process.exit(1);
      }
    });

  // Validate a specific configuration
  configCmd
    .command('validate')
    .description('Validate a scraper configuration file')
    .argument('<config-file>', 'Path to configuration file to validate')
    .option('--fix', 'Attempt to fix common validation issues')
    .action(async (configFile: string, options) => {
      try {
        const configPath = path.isAbsolute(configFile) 
          ? configFile 
          : path.join(process.cwd(), configFile);
        
        logger.info(`Validating configuration: ${configPath}`);
        
        // Read and parse config
        const configContent = await fs.readFile(configPath, 'utf-8');
        let config;
        
        try {
          config = JSON.parse(configContent);
        } catch (error) {
          logger.error('Invalid JSON format:', error);
          process.exit(1);
        }
        
        // Validate against schema
        const result = ScraperConfigSchema.safeParse(config);
        
        if (result.success) {
          logger.info('✅ Configuration is valid!');
          
          const validConfig = result.data;
          console.log('\nConfiguration Summary:');
          console.log(`  Site: ${validConfig.site.name}`);
          console.log(`  Source: ${validConfig.site.source}`);
          console.log(`  Base URL: ${validConfig.site.baseUrl}`);
          console.log(`  Workflow Steps: ${validConfig.workflow.length}`);
          console.log(`  Required Fields: ${validConfig.validation?.required?.join(', ') || 'None'}`);
          
        } else {
          logger.error('❌ Configuration validation failed:');
          
          for (const issue of result.error.issues) {
            console.log(`  • ${issue.path.join('.')}: ${issue.message}`);
          }
          
          if (options.fix) {
            logger.info('\n🔧 Attempting to fix common issues...');
            
            // Add some common fixes
            let fixed = false;
            
            // Add missing default values
            if (!config.browser) {
              config.browser = { headless: true, timeout: 30000 };
              fixed = true;
              console.log('  ✓ Added default browser configuration');
            }
            
            if (!config.rateLimit) {
              config.rateLimit = { delayBetweenRequests: 1000, maxConcurrent: 1 };
              fixed = true;
              console.log('  ✓ Added default rate limiting');
            }
            
            if (!config.validation) {
              config.validation = { 
                required: ['title', 'venue.name'], 
                minEventsExpected: 0 
              };
              fixed = true;
              console.log('  ✓ Added default validation rules');
            }
            
            if (fixed) {
              // Try validation again
              const retryResult = ScraperConfigSchema.safeParse(config);
              
              if (retryResult.success) {
                // Save the fixed configuration
                const fixedPath = configPath.replace('.json', '.fixed.json');
                await fs.writeFile(fixedPath, JSON.stringify(config, null, 2));
                logger.info(`✅ Fixed configuration saved to: ${fixedPath}`);
              } else {
                logger.error('❌ Could not automatically fix all issues');
              }
            } else {
              logger.info('No automatic fixes available');
            }
          }
          
          process.exit(1);
        }
        
      } catch (error) {
        logger.error('Validation failed:', error);
        process.exit(1);
      }
    });

  // Create a new configuration template
  configCmd
    .command('create')
    .description('Create a new scraper configuration template')
    .argument('<site-name>', 'Name of the site to scrape')
    .argument('<base-url>', 'Base URL of the site')
    .option('--source <source>', 'Source identifier (default: derived from site name)')
    .action(async (siteName: string, baseUrl: string, options) => {
      try {
        const source = options.source || siteName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const fileName = `${source}.json`;
        const configsDir = path.join(process.cwd(), 'data', 'scraper-configs');
        const configPath = path.join(configsDir, fileName);
        
        // Ensure configs directory exists
        await fs.mkdir(configsDir, { recursive: true });
        
        // Check if config already exists
        try {
          await fs.access(configPath);
          logger.error(`Configuration already exists: ${configPath}`);
          process.exit(1);
        } catch {
          // File doesn't exist, which is what we want
        }
        
        // Create template configuration
        const template = {
          site: {
            name: siteName,
            baseUrl: baseUrl,
            source: source,
            description: `Scraper configuration for ${siteName}`,
            maintainer: "gigateer-team",
            lastUpdated: new Date().toISOString().split('T')[0]
          },
          browser: {
            headless: true,
            timeout: 30000,
            viewport: {
              width: 1280,
              height: 720
            }
          },
          rateLimit: {
            delayBetweenRequests: 2000,
            maxConcurrent: 1,
            respectRobotsTxt: true
          },
          workflow: [
            {
              type: "wait",
              condition: "networkidle",
              timeout: 10000
            },
            {
              type: "extract",
              containerSelector: "TODO_REPLACE_WITH_EVENT_SELECTOR",
              fields: {
                title: {
                  selector: "TODO_REPLACE_WITH_TITLE_SELECTOR",
                  attribute: "text",
                  required: true,
                  transform: "trim"
                },
                date: {
                  selector: "TODO_REPLACE_WITH_DATE_SELECTOR", 
                  attribute: "text",
                  required: true,
                  transform: "trim"
                },
                venue: {
                  selector: "TODO_REPLACE_WITH_VENUE_SELECTOR",
                  attribute: "text",
                  required: false,
                  transform: "trim"
                }
              }
            }
          ],
          mapping: {
            id: {
              strategy: "generated",
              fields: ["title", "venue", "date"]
            },
            title: "title",
            venue: {
              name: "venue"
            },
            date: {
              start: "date"
            }
          },
          validation: {
            required: ["title", "venue.name"],
            minEventsExpected: 1
          },
          debug: {
            screenshots: false,
            saveHtml: false,
            logLevel: "info"
          }
        };
        
        // Save template
        await fs.writeFile(configPath, JSON.stringify(template, null, 2));
        
        logger.info(`✅ Configuration template created: ${configPath}`);
        logger.info('\n📝 Next steps:');
        console.log('  1. Edit the configuration file and replace TODO placeholders');
        console.log('  2. Update selectors to match the target website structure');
        console.log('  3. Test the configuration with: pnpm test-config ' + fileName);
        console.log('  4. Validate the configuration with: pnpm config validate ' + fileName);
        
      } catch (error) {
        logger.error('Failed to create configuration template:', error);
        process.exit(1);
      }
    });
}