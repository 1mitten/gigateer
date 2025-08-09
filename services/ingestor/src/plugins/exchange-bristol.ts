import { ScraperPlugin } from "@gigateer/contracts";
import { chromium } from "playwright";
import { logger as baseLogger } from '../logger.js';
import { ConfigDrivenScraper } from '../scrapers/config-driven-scraper.js';
import path from 'path';

const logger = baseLogger.child({ component: 'exchange-bristol-plugin' });

const exchangeBristolPlugin: ScraperPlugin = {
  upstreamMeta: {
    name: "Exchange Bristol",
    rateLimitPerMin: 10,
    defaultSchedule: "0 */3 * * *", // Every 3 hours  
    description: "Independent music venue in Bristol, UK using HeadFirst system",
    website: "https://exchangebristol.com",
    trustScore: 85
  },

  async fetchRaw(): Promise<unknown[]> {
    const configPath = path.join(process.cwd(), 'data', 'scraper-configs', 'exchange-bristol.json');
    
    logger.info('Starting Exchange Bristol scrape with config-driven scraper');
    
    let browser;
    try {
      // Load configuration and create scraper
      const scraper = await ConfigDrivenScraper.fromFile(configPath);
      
      // Create browser
      browser = await chromium.launch({ 
        headless: true
      });
      
      // Execute the configured scraping workflow (includes navigation)
      const gigs = await scraper.scrape(browser);
      
      logger.info(`Successfully scraped ${gigs.length} events from Exchange Bristol`);
      
      // Return raw data for the normalize step
      return gigs;
      
    } catch (error) {
      logger.error('Exchange Bristol scrape failed:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async normalize(rawData: unknown[]): Promise<any[]> {
    // The rawData is already normalized Gig objects from the config-driven scraper
    // Just ensure they have the correct source and metadata
    return (rawData as any[]).map(gig => ({
      ...gig,
      source: 'exchange-bristol',
      // Ensure we have required fields with fallbacks
      venue: gig.venue || { name: 'Exchange Bristol', city: 'Bristol', country: 'UK' },
      // Add Exchange Bristol specific metadata
      metadata: {
        scrapedAt: new Date().toISOString(),
        scrapeMethod: 'config-driven',
        originalData: gig
      }
    }));
  },

  async cleanup(): Promise<void> {
    // Any cleanup if needed
    logger.debug('Exchange Bristol scraper cleanup completed');
  }
};

export default exchangeBristolPlugin;