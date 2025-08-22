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

// ============================================================================
// DATE/TIME PARSING UTILITIES (DRY Refactor)
// ============================================================================

interface DateParsingResult {
  date: Date;
  success: boolean;
  error?: string;
}

interface TimeParsingResult {
  hours: number;
  minutes: number;
  success: boolean;
  error?: string;
}

class DateTimeParser {
  private static readonly MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  private static readonly MONTH_ABBREVIATIONS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /**
   * Get month index from full name or abbreviation (0-based)
   */
  static getMonthIndex(monthName: string): number {
    // Try full names first
    const fullNameIndex = this.MONTH_NAMES.findIndex(month => 
      month.toLowerCase().startsWith(monthName.toLowerCase().substring(0, 3))
    );
    if (fullNameIndex !== -1) return fullNameIndex;

    // Try abbreviations
    return this.MONTH_ABBREVIATIONS.findIndex(abbr => 
      abbr.toLowerCase() === monthName.toLowerCase()
    );
  }

  /**
   * Convert 12-hour time to 24-hour format
   */
  static convertTo24Hour(hours: number, minutes: number, period: string): TimeParsingResult {
    try {
      let hour24 = hours;
      const lowerPeriod = period.toLowerCase();
      
      if (lowerPeriod === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (lowerPeriod === 'am' && hour24 === 12) {
        hour24 = 0;
      }
      
      return { hours: hour24, minutes, success: true };
    } catch (error) {
      return { 
        hours: 0, 
        minutes: 0, 
        success: false, 
        error: `Failed to convert time: ${error}` 
      };
    }
  }

  /**
   * Parse time from various formats ("19:30", "7:30 PM", "Doors: 07:00")
   */
  static parseTime(timeStr: string): TimeParsingResult {
    if (!timeStr || typeof timeStr !== 'string') {
      return { hours: 0, minutes: 0, success: false, error: 'Empty or invalid time string' };
    }

    const cleanTime = timeStr.trim();

    // Pattern 1: 24-hour format "19:30" or "07:00"
    const time24Match = cleanTime.match(/(\d{1,2}):(\d{2})$/);
    if (time24Match) {
      const hours = parseInt(time24Match[1]);
      const minutes = parseInt(time24Match[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return { hours, minutes, success: true };
      }
    }

    // Pattern 2: 12-hour format "7:30 PM" or "Doors: 07:00 pm"
    const time12Match = cleanTime.match(/(?:doors?:?\s*)?(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (time12Match) {
      const hours = parseInt(time12Match[1]);
      const minutes = parseInt(time12Match[2] || '00');
      const period = time12Match[3];
      return this.convertTo24Hour(hours, minutes, period);
    }

    // Pattern 3: Time range - extract start time "13:00 - 14:45"
    const rangeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
    if (rangeMatch) {
      const hours = parseInt(rangeMatch[1]);
      const minutes = parseInt(rangeMatch[2]);
      return { hours, minutes, success: true };
    }

    return { 
      hours: 0, 
      minutes: 0, 
      success: false, 
      error: `Unable to parse time format: "${timeStr}"` 
    };
  }

  /**
   * Create date with smart year inference
   */
  static createDateWithYearInference(month: number, day: number, baseHour: number = 12): Date {
    const now = new Date();
    let year = now.getFullYear();
    
    // If month is before current month, assume next year
    if (month < now.getMonth()) {
      year += 1;
    } else if (month === now.getMonth() && day < now.getDate()) {
      // If same month but day has passed, also next year
      year += 1;
    }
    
    const date = new Date(year, month, day, baseHour, 0, 0);
    
    // Sanity check: if date is more than 18 months in future, use current year
    const eighteenMonthsFromNow = new Date(now);
    eighteenMonthsFromNow.setMonth(now.getMonth() + 18);
    if (date > eighteenMonthsFromNow) {
      date.setFullYear(now.getFullYear());
    }
    
    return date;
  }

  /**
   * Parse relative date terms ("Today", "Tomorrow")
   */
  static parseRelativeDate(dateStr: string): DateParsingResult {
    const lower = dateStr.toLowerCase().trim();
    const today = new Date();
    
    if (lower === 'today') {
      return { date: new Date(today), success: true };
    }
    
    if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { date: tomorrow, success: true };
    }
    
    return { 
      date: new Date(), 
      success: false, 
      error: `Not a relative date: ${dateStr}` 
    };
  }

  /**
   * Parse ordinal day formats ("15th", "2nd", "23rd")
   */
  static parseOrdinalDay(dayStr: string): number | null {
    const match = dayStr.match(/(\d{1,2})(?:st|nd|rd|th)?/);
    if (match) {
      const day = parseInt(match[1]);
      if (day >= 1 && day <= 31) {
        return day;
      }
    }
    return null;
  }

  /**
   * Generic date parser that handles multiple common formats
   */
  static parseDate(dateStr: string, timeStr?: string, options: {
    defaultHour?: number;
    format?: 'bristol-standard' | 'thekla' | 'fleece';
    fallbackYear?: number;
  } = {}): DateParsingResult {
    const defaultHour = options.defaultHour || 19; // Default to 7 PM for gigs
    
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        return { 
          date: new Date(), 
          success: false, 
          error: 'Empty or invalid date string' 
        };
      }

      const cleanDateStr = dateStr.replace(/\s+/g, ' ').trim();

      // Handle relative dates first
      const relativeResult = this.parseRelativeDate(cleanDateStr);
      if (relativeResult.success) {
        if (timeStr) {
          const timeResult = this.parseTime(timeStr);
          if (timeResult.success) {
            relativeResult.date.setHours(timeResult.hours, timeResult.minutes, 0, 0);
          }
        }
        return relativeResult;
      }

      // Handle specific formats based on options
      if (options.format === 'thekla') {
        return this.parseTheklaFormat(cleanDateStr);
      }
      
      if (options.format === 'fleece') {
        return this.parseFleeceFormat(cleanDateStr, timeStr);
      }
      

      // Generic patterns
      return this.parseGenericDateFormat(cleanDateStr, timeStr, defaultHour);
      
    } catch (error) {
      return { 
        date: new Date(), 
        success: false, 
        error: `Failed to parse date: ${error}` 
      };
    }
  }

  private static parseTheklaFormat(dateStr: string): DateParsingResult {
    // "Wed.13.Aug.25" format
    const match = dateStr.match(/^(\w{3})\.(\d{1,2})\.(\w{3})\.(\d{2})$/);
    if (match) {
      const [, dayName, day, monthAbbr, year] = match;
      const monthIndex = this.getMonthIndex(monthAbbr);
      
      if (monthIndex !== -1) {
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        const date = new Date(fullYear, monthIndex, parseInt(day), 12, 0, 0);
        
        if (!isNaN(date.getTime())) {
          return { date, success: true };
        }
      }
    }
    
    return { 
      date: new Date(), 
      success: false, 
      error: `Invalid Thekla format: ${dateStr}` 
    };
  }

  private static parseFleeceFormat(dateStr: string, timeStr?: string): DateParsingResult {
    // "Tuesday 12 Aug 2025" format
    const match = dateStr.match(/^(?:(\w+)\s+)?(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (match) {
      const [, dayName, day, month, year] = match;
      const monthIndex = this.getMonthIndex(month);
      
      if (monthIndex !== -1) {
        let hour = 12;
        let minute = 0;
        
        if (timeStr) {
          const timeResult = this.parseTime(timeStr);
          if (timeResult.success) {
            hour = timeResult.hours;
            minute = timeResult.minutes;
          }
        }
        
        const date = new Date(parseInt(year), monthIndex, parseInt(day), hour, minute);
        
        if (!isNaN(date.getTime())) {
          return { date, success: true };
        }
      }
    }
    
    return { 
      date: new Date(), 
      success: false, 
      error: `Invalid Fleece format: ${dateStr}` 
    };
  }

  private static parseGenericDateFormat(dateStr: string, timeStr?: string, defaultHour: number = 19): DateParsingResult {
    // Handle various common formats
    
    // Pattern 1: "Friday 15th August 22:30 - 03:00" (with time in date string)
    let match = dateStr.match(/^(\w+day)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{1,2}):(\d{2})(?:\s*-\s*\d{1,2}:\d{2})?$/);
    if (match) {
      const [, dayName, day, month, hour, minute] = match;
      const monthIndex = this.getMonthIndex(month);
      
      if (monthIndex !== -1) {
        const date = this.createDateWithYearInference(monthIndex, parseInt(day), parseInt(hour));
        date.setMinutes(parseInt(minute));
        return { date, success: true };
      }
    }
    
    // Pattern 2: "Friday 15th August" (date only)
    match = dateStr.match(/^(?:(\w+day)\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)$/);
    if (match) {
      const [, dayName, day, month] = match;
      const monthIndex = this.getMonthIndex(month);
      
      if (monthIndex !== -1) {
        const date = this.createDateWithYearInference(monthIndex, parseInt(day), defaultHour);
        
        // Apply time if provided separately
        if (timeStr) {
          const timeResult = this.parseTime(timeStr);
          if (timeResult.success) {
            date.setHours(timeResult.hours, timeResult.minutes, 0, 0);
          }
        }
        
        return { date, success: true };
      }
    }
    
    // Pattern 3: Try to parse with JavaScript Date constructor as fallback
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      if (timeStr) {
        const timeResult = this.parseTime(timeStr);
        if (timeResult.success) {
          fallbackDate.setHours(timeResult.hours, timeResult.minutes, 0, 0);
        }
      }
      return { date: fallbackDate, success: true };
    }
    
    return { 
      date: new Date(), 
      success: false, 
      error: `Unable to parse generic date format: ${dateStr}` 
    };
  }
}

// Exchange Bristol specific utilities
class ExchangeBristolDateParser {
  /**
   * Parse Exchange Bristol date groups like "Today" or "Monday 11th August"
   */
  static parseDateGroup(dateGroup: string): string | null {
    const result = DateTimeParser.parseRelativeDate(dateGroup);
    if (result.success) {
      return result.date.toISOString().substring(0, 10); // Return just YYYY-MM-DD
    }
    
    // Parse formats like "Monday 11th August", "Friday 10 January", "Sunday 17 August"
    const cleanDateStr = dateGroup.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const parts = cleanDateStr.trim().split(' ');
    
    if (parts.length >= 3) {
      const day = parseInt(parts[1]); // e.g., "11"
      const month = parts[2]; // e.g., "August"
      
      const monthIndex = DateTimeParser.getMonthIndex(month);
      
      if (monthIndex !== -1 && !isNaN(day)) {
        const date = DateTimeParser.createDateWithYearInference(monthIndex, day, 12);
        return date.toISOString().substring(0, 10); // Return just YYYY-MM-DD
      }
    }
    
    // Return null for unparseable dates like "Valentines day"
    scraperLogger.warn(`Unable to parse date group: "${dateGroup}" - skipping events with this date`);
    return null;
  }
  
  /**
   * Combine date group and time range into ISO datetime
   */
  static parseDateTime(timeRange: string, params?: Record<string, any>): string | null {
    try {
      // Extract date from params.dateGroup if provided
      let dateStr: string | null;
      if (params?.dateGroup) {
        dateStr = this.parseDateGroup(params.dateGroup);
        if (dateStr === null) {
          return null; // Skip event if date group couldn't be parsed
        }
      } else {
        dateStr = new Date().toISOString().substring(0, 10);
      }
      
      scraperLogger.debug(`Parsing datetime - dateGroup: ${params?.dateGroup}, dateStr: ${dateStr}, timeRange: ${timeRange}`);
      
      // Parse time range like "13:00 - 14:45" or "20:00 - 02:00"
      const timeMatch = timeRange.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      
      if (timeMatch) {
        const [, startHour, startMin, endHour, endMin] = timeMatch;
        const baseDate = new Date(`${dateStr}T00:00:00.000Z`);
        
        if (isNaN(baseDate.getTime())) {
          scraperLogger.warn(`Invalid base date: ${dateStr}, falling back to today`);
          return new Date().toISOString();
        }
        
        const isEndTime = params?.isEndTime || false;
        
        if (isEndTime) {
          // Handle end time that might go past midnight
          const startTime = parseInt(startHour);
          const endTime = parseInt(endHour);
          
          const endDate = new Date(baseDate);
          endDate.setUTCHours(parseInt(endHour), parseInt(endMin), 0, 0);
          
          if (endTime < startTime) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
          }
          
          return endDate.toISOString();
        } else {
          // Start time
          const startDate = new Date(baseDate);
          startDate.setUTCHours(parseInt(startHour), parseInt(startMin), 0, 0);
          return startDate.toISOString();
        }
      }
      
      // If time parsing fails but we have a valid date, return date with noon time
      const date = new Date(`${dateStr}T12:00:00.000Z`);
      if (!isNaN(date.getTime())) {
        scraperLogger.warn(`Could not parse time from "${timeRange}", using date only with noon time`);
        return date.toISOString();
      }
      
      return timeRange; // Return original value if all parsing fails
      
    } catch (error) {
      scraperLogger.error(`Error parsing Exchange Bristol datetime: ${error}`);
      return timeRange;
    }
  }
}

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
    if ((action as any).method === 'bristol-exchange' || this.config.site.source === 'bristol-exchange') {
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

    // Handle action-level follow-up extraction if configured
    if (action.followUp && action.followUp.urlField) {
      scraperLogger.debug(`Processing action-level followUp for ${this.extractedData.length} items`);
      
      // Create a copy of the items to avoid modifying while iterating
      const itemsToProcess = [...this.extractedData];
      
      for (const item of itemsToProcess) {
        const followUpUrl = item[action.followUp.urlField];
        if (followUpUrl) {
          try {
            scraperLogger.debug(`Following up on URL: ${followUpUrl}`);
            const followUpData = await this.executeFollowUp(followUpUrl, action.followUp.fields);
            // Merge follow-up data into the item
            Object.assign(item, followUpData);
          } catch (error) {
            scraperLogger.warn(`Action-level follow-up extraction failed for URL ${followUpUrl}:`, error);
          }
        }
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
  private transformValue(value: string | string[], transform: string, transformParams?: Record<string, any>): string | string[] | null {
    if (Array.isArray(value)) {
      return value.map(v => this.transformSingleValue(v, transform, transformParams)).filter(v => v !== null) as string[];
    }
    return this.transformSingleValue(value, transform, transformParams);
  }

  private transformSingleValue(value: string, transform: string, transformParams?: Record<string, any>): string | null {
    // Use a transform registry for better organization and extensibility
    const transformRegistry: Record<string, (val: string, params?: Record<string, any>) => string | null> = {
      // Basic string transforms
      'trim': (val) => val.trim(),
      'lowercase': (val) => val.toLowerCase(),
      'uppercase': (val) => val.toUpperCase(),
      'slug': (val) => val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim(),
      
      // Date/time transforms - now using our DRY utilities
      'date': (val) => {
        const result = DateTimeParser.parseDate(val);
        return result.success ? result.date.toISOString() : new Date(val).toISOString();
      },
      'time-range-start': (val) => {
        const match = val.match(/^(\d{1,2}:\d{2})/);
        return match ? match[1] : val;
      },
      'time-range-end': (val) => {
        const match = val.match(/(\d{1,2}:\d{2})$/);
        return match ? match[1] : val;
      },
      
      // URL transforms - consolidated logic
      'url': (val, params) => this.transformUrl(val, this.config.site.baseUrl),
      'louisiana-url': (val, params) => this.transformUrl(val, this.config.site.baseUrl || 'https://www.thelouisiana.net'),
      
      // Venue-specific transforms
      'exchange-venue-name': (val) => {
        const trimmed = val.trim();
        if (!trimmed || trimmed.toLowerCase().includes('exchange')) {
          return 'Exchange';
        }
        return `Exchange, ${trimmed}`;
      },
      'static-louisiana-name': () => 'The Louisiana Bristol',
      
      // Regex-based transforms
      'extract-text': (val, params) => {
        if (params?.pattern) {
          const match = val.match(new RegExp(params.pattern, params.flags || 'i'));
          return match ? (match[1] || match[0]) : val;
        }
        return val;
      },
      'regex': (val, params) => {
        if (params?.pattern) {
          const regex = new RegExp(params.pattern, params.flags || 'g');
          return val.replace(regex, params.replacement || '');
        }
        return val;
      },
      
      // Date parsing transforms - using our DRY utilities
      'bristol-exchange-datetime': (val, params) => this.parseExchangeBristolDateTime(val, params),
      'parse-date-group': (val, params) => this.parseExchangeBristolDateGroup(val),
      'lanes-bristol-date': (val, params) => this.parseLanesBristolDate(val),
      'croft-bristol-date': (val, params) => this.parseCroftBristolDate(val),
      'strange-brew-datetime': (val, params) => this.parseStrangeBrewDateTime(val, params),
      'thekla-bristol-date': (val, params) => this.parseTheklaBristolDate(val),
      'fleece-bristol-datetime': (val, params) => this.parseFleeceBristolDateTime(val, params),
      'louisiana-bristol-datetime': (val, params) => this.parseLouisianaBristolDateTime(val, params),
      'electric-bristol-datetime': (val, params) => this.parseElectricBristolDateTime(val, params)
    };
    
    const transformer = transformRegistry[transform];
    if (transformer) {
      return transformer(value, transformParams);
    }
    
    // Log unknown transforms for debugging
    scraperLogger.warn(`Unknown transform type: ${transform}`);
    return value;
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
      let skipEvent = false;

      for (const [fieldName, value] of Object.entries(item)) {
        const fieldConfig = action.fields[fieldName];
        let processedValue = value;

        // Apply transformations
        if (fieldConfig?.transform && processedValue && typeof processedValue === 'string') {
          if (fieldConfig.transform === 'bristol-exchange-datetime') {
            // Special case: pass dateGroup and field context as transform parameters
            const transformParams = { 
              dateGroup: item.dateGroup,
              isEndTime: fieldName === 'endTime'
            };
            processedValue = this.parseExchangeBristolDateTime(processedValue, transformParams);
            // Skip event if date couldn't be parsed
            if (processedValue === null) {
              scraperLogger.info(`Skipping event "${item.title}" due to unparseable date group: "${item.dateGroup}"`);
              skipEvent = true;
              break;
            }
          } else {
            processedValue = this.transformValue(processedValue, fieldConfig.transform, fieldConfig.transformParams);
          }
        }

        processedItem[fieldName] = processedValue;
      }

      // Only add events with parseable dates
      if (!skipEvent) {
        this.extractedData.push(processedItem);
      }
    }

    scraperLogger.info(`Exchange Bristol extraction completed: ${this.extractedData.length} of ${extractedData.length} events processed (skipped unparseable dates)`);
  }

  /**
   * Parse Exchange Bristol date groups like "Today" or "Monday 11th August"
   * @deprecated Use ExchangeBristolDateParser.parseDateGroup() instead
   */
  private parseExchangeBristolDateGroup(dateGroup: string): string | null {
    return ExchangeBristolDateParser.parseDateGroup(dateGroup);
  }

  /**
   * Combine date group and time range into ISO datetime
   * @deprecated Use ExchangeBristolDateParser.parseDateTime() instead
   */
  private parseExchangeBristolDateTime(timeRange: string, params?: Record<string, any>): string | null {
    return ExchangeBristolDateParser.parseDateTime(timeRange, params);
  }

  // Note: getMonthIndex and getMonthIndexFromAbbr methods were removed
  // Use DateTimeParser.getMonthIndex() directly instead

  /**
   * Parse The Lanes Bristol date format like "Friday 15th August 22:30 - 03:00"
   */
  private parseLanesBristolDate(dateStr: string): string {
    try {
      scraperLogger.info(`🔍 PARSING LANES BRISTOL DATE: "${dateStr}"`);
      
      // Preprocess the date string to handle "Tomorrow"
      let processedDateStr = dateStr.trim();
      
      if (processedDateStr.toLowerCase().includes('tomorrow')) {
        scraperLogger.info(`✅ DETECTED "TOMORROW" in date string: "${dateStr}"`);
        
        // Extract time if present (e.g., "Tomorrow 19:00 - 22:00")
        const timeMatch = processedDateStr.match(/(\d{1,2}):(\d{2})/);
        let timeStr = '';
        if (timeMatch) {
          timeStr = ` ${timeMatch[0]}`;
          scraperLogger.info(`⏰ EXTRACTED TIME from Tomorrow string: "${timeMatch[0]}"`);
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
        
        processedDateStr = `${dayName} ${date}${ordinalSuffix} ${monthName}${timeStr}`;
        scraperLogger.info(`🔄 CONVERTED "Tomorrow" to: "${processedDateStr}"`);
      }
      
      const result = DateTimeParser.parseDate(processedDateStr, undefined, { 
        format: 'bristol-standard',
        defaultHour: 22 // Most Lanes events are in the evening
      });
      
      if (result.success) {
        const isoString = result.date.toISOString();
        scraperLogger.info(`✅ SUCCESSFULLY PARSED Lanes Bristol date "${dateStr}" to "${isoString}"`);
        return isoString;
      } else {
        scraperLogger.error(`❌ FAILED TO PARSE Lanes Bristol date: "${dateStr}" - ${result.error}`);
        // Instead of throwing, return the preprocessed date string
        scraperLogger.error(`🔄 RETURNING PROCESSED DATE STRING: "${processedDateStr}"`);
        return processedDateStr;
      }
      
    } catch (error) {
      scraperLogger.error(`💥 ERROR parsing Lanes Bristol date "${dateStr}":`, error);
      return dateStr;
    }
  }

  /**
   * Parse The Croft Bristol date format like "Friday 12th September"
   */
  private parseCroftBristolDate(dateStr: string): string {
    try {
      scraperLogger.debug(`Parsing Croft Bristol date: "${dateStr}"`);
      
      const result = DateTimeParser.parseDate(dateStr, undefined, {
        format: 'bristol-standard',
        defaultHour: 19 // Default to 7 PM for gigs
      });
      
      if (result.success) {
        const isoString = result.date.toISOString();
        scraperLogger.debug(`Parsed Croft Bristol date: "${dateStr}" -> "${isoString}"`);
        return isoString;
      } else {
        throw new Error(`Failed to parse: ${result.error}`);
      }
    } catch (error) {
      scraperLogger.error(`Error parsing Croft Bristol date "${dateStr}":`, error);
      return new Date().toISOString(); // Fallback to today
    }
  }

  /**
   * Parse Thekla Bristol date format like "Wed.13.Aug.25"
   */
  private parseTheklaBristolDate(dateStr: string): string {
    try {
      scraperLogger.debug(`Parsing Thekla Bristol date: "${dateStr}"`);
      
      const result = DateTimeParser.parseDate(dateStr, undefined, {
        format: 'thekla',
        defaultHour: 12 // Noon for date-only events
      });
      
      if (result.success) {
        const isoString = result.date.toISOString();
        scraperLogger.debug(`Parsed Thekla Bristol date "${dateStr}" to "${isoString}"`);
        return isoString;
      } else {
        // Try fallback parsing
        scraperLogger.warn(`Could not parse Thekla Bristol date format: "${dateStr}", attempting fallback`);
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate.toISOString();
        }
        
        scraperLogger.error(`Failed to parse Thekla Bristol date: "${dateStr}"`);
        return dateStr;
      }
      
    } catch (error) {
      scraperLogger.error(`Error parsing Thekla Bristol date "${dateStr}":`, error);
      return dateStr;
    }
  }

  /**
   * Parse The Fleece Bristol date format like "Tuesday 12 Aug 2025" combined with doors time like "Doors: 07:00"
   */
  private parseFleeceBristolDateTime(dateStr: string, params?: Record<string, any>): string {
    try {
      scraperLogger.debug(`Parsing Fleece Bristol date: "${dateStr}"`);
      
      const timeStr = params?.doorsTime;
      const result = DateTimeParser.parseDate(dateStr, timeStr, {
        format: 'fleece',
        defaultHour: 12
      });
      
      if (result.success) {
        const isoString = result.date.toISOString();
        scraperLogger.debug(`Parsed Fleece Bristol date "${dateStr}" with doors time to "${isoString}"`);
        return isoString;
      } else {
        throw new Error(`Could not parse Fleece Bristol date format: ${result.error}`);
      }
      
    } catch (error) {
      scraperLogger.error(`Error parsing Fleece Bristol date "${dateStr}":`, error);
      // Return a date far in the future to indicate parsing failure
      return new Date('2099-12-31T23:59:59.000Z').toISOString();
    }
  }

  /**
   * Parse Strange Brew Bristol date format like "Friday 7th November\n19:00" with time included
   */
  private parseStrangeBrewDateTime(dateStr: string, params?: Record<string, any>): string {
    try {
      scraperLogger.debug(`Parsing Strange Brew date: "${dateStr}"`);
      
      const result = DateTimeParser.parseDate(dateStr, undefined, {
        format: 'bristol-standard',
        defaultHour: 19 // Default to 7 PM
      });
      
      if (result.success) {
        const isoString = result.date.toISOString();
        scraperLogger.debug(`Parsed date: ${isoString}`);
        return isoString;
      } else {
        throw new Error(`Date does not match expected pattern: ${result.error}`);
      }
      
    } catch (error) {
      scraperLogger.error(`Error parsing Strange Brew date "${dateStr}":`, error);
      // Return a date far in the future to indicate parsing failure
      return new Date('2099-12-31T23:59:59.000Z').toISOString();
    }
  }


  /**
   * Helper method for URL transformation - consolidates URL logic
   */
  private transformUrl(value: string, baseUrl?: string): string {
    if (!value || value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    if (!baseUrl) {
      return value; // Return as-is if no baseUrl configured
    }
    
    // Handle different types of relative URLs
    if (value.startsWith('/')) {
      // Absolute path from root
      return `${baseUrl}${value}`;
    } else if (value.startsWith('#')) {
      // Fragment/anchor - append to current page
      return `${baseUrl}/${value}`;
    } else {
      // Relative path without leading slash
      return `${baseUrl}/${value}`;
    }
  }
  

  /**
   * Parse Louisiana Bristol date and combine with time from detail page
   */
  private parseLouisianaBristolDateTime(dateStr: string, params?: Record<string, any>): string {
    try {
      if (!dateStr || dateStr.trim() === '') {
        scraperLogger.warn('Empty date string for Louisiana Bristol');
        return new Date().toISOString();
      }

      // Get time from detail page (detailedTime) or fallback to main time field
      let timeStr = '';
      if (params?.timeField && this.extractedData.length > 0) {
        const currentItem = this.extractedData[this.extractedData.length - 1];
        timeStr = currentItem[params.timeField] || '';
      }
      
      if (!timeStr && params?.fallbackTimeField && this.extractedData.length > 0) {
        const currentItem = this.extractedData[this.extractedData.length - 1];
        timeStr = currentItem[params.fallbackTimeField] || '';
      }
      
      if (!timeStr) {
        timeStr = params?.fallbackTime || '7:30pm';
      }

      scraperLogger.debug(`Louisiana date: "${dateStr}", time: "${timeStr}"`);
      
      const result = DateTimeParser.parseDate(dateStr, timeStr, {
        format: 'bristol-standard',
        defaultHour: 19 // Default to 7:30 PM
      });
      
      if (result.success) {
        return result.date.toISOString();
      } else {
        scraperLogger.warn(`Could not parse Louisiana date: "${dateStr}", using today`);
        return new Date().toISOString();
      }
      
    } catch (error) {
      scraperLogger.error(`Error parsing Louisiana date "${dateStr}":`, error);
      return new Date().toISOString();
    }
  }

  /**
   * Parse Electric Bristol date format (e.g., "27th August 2025")
   */
  private parseElectricBristolDateTime(dateStr: string, params?: Record<string, any>): string {
    try {
      if (!dateStr || dateStr.trim() === '') {
        scraperLogger.warn('Empty date string for Electric Bristol');
        return new Date().toISOString();
      }

      const trimmed = dateStr.trim();
      
      // Convert dates like "27th August 2025" to "27 August 2025" by removing ordinals
      const cleanedDate = trimmed
        .replace(/(\d+)(st|nd|rd|th)\s+/g, '$1 ')
        .trim();
      
      scraperLogger.debug(`Electric Bristol: "${dateStr}" -> "${cleanedDate}"`);
      
      // Parse with cleaned date
      const result = DateTimeParser.parseDate(cleanedDate, params?.fallbackTime || '7:00pm', {
        format: 'bristol-standard',
        defaultHour: 19 // Default to 7:00 PM
      });
      
      if (result.success) {
        return result.date.toISOString();
      } else {
        scraperLogger.warn(`Could not parse Electric Bristol date: "${dateStr}" (cleaned: "${cleanedDate}"), using today`);
        return new Date().toISOString();
      }
      
    } catch (error) {
      scraperLogger.error(`Error parsing Electric Bristol date "${dateStr}":`, error);
      return new Date().toISOString();
    }
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
      // Handle venue.name - check if it's a field from extracted data or a static value
      if (this.config.mapping.venue.name) {
        if (item[this.config.mapping.venue.name] !== undefined) {
          this.mapField(item, venue, 'name', this.config.mapping.venue.name);
        } else {
          // Static value
          venue.name = this.config.mapping.venue.name;
        }
      }
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
      if (typeof this.config.mapping.date.start === 'string') {
        // Simple field mapping
        this.mapField(item, gig, 'dateStart', this.config.mapping.date.start);
      } else if (typeof this.config.mapping.date.start === 'object' && this.config.mapping.date.start.field) {
        // Complex field mapping with transformation
        const dateConfig = this.config.mapping.date.start;
        let value = item[dateConfig.field];
        
        if (value !== undefined && value !== null && dateConfig.transform) {
          // Prepare transform parameters by resolving field references
          const transformParams = { ...dateConfig.transformParams };
          if (transformParams) {
            for (const [key, paramValue] of Object.entries(transformParams)) {
              if (typeof paramValue === 'string' && item[paramValue] !== undefined) {
                transformParams[key] = item[paramValue];
              }
            }
          }
          
          value = this.transformValue(value, dateConfig.transform, transformParams);
        }
        
        if (value !== undefined && value !== null) {
          gig.dateStart = value;
        }
      }
      
      if (this.config.mapping.date.end) {
        if (typeof this.config.mapping.date.end === 'string') {
          this.mapField(item, gig, 'dateEnd', this.config.mapping.date.end);
        } else if (typeof this.config.mapping.date.end === 'object' && this.config.mapping.date.end.field) {
          // Handle complex end date mapping if needed
          const dateConfig = this.config.mapping.date.end;
          let value = item[dateConfig.field];
          
          if (value !== undefined && value !== null && dateConfig.transform) {
            const transformParams = { ...dateConfig.transformParams };
            if (transformParams) {
              for (const [key, paramValue] of Object.entries(transformParams)) {
                if (typeof paramValue === 'string' && item[paramValue] !== undefined) {
                  transformParams[key] = item[paramValue];
                }
              }
            }
            
            value = this.transformValue(value, dateConfig.transform, transformParams);
          }
          
          if (value !== undefined && value !== null) {
            gig.dateEnd = value;
          }
        }
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