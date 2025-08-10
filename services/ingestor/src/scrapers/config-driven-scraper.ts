import { Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import { logger } from '../logger.js';
import { 
  ScraperConfig, 
  ScraperConfigSchema,
  ActionConfig,
  NavigateConfig,
  WaitConfig,
  ClickConfig,
  ScrollConfig,
  ExtractConfig
} from '../schemas/scraper-config.js';
import type { Gig } from '@gigateer/contracts';
import { createGigId, generateGigHash } from '@gigateer/contracts';

const scraperLogger = logger.child({ component: 'config-driven-scraper' });

export class ConfigDrivenScraper {
  private config: ScraperConfig;
  private page: Page | null = null;
  private extractedData: Record<string, any>[] = [];

  constructor(config: ScraperConfig) {
    this.config = ScraperConfigSchema.parse(config);
  }

  /**
   * Load configuration from JSON file
   */
  static async fromFile(configPath: string): Promise<ConfigDrivenScraper> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return new ConfigDrivenScraper(config);
    } catch (error) {
      scraperLogger.error(`Failed to load config from ${configPath}:`, error);
      throw new Error(`Invalid configuration file: ${configPath}`);
    }
  }

  /**
   * Execute the scraping workflow
   */
  async scrape(browser: Browser): Promise<Gig[]> {
    const startTime = Date.now();
    scraperLogger.info(`Starting scrape for ${this.config.site.name}`);
    scraperLogger.debug('Configuration loaded', {
      browserTimeout: this.config.browser?.timeout,
      workflowSteps: this.config.workflow.length,
      debugEnabled: this.config.debug?.screenshots
    });

    try {
      // Setup page
      this.page = await this.setupPage(browser);
      
      // Execute workflow steps
      for (const [index, action] of this.config.workflow.entries()) {
        scraperLogger.debug(`Executing step ${index + 1}: ${action.type}`, { action });
        await this.executeAction(action);
        
        // Rate limiting between actions
        if (this.config.rateLimit?.delayBetweenRequests) {
          await this.sleep(this.config.rateLimit.delayBetweenRequests);
        }
      }

      // Transform extracted data to Gig objects
      const gigs = this.transformToGigs();
      
      // Validate results
      this.validateResults(gigs);

      const duration = Date.now() - startTime;
      scraperLogger.info(`Scrape completed: ${gigs.length} events found in ${duration}ms`);
      
      return gigs;

    } catch (error) {
      scraperLogger.error(`Scraping failed for ${this.config.site.name}:`, error);
      
      // Take debug screenshot if enabled
      if (this.config.debug?.screenshots && this.page) {
        const screenshotPath = `debug-${this.config.site.source}-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath });
        scraperLogger.info(`Debug screenshot saved: ${screenshotPath}`);
      }
      
      throw error;
    } finally {
      if (this.page) {
        await this.page.close();
      }
    }
  }

  /**
   * Setup the page with configuration options
   */
  private async setupPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    // Configure viewport
    if (this.config.browser?.viewport) {
      await page.setViewportSize(this.config.browser.viewport);
    }

    // Set user agent  
    if (this.config.browser?.userAgent) {
      await page.setExtraHTTPHeaders({
        'User-Agent': this.config.browser.userAgent
      });
    }

    // Set timeout
    page.setDefaultTimeout(this.config.browser?.timeout || 30000);

    return page;
  }

  /**
   * Execute a single action based on its type
   */
  private async executeAction(action: ActionConfig): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    switch (action.type) {
      case 'navigate':
        await this.executeNavigate(action);
        break;
      case 'wait':
        await this.executeWait(action);
        break;
      case 'click':
        await this.executeClick(action);
        break;
      case 'scroll':
        await this.executeScroll(action);
        break;
      case 'extract':
        await this.executeExtract(action);
        break;
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: NavigateConfig): Promise<void> {
    if (!this.page) return;

    scraperLogger.debug(`Navigating to ${action.url}`);
    await this.page.goto(action.url);
    
    if (action.waitForLoad) {
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  /**
   * Execute wait action
   */
  private async executeWait(action: WaitConfig): Promise<void> {
    if (!this.page) return;

    // Use configured timeout or default browser timeout
    const timeout = action.timeout || this.config.browser?.timeout || 30000;
    
    scraperLogger.debug(`Executing wait action with timeout: ${timeout}ms`, { 
      selector: action.selector, 
      condition: action.condition,
      configuredTimeout: action.timeout,
      browserTimeout: this.config.browser?.timeout 
    });

    // Take a debug screenshot before critical wait operations
    if (action.selector && this.config.debug?.screenshots) {
      const screenshotPath = `debug-before-wait-${action.selector.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      scraperLogger.info(`Debug screenshot before wait: ${screenshotPath}`);
      
      // Also save HTML if enabled
      if (this.config.debug?.saveHtml) {
        const htmlPath = `debug-before-wait-${action.selector.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.html`;
        const htmlContent = await this.page.content();
        await fs.writeFile(htmlPath, htmlContent, 'utf-8');
        scraperLogger.info(`Debug HTML saved: ${htmlPath}`);
      }
    }

    try {
      if (action.selector) {
        switch (action.condition) {
          case 'visible':
            await this.page.waitForSelector(action.selector, { 
              state: 'visible',
              timeout 
            });
            scraperLogger.debug(`Successfully waited for selector to be visible: ${action.selector}`);
            break;
          case 'hidden':
            await this.page.waitForSelector(action.selector, { 
              state: 'hidden',
              timeout 
            });
            break;
          case 'networkidle':
            await this.page.waitForLoadState('networkidle', { timeout });
            break;
        }
      } else if (action.condition === 'networkidle') {
        await this.page.waitForLoadState('networkidle', { timeout });
      } else {
        await this.sleep(timeout);
      }
    } catch (error) {
      scraperLogger.warn(`Wait operation failed, attempting recovery:`, error);
      
      // Take debug screenshot on failure
      if (this.config.debug?.screenshots) {
        const failureScreenshotPath = `debug-wait-failed-${Date.now()}.png`;
        await this.page.screenshot({ path: failureScreenshotPath, fullPage: true });
        scraperLogger.info(`Debug screenshot on wait failure: ${failureScreenshotPath}`);
      }
      
      // If waiting for a selector failed, try a simple time-based wait as fallback
      if (action.selector && action.condition === 'visible') {
        scraperLogger.info(`Falling back to time-based wait for ${action.selector}`);
        await this.sleep(Math.min(5000, timeout / 2));
        
        // Check if selector exists now
        const element = await this.page.$(action.selector);
        if (element) {
          scraperLogger.info(`Selector found after fallback wait: ${action.selector}`);
          return;
        }
      }
      
      // Re-throw if it's a critical failure
      throw error;
    }
  }

  /**
   * Execute click action
   */
  private async executeClick(action: ClickConfig): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.click(action.selector);
      
      if (action.waitAfter) {
        await this.sleep(action.waitAfter);
      }
    } catch (error) {
      if (!action.optional) {
        throw error;
      }
      scraperLogger.warn(`Optional click failed for selector: ${action.selector}`);
    }
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(action: ScrollConfig): Promise<void> {
    if (!this.page) return;

    switch (action.direction) {
      case 'down':
        await this.page.evaluate((amount) => {
          window.scrollBy(0, amount || window.innerHeight);
        }, action.amount);
        break;
      case 'up':
        await this.page.evaluate((amount) => {
          window.scrollBy(0, -(amount || window.innerHeight));
        }, action.amount);
        break;
      case 'bottom':
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        break;
    }

    if (action.waitAfter) {
      await this.sleep(action.waitAfter);
    }
  }

  /**
   * Execute extract action - the main data extraction
   */
  private async executeExtract(action: ExtractConfig): Promise<void> {
    if (!this.page) return;

    scraperLogger.debug(`Extracting data from containers: ${action.containerSelector}`);

    const containers = await this.page.$$(action.containerSelector);
    scraperLogger.info(`Found ${containers.length} containers to extract from`);

    // Check if this uses a special extraction method
    if ((action as any).method === 'exchange-bristol' || this.config.site.source === 'exchange-bristol') {
      await this.executeExchangeBristolExtraction(action);
      return;
    }
    
    // Debug: log some container information if debug is enabled
    if (this.config.debug?.logLevel === 'debug' && containers.length > 0) {
      for (let i = 0; i < Math.min(5, containers.length); i++) {
        try {
          const tagName = await containers[i].evaluate(el => el.tagName);
          const className = await containers[i].evaluate(el => el.className);
          const textContent = await containers[i].evaluate(el => el.textContent?.substring(0, 100));
          scraperLogger.debug(`Container ${i + 1}: ${tagName}.${className} - "${textContent}"`);
        } catch (error) {
          scraperLogger.debug(`Container ${i + 1}: Error reading details`);
        }
      }
    }

    for (const container of containers) {
      const item: Record<string, any> = {};

      for (const [fieldName, fieldConfig] of Object.entries(action.fields)) {
        try {
          let value: string | string[] | null = null;

          if (fieldConfig.multiple) {
            // Extract multiple values
            const elements = await container.$$(fieldConfig.selector);
            const values = [];
            
            for (const element of elements) {
              const extracted = await this.extractValue(element, fieldConfig.attribute || 'text');
              if (extracted) values.push(extracted);
            }
            
            value = values;
          } else {
            // Extract single value
            const element = await container.$(fieldConfig.selector);
            if (element) {
              value = await this.extractValue(element, fieldConfig.attribute || 'text');
            }
          }

          // Apply transformations
          if (value && fieldConfig.transform) {
            value = this.transformValue(value, fieldConfig.transform, fieldConfig.transformParams);
          }

          // Handle missing required fields
          if (!value && fieldConfig.required) {
            if (fieldConfig.fallback) {
              value = fieldConfig.fallback;
            } else {
              scraperLogger.warn(`Required field '${fieldName}' not found`);
            }
          }

          item[fieldName] = value;

          // Handle follow-up extraction if configured
          if (fieldConfig.followUp && item[fieldConfig.followUp.urlField]) {
            try {
              const followUpData = await this.executeFollowUp(item[fieldConfig.followUp.urlField], fieldConfig.followUp.fields);
              // Merge follow-up data into the item
              Object.assign(item, followUpData);
            } catch (error) {
              scraperLogger.warn(`Follow-up extraction failed for ${fieldName}:`, error);
            }
          }

        } catch (error) {
          scraperLogger.error(`Error extracting field '${fieldName}':`, error);
          if (fieldConfig.required) {
            throw error;
          }
        }
      }

      if (Object.keys(item).length > 0) {
        this.extractedData.push(item);
      }
    }
  }

  /**
   * Extract value from element based on attribute type
   */
  private async extractValue(element: any, attribute: string): Promise<string | null> {
    switch (attribute) {
      case 'text':
        return await element.textContent();
      case 'href':
        return await element.getAttribute('href');
      case 'src':
        return await element.getAttribute('src');
      case 'innerHTML':
        return await element.innerHTML();
      default:
        return await element.getAttribute(attribute);
    }
  }

  /**
   * Apply transformations to extracted values
   */
  private transformValue(value: string | string[], transform: string, transformParams?: Record<string, any>): string | string[] {
    if (Array.isArray(value)) {
      return value.map(v => this.transformSingleValue(v, transform, transformParams));
    }
    return this.transformSingleValue(value, transform, transformParams);
  }

  private transformSingleValue(value: string, transform: string, transformParams?: Record<string, any>): string {
    switch (transform) {
      case 'trim':
        return value.trim();
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'date':
        // Basic date normalization - can be extended
        return new Date(value).toISOString();
      case 'slug':
        return value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
      case 'exchange-venue-name':
        // Transform venue name to "Exchange, [room]" format
        const trimmedVenue = value.trim();
        if (!trimmedVenue || trimmedVenue.toLowerCase().includes('exchange')) {
          return 'Exchange';
        }
        return `Exchange, ${trimmedVenue}`;
      case 'url':
        // Convert relative URLs to absolute URLs
        if (value.startsWith('#') || value.startsWith('/')) {
          const baseUrl = this.config.site.baseUrl || 'https://exchangebristol.com';
          if (value.startsWith('#')) {
            return `${baseUrl}/whats-on/${value}`;
          } else {
            return `${baseUrl}${value}`;
          }
        }
        return value;
      case 'louisiana-url':
        // Convert relative URLs to absolute URLs for Louisiana Bristol
        if (value && (value.startsWith('#') || value.startsWith('/') || !value.startsWith('http'))) {
          const baseUrl = this.config.site.baseUrl || 'https://www.thelouisiana.net';
          if (value.startsWith('#')) {
            return `${baseUrl}/${value}`;
          } else if (value.startsWith('/')) {
            return `${baseUrl}${value}`;
          } else {
            // Handle relative paths without leading slash
            return `${baseUrl}/${value}`;
          }
        }
        return value;
      case 'static-louisiana-name':
        // Return static venue name for Louisiana Bristol
        return 'The Louisiana Bristol';
      case 'time-range-start':
        // Extract start time from "13:00 - 14:45" format
        const startMatch = value.match(/^(\d{1,2}:\d{2})/);
        return startMatch ? startMatch[1] : value;
      case 'time-range-end':
        // Extract end time from "13:00 - 14:45" format
        const endMatch = value.match(/(\d{1,2}:\d{2})$/);
        return endMatch ? endMatch[1] : value;
      case 'extract-text':
        // Extract text using regex pattern from transformParams
        if (transformParams?.pattern) {
          const extractMatch = value.match(new RegExp(transformParams.pattern, transformParams.flags || 'i'));
          return extractMatch ? (extractMatch[1] || extractMatch[0]) : value;
        }
        return value;
      case 'regex':
        // Apply regex transformation with pattern and replacement from transformParams
        if (transformParams?.pattern) {
          const regex = new RegExp(transformParams.pattern, transformParams.flags || 'g');
          return value.replace(regex, transformParams.replacement || '');
        }
        return value;
      case 'exchange-bristol-datetime':
        // Combine date group and time range into ISO datetime
        return this.parseExchangeBristolDateTime(value, transformParams);
      case 'parse-date-group':
        // Parse Exchange Bristol date groups like "Today" or "Monday 11th August"
        return this.parseExchangeBristolDateGroup(value);
      default:
        return value;
    }
  }

  /**
   * Special extraction method for Exchange Bristol that handles date groups
   */
  private async executeExchangeBristolExtraction(action: ExtractConfig): Promise<void> {
    if (!this.page) return;

    scraperLogger.debug('Using Exchange Bristol date-group extraction');

    // Run custom extraction in the browser that handles date groups
    const extractedData = await this.page.evaluate((config) => {
      const { containerSelector, fieldConfigs } = config;
      const events: any[] = [];
      let currentDateGroup = '';

      // Get all elements (date groups and event listings) in order
      const allElements = document.querySelectorAll('.hf__listings-date.js_headfirst_embed_date, ' + containerSelector);

      for (const element of allElements) {
        if (element.classList.contains('hf__listings-date')) {
          // This is a date group header
          currentDateGroup = element.textContent?.trim() || '';
        } else if (element.classList.contains('hf__event-listing') && currentDateGroup) {
          // This is an event listing
          const event: any = { dateGroup: currentDateGroup };

          // Extract fields for this event
          for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
            if (fieldName === 'dateGroup') continue; // Skip dateGroup, we already set it

            try {
              const fieldElement = element.querySelector(fieldConfig.selector);
              if (fieldElement) {
                let value: string | null = null;

                switch (fieldConfig.attribute || 'text') {
                  case 'text':
                    value = fieldElement.textContent;
                    break;
                  case 'href':
                    value = (fieldElement as HTMLAnchorElement).href;
                    break;
                  case 'src':
                    value = (fieldElement as HTMLImageElement).src;
                    break;
                  default:
                    value = fieldElement.getAttribute(fieldConfig.attribute || 'text');
                }

                if (value) {
                  if (fieldConfig.multiple) {
                    // Handle multiple values (like genres)
                    const multipleElements = element.querySelectorAll(fieldConfig.selector);
                    const values = Array.from(multipleElements).map(el => {
                      switch (fieldConfig.attribute || 'text') {
                        case 'text':
                          return el.textContent?.trim();
                        case 'href':
                          return (el as HTMLAnchorElement).href;
                        case 'src':
                          return (el as HTMLImageElement).src;
                        default:
                          return el.getAttribute(fieldConfig.attribute || 'text');
                      }
                    }).filter(Boolean);
                    event[fieldName] = values;
                  } else {
                    event[fieldName] = value.trim();
                  }
                }
              }
              
              // Apply fallback if no value was found
              if (!event[fieldName] && fieldConfig.fallback) {
                event[fieldName] = fieldConfig.fallback;
              }
            } catch (error) {
              console.error(`Error extracting field '${fieldName}':`, error);
            }
          }

          events.push(event);
        }
      }

      return events;
    }, { containerSelector: action.containerSelector, fieldConfigs: action.fields });

    // Process extracted data with transformations
    for (const item of extractedData) {
      const processedItem: Record<string, any> = {};

      for (const [fieldName, value] of Object.entries(item)) {
        const fieldConfig = action.fields[fieldName];
        let processedValue = value;

        // Apply transformations
        if (fieldConfig?.transform && processedValue && typeof processedValue === 'string') {
          if (fieldConfig.transform === 'exchange-bristol-datetime') {
            // Special case: pass dateGroup and field context as transform parameters
            const transformParams = { 
              dateGroup: item.dateGroup,
              isEndTime: fieldName === 'endTime'
            };
            processedValue = this.parseExchangeBristolDateTime(processedValue, transformParams);
          } else {
            processedValue = this.transformValue(processedValue, fieldConfig.transform, fieldConfig.transformParams);
          }
        }

        processedItem[fieldName] = processedValue;
      }

      this.extractedData.push(processedItem);
    }

    scraperLogger.info(`Exchange Bristol extraction completed: ${extractedData.length} events extracted with date groups`);
  }

  /**
   * Parse Exchange Bristol date groups like "Today" or "Monday 11th August"
   */
  private parseExchangeBristolDateGroup(dateGroup: string): string {
    const today = new Date();
    
    if (dateGroup === 'Today') {
      return today.toISOString().substring(0, 10); // Return just YYYY-MM-DD
    }
    
    // Parse formats like "Monday 11th August", "Friday 10 January"
    const cleanDateStr = dateGroup.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const parts = cleanDateStr.trim().split(' ');
    
    if (parts.length >= 3) {
      const day = parseInt(parts[1]); // e.g., "11"
      const month = parts[2]; // e.g., "August"
      
      // Convert month name to month number
      const monthIndex = this.getMonthIndex(month);
      
      if (monthIndex !== -1 && !isNaN(day)) {
        let year = today.getFullYear();
        let date = new Date(year, monthIndex, day);
        
        // If the date is more than a few days in the past, assume it's next year
        // This handles the case where we're at the end of a year looking at next year's events
        const daysDifference = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDifference > 5) {
          date.setFullYear(year + 1);
        }
        
        return date.toISOString().substring(0, 10); // Return just YYYY-MM-DD
      }
    }
    
    // Fallback to today if parsing fails
    return today.toISOString().substring(0, 10);
  }

  /**
   * Combine date group and time range into ISO datetime
   */
  private parseExchangeBristolDateTime(timeRange: string, params?: Record<string, any>): string {
    try {
      // Extract date from params.dateGroup if provided, parse it first
      let dateStr: string;
      if (params?.dateGroup) {
        dateStr = this.parseExchangeBristolDateGroup(params.dateGroup);
      } else {
        dateStr = new Date().toISOString().substring(0, 10);
      }
      
      scraperLogger.debug(`Parsing datetime - dateGroup: ${params?.dateGroup}, dateStr: ${dateStr}, timeRange: ${timeRange}`);
      
      // Parse time range like "13:00 - 14:45" or "20:00 - 02:00"
      const timeMatch = timeRange.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      
      if (timeMatch) {
        const [, startHour, startMin, endHour, endMin] = timeMatch;
        const baseDate = new Date(`${dateStr}T00:00:00.000Z`);
        
        // Validate base date
        if (isNaN(baseDate.getTime())) {
          scraperLogger.warn(`Invalid base date: ${dateStr}, falling back to today`);
          const today = new Date();
          const fallbackDateStr = today.toISOString().substring(0, 10);
          const fallbackDate = new Date(`${fallbackDateStr}T00:00:00.000Z`);
          return fallbackDate.toISOString();
        }
        
        // Determine if this should be start or end time based on field name context
        const isEndTime = params?.isEndTime || false;
        
        if (isEndTime) {
          // For end time, handle cases where event goes past midnight
          const startTime = parseInt(startHour);
          const endTime = parseInt(endHour);
          
          const endDate = new Date(baseDate);
          endDate.setUTCHours(parseInt(endHour), parseInt(endMin), 0, 0);
          
          // If end time is earlier than start time, assume it's the next day
          if (endTime < startTime) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
          }
          
          return endDate.toISOString();
        } else {
          // For start time, use the event date
          const startDate = new Date(baseDate);
          startDate.setUTCHours(parseInt(startHour), parseInt(startMin), 0, 0);
          return startDate.toISOString();
        }
      }
      
      // Fallback if time parsing fails
      const date = new Date(`${dateStr}T00:00:00.000Z`);
      if (isNaN(date.getTime())) {
        scraperLogger.warn(`Fallback date is invalid, using current time`);
        return new Date().toISOString();
      }
      return date.toISOString();
      
    } catch (error) {
      scraperLogger.error(`Error parsing Exchange Bristol datetime: ${error}, falling back to current time`);
      return new Date().toISOString();
    }
  }

  /**
   * Convert month name to month index (0-based)
   */
  private getMonthIndex(monthName: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months.findIndex(month => 
      month.toLowerCase().startsWith(monthName.toLowerCase().substring(0, 3))
    );
  }

  /**
   * Transform extracted raw data into Gig objects
   */
  private transformToGigs(): Gig[] {
    return this.extractedData.map((item, index) => {
      const gig: Partial<Gig> = {
        source: this.config.site.source,
        sourceId: `${this.config.site.source}-${index}`,
        updatedAt: new Date().toISOString()
      };

      // Map fields according to configuration
      this.mapField(item, gig, 'title', this.config.mapping.title);
      
      if (this.config.mapping.artist) {
        this.mapField(item, gig, 'artists', this.config.mapping.artist, true);
      }

      // Venue mapping
      const venue: any = {};
      this.mapField(item, venue, 'name', this.config.mapping.venue.name);
      if (this.config.mapping.venue.address) {
        if (item[this.config.mapping.venue.address] !== undefined) {
          this.mapField(item, venue, 'address', this.config.mapping.venue.address);
        } else {
          // Static value
          venue.address = this.config.mapping.venue.address;
        }
      }
      if (this.config.mapping.venue.city) {
        if (item[this.config.mapping.venue.city] !== undefined) {
          this.mapField(item, venue, 'city', this.config.mapping.venue.city);
        } else {
          // Static value
          venue.city = this.config.mapping.venue.city;
        }
      }
      if (this.config.mapping.venue.country) {
        if (item[this.config.mapping.venue.country] !== undefined) {
          this.mapField(item, venue, 'country', this.config.mapping.venue.country);
        } else {
          // Static value
          venue.country = this.config.mapping.venue.country;
        }
      }
      gig.venue = venue;

      // Date mapping
      this.mapField(item, gig, 'dateStart', this.config.mapping.date.start);
      if (this.config.mapping.date.end) {
        this.mapField(item, gig, 'dateEnd', this.config.mapping.date.end);
      }
      if (this.config.mapping.date.timezone) {
        this.mapField(item, gig, 'timezone', this.config.mapping.date.timezone);
      }


      // URLs
      if (this.config.mapping.urls?.event) {
        this.mapField(item, gig, 'eventUrl', this.config.mapping.urls.event);
      }
      if (this.config.mapping.urls?.tickets) {
        this.mapField(item, gig, 'ticketsUrl', this.config.mapping.urls.tickets);
      }

      // Other fields
      if (this.config.mapping.images) {
        this.mapField(item, gig, 'images', this.config.mapping.images, true);
      }
      if (this.config.mapping.genres) {
        this.mapField(item, gig, 'genre', this.config.mapping.genres, true);
      }
      if (this.config.mapping.ageRestriction) {
        this.mapField(item, gig, 'ageRestriction', this.config.mapping.ageRestriction);
      }
      if (this.config.mapping.description) {
        this.mapField(item, gig, 'description', this.config.mapping.description);
      }

      // Generate ID and hash
      if (this.config.mapping.id.strategy === 'generated') {
        const title = gig.title || '';
        const venueName = gig.venue?.name || '';
        const dateStart = gig.dateStart || '';
        const city = gig.venue?.city || '';
        gig.id = createGigId(venueName, title, dateStart, city);
      }

      gig.hash = generateGigHash(gig);
      gig.status = 'scheduled';

      return gig as Gig;
    });
  }

  /**
   * Map a field from extracted data to gig object
   */
  private mapField(
    source: Record<string, any>, 
    target: Record<string, any>, 
    targetField: string, 
    sourceField: string,
    isArray: boolean = false,
    transform?: (val: any) => any
  ): void {
    const value = source[sourceField];
    if (value !== undefined && value !== null) {
      let finalValue = value;
      
      if (transform) {
        finalValue = transform(value);
      }
      
      if (isArray && !Array.isArray(finalValue)) {
        finalValue = [finalValue];
      }
      
      target[targetField] = finalValue;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate scraping results
   */
  private validateResults(gigs: Gig[]): void {
    const validation = this.config.validation;
    if (!validation) return;

    // Check minimum events
    if (gigs.length < validation.minEventsExpected) {
      throw new Error(`Expected at least ${validation.minEventsExpected} events, got ${gigs.length}`);
    }

    // Check maximum events
    if (validation.maxEventsExpected && gigs.length > validation.maxEventsExpected) {
      scraperLogger.warn(`Got ${gigs.length} events, expected max ${validation.maxEventsExpected}`);
    }

    // Check required fields
    for (const gig of gigs) {
      for (const field of validation.required) {
        if (!this.getNestedValue(gig, field)) {
          throw new Error(`Required field '${field}' missing in gig: ${gig.id}`);
        }
      }
    }
  }

  /**
   * Execute follow-up extraction on a separate page
   */
  private async executeFollowUp(url: string, fields: Record<string, any>): Promise<Record<string, any>> {
    if (!this.page) return {};

    scraperLogger.debug(`Following up on URL: ${url}`);
    
    const followUpData: Record<string, any> = {};
    
    try {
      // Navigate to the follow-up URL
      await this.page.goto(url);
      await this.page.waitForLoadState('domcontentloaded');
      
      // Rate limiting
      if (this.config.rateLimit?.delayBetweenRequests) {
        await this.sleep(this.config.rateLimit.delayBetweenRequests);
      }
      
      // Extract each field from the follow-up page
      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        try {
          const element = await this.page.$(fieldConfig.selector);
          if (element) {
            let value = await this.extractValue(element, fieldConfig.attribute || 'text');
            
            // Apply transformations
            if (value && fieldConfig.transform) {
              const transformedValue = this.transformValue(value, fieldConfig.transform, fieldConfig.transformParams);
              value = Array.isArray(transformedValue) ? transformedValue.join(', ') : transformedValue;
            }
            
            if (value) {
              followUpData[fieldName] = value;
            }
          }
        } catch (error) {
          scraperLogger.warn(`Failed to extract follow-up field '${fieldName}':`, error);
        }
      }
      
      scraperLogger.debug(`Follow-up extraction completed: ${Object.keys(followUpData).length} fields extracted`);
      
    } catch (error) {
      scraperLogger.warn(`Follow-up navigation failed for ${url}:`, error);
    }
    
    return followUpData;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get configuration for debugging
   */
  getConfig(): ScraperConfig {
    return this.config;
  }
}