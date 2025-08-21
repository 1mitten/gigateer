import { promises as fs } from "fs";
import { join, basename } from "path";
import type { ScraperPlugin, Gig } from "@gigateer/contracts";
import type { Logger } from "./logger.js";
import { ConfigDrivenScraper } from './scrapers/config-driven-scraper.js';
import { chromium, Browser } from "playwright";

/**
 * Generic configuration-driven plugin loader that creates plugins from JSON configurations
 * This eliminates the need for individual plugin TypeScript files
 */
export class ConfigDrivenPluginLoader {
  private plugins: Map<string, ScraperPlugin> = new Map();
  private configDir: string;

  constructor(configDir: string, private readonly logger: Logger) {
    this.configDir = configDir;
  }

  /**
   * Loads all scraper plugins from JSON configuration files
   */
  async loadPlugins(): Promise<void> {
    try {
      const files = await fs.readdir(this.configDir);
      const configFiles = files.filter(file => 
        file.endsWith(".json") && !file.startsWith(".")
      );

      for (const file of configFiles) {
        await this.loadPluginFromConfig(file);
      }

      this.logger.info(
        { count: this.plugins.size, plugins: Array.from(this.plugins.keys()) },
        "Loaded configuration-driven scraper plugins"
      );
    } catch (error) {
      this.logger.error({ error: (error as Error).message, configDir: this.configDir }, "Failed to load plugin configs directory");
    }
  }

  /**
   * Creates a plugin from a JSON configuration file
   */
  private async loadPluginFromConfig(filename: string): Promise<void> {
    const filePath = join(this.configDir, filename);
    const sourceName = basename(filename, '.json');

    try {
      const configContent = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Validate basic configuration structure
      if (!this.validateConfig(config)) {
        throw new Error("Configuration does not have required fields");
      }

      // Create a generic plugin from the configuration
      const plugin = this.createPluginFromConfig(sourceName, config, filePath);
      
      this.plugins.set(sourceName, plugin);
      
      this.logger.debug(
        { 
          source: sourceName, 
          name: config.site?.name || sourceName,
          rateLimitPerMin: config.rateLimit?.maxRequestsPerMin || 10,
          description: config.site?.description
        }, 
        "Created plugin from configuration"
      );
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message, filename, filePath },
        "Failed to create plugin from configuration"
      );
    }
  }

  /**
   * Validates basic configuration structure
   */
  private validateConfig(config: any): boolean {
    return (
      config &&
      config.site &&
      typeof config.site.name === "string" &&
      typeof config.site.source === "string" &&
      Array.isArray(config.workflow) &&
      config.workflow.length > 0
    );
  }

  /**
   * Creates a ScraperPlugin from a configuration object
   */
  private createPluginFromConfig(sourceName: string, config: any, configPath: string): ScraperPlugin {
    const site = config.site;
    const rateLimit = config.rateLimit || {};
    const logger = this.logger; // Capture logger from constructor
    
    return {
      upstreamMeta: {
        name: site.name,
        rateLimitPerMin: rateLimit.maxRequestsPerMin || 10,
        defaultSchedule: config.schedule?.cron || "0 */3 * * *", // Every 3 hours default
        description: site.description || `Configuration-driven scraper for ${site.name}`,
        website: site.baseUrl || site.website,
        trustScore: config.trustScore || 80
      },

      async fetchRaw(): Promise<unknown[]> {
        logger?.info(`Starting ${sourceName} scrape with config-driven scraper`);
        
        let browser: Browser | undefined;
        try {
          // Load configuration and create scraper
          const scraper = await ConfigDrivenScraper.fromFile(configPath);
          
          // Create browser with configuration options
          const browserOptions = {
            headless: config.browser?.headless !== false, // Default to headless
            ...(config.browser?.args && { args: config.browser.args })
          };
          
          browser = await chromium.launch(browserOptions);
          
          // Execute the configured scraping workflow
          const gigs = await scraper.scrape(browser);
          
          logger?.info(`Successfully scraped ${gigs.length} events from ${site.name}`);
          
          return gigs;
          
        } catch (error) {
          logger?.error(`${sourceName} scrape failed:`, error);
          throw error;
        } finally {
          if (browser) {
            await browser.close();
          }
        }
      },

      async normalize(rawData: unknown[]): Promise<Gig[]> {
        // The rawData is already normalized Gig objects from the config-driven scraper
        // Ensure they have correct metadata and handle any config-specific transformations
        return (rawData as Gig[]).map(gig => {
          const normalizedGig = {
            ...gig,
            source: sourceName,
          };

          // Apply any global fallbacks from config
          if (!normalizedGig.venue && config.defaults?.venue) {
            normalizedGig.venue = config.defaults.venue;
          }

          // Handle "Tomorrow" dates that weren't processed during extraction
          if (normalizedGig.dateStart && typeof normalizedGig.dateStart === 'string') {
            const dateStr = normalizedGig.dateStart.trim();
            if (dateStr.toLowerCase().includes('tomorrow')) {
              logger?.info(`🔧 POST-PROCESSING Tomorrow date for ${sourceName}: "${dateStr}"`);
              
              try {
                // Extract time if present (e.g., "Tomorrow 19:00 - 22:00")
                const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
                let timeStr = '';
                if (timeMatch) {
                  timeStr = ` ${timeMatch[0]}`;
                }
                
                // Get tomorrow's date and format it
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                // Format as day name and date (e.g., "Friday 15th November")
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                
                const dayName = dayNames[tomorrow.getDay()];
                const date = tomorrow.getDate();
                const ordinalSuffix = date === 1 || date === 21 || date === 31 ? 'st' :
                                     date === 2 || date === 22 ? 'nd' :
                                     date === 3 || date === 23 ? 'rd' : 'th';
                const monthName = monthNames[tomorrow.getMonth()];
                
                const processedDateStr = `${dayName} ${date}${ordinalSuffix} ${monthName}${timeStr}`;
                logger?.info(`✅ CONVERTED Tomorrow to: "${processedDateStr}"`);
                
                // Try to parse as ISO date for better compatibility
                const tomorrowISO = new Date();
                tomorrowISO.setDate(tomorrowISO.getDate() + 1);
                if (timeMatch) {
                  const [hours, minutes] = timeMatch[1].split(':');
                  tomorrowISO.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                } else {
                  // Default to evening time for gigs
                  tomorrowISO.setHours(19, 0, 0, 0);
                }
                
                normalizedGig.dateStart = tomorrowISO.toISOString();
                logger?.info(`🎯 FINAL ISO DATE: "${normalizedGig.dateStart}"`);
                
              } catch (error) {
                logger?.error(`❌ Error processing Tomorrow date "${dateStr}":`, error);
                // Leave the original date if processing fails
              }
            }
          }

          return normalizedGig;
        });
      },

      async cleanup(): Promise<void> {
        logger?.debug(`${sourceName} scraper cleanup completed`);
      }
    };
  }

  /**
   * Gets a specific plugin by source name
   */
  getPlugin(source: string): ScraperPlugin | undefined {
    return this.plugins.get(source);
  }

  /**
   * Gets all loaded plugins
   */
  getAllPlugins(): Map<string, ScraperPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Gets the names of all loaded plugins
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Reloads all plugins (useful for development)
   */
  async reloadPlugins(): Promise<void> {
    this.plugins.clear();
    await this.loadPlugins();
  }

  /**
   * Gets plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Checks if a specific plugin exists
   */
  hasPlugin(source: string): boolean {
    return this.plugins.has(source);
  }
}