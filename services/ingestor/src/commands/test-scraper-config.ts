import { Command } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { chromium } from 'playwright';
import { ConfigDrivenScraper } from '../scrapers/config-driven-scraper.js';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'test-scraper-config' });

export function addTestScraperConfigCommand(program: Command): void {
  program
    .command('test-config')
    .description('Test a scraper configuration file')
    .argument('<config-file>', 'Path to the scraper configuration JSON file')
    .option('--url <url>', 'Override the URL to scrape (useful for testing)')
    .option('--headless', 'Run browser in headless mode', true)
    .option('--screenshots', 'Enable debug screenshots', false)
    .option('--dry-run', 'Validate config only, do not scrape', false)
    .option('--output <file>', 'Save results to JSON file')
    .action(async (configFile: string, options) => {
      try {
        logger.info(`Testing scraper configuration: ${configFile}`);
        
        // Resolve config path
        const configPath = path.isAbsolute(configFile) 
          ? configFile 
          : path.join(process.cwd(), configFile);
        
        // Check if config exists
        try {
          await fs.access(configPath);
        } catch {
          throw new Error(`Configuration file not found: ${configPath}`);
        }
        
        // Load and validate configuration
        const scraper = await ConfigDrivenScraper.fromFile(configPath);
        const config = scraper.getConfig();
        
        logger.info(`✓ Configuration loaded successfully`);
        logger.info(`  Site: ${config.site.name}`);
        logger.info(`  Base URL: ${config.site.baseUrl}`);
        logger.info(`  Workflow steps: ${config.workflow.length}`);
        
        if (options.dryRun) {
          logger.info('Dry run complete - configuration is valid');
          return;
        }
        
        // Setup browser options
        const browserOptions = {
          headless: options.headless,
          viewport: config.browser?.viewport || { width: 1280, height: 720 }
        };
        
        // Enable debug options if requested
        if (options.screenshots) {
          config.debug = { 
            ...config.debug, 
            screenshots: true,
            saveHtml: true,
            logLevel: 'debug' as const
          };
        }
        
        let browser;
        try {
          browser = await chromium.launch(browserOptions);
          
          // Override URL if provided
          if (options.url) {
            logger.info(`Overriding URL to: ${options.url}`);
            // We'll need to navigate manually if URL is overridden
            const page = await browser.newPage();
            await page.goto(options.url, { 
              waitUntil: 'networkidle',
              timeout: config.browser?.timeout || 30000 
            });
            await page.close();
          }
          
          // Execute scraping
          logger.info('Starting scrape...');
          const startTime = Date.now();
          
          const results = await scraper.scrape(browser);
          
          const duration = Date.now() - startTime;
          
          // Log results
          logger.info(`✓ Scrape completed in ${duration}ms`);
          logger.info(`  Events found: ${results.length}`);
          
          if (results.length > 0) {
            logger.info(`  Sample event: ${results[0].title} at ${results[0].venue?.name}`);
          }
          
          // Validate results
          const requiredFields = config.validation?.required || [];
          let validEvents = 0;
          let invalidEvents = 0;
          
          for (const event of results) {
            let isValid = true;
            for (const field of requiredFields) {
              if (!getNestedValue(event, field)) {
                isValid = false;
                break;
              }
            }
            
            if (isValid) {
              validEvents++;
            } else {
              invalidEvents++;
            }
          }
          
          logger.info(`  Valid events: ${validEvents}`);
          if (invalidEvents > 0) {
            logger.warn(`  Invalid events: ${invalidEvents}`);
          }
          
          // Save output if requested
          if (options.output) {
            const outputData = {
              scrapeInfo: {
                configFile,
                timestamp: new Date().toISOString(),
                duration,
                url: options.url || config.site.baseUrl
              },
              config: {
                site: config.site,
                validation: config.validation
              },
              results,
              summary: {
                totalEvents: results.length,
                validEvents,
                invalidEvents
              }
            };
            
            await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
            logger.info(`Results saved to: ${options.output}`);
          }
          
        } finally {
          if (browser) {
            await browser.close();
          }
        }
        
      } catch (error) {
        logger.error('Test failed:', error);
        process.exit(1);
      }
    });
}

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}