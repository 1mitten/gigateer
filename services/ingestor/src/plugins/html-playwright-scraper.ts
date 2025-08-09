import type { Gig, ScraperPlugin } from "@gigateer/contracts";
import { createGigId, createGigHash, validateGig } from "@gigateer/contracts";
import { 
  StealthBrowser,
  createStealthBrowser,
  HTMLParser,
  HTMLEventData,
  EventExtractionConfig,
  parseAddress,
  extractPrice,
  extractArtists,
  extractGenres,
  parseDate,
  combineDateAndTime,
  ScraperError,
  ParseError,
  NetworkError,
  checkRobotsTxt
} from "@gigateer/scraper";

/**
 * HTML scraper plugin using Playwright with stealth features
 */
export class HTMLPlaywrightScraper implements ScraperPlugin {
  private baseUrl: string;
  private sourceName: string;
  private urls: string[];
  private extractionConfig: EventExtractionConfig;
  private browser: StealthBrowser | null = null;

  constructor(
    baseUrl: string,
    sourceName: string,
    urls: string[] = [],
    extractionConfig: EventExtractionConfig = {}
  ) {
    this.baseUrl = baseUrl;
    this.sourceName = sourceName;
    this.urls = urls.length > 0 ? urls : [baseUrl];
    this.extractionConfig = extractionConfig;
  }

  get upstreamMeta() {
    return {
      name: this.sourceName,
      rateLimitPerMin: 6, // Conservative rate limiting for HTML scraping
      defaultSchedule: "0 */6 * * *", // Every 6 hours
      description: `HTML scraper using Playwright for ${this.sourceName}`,
      baseUrl: this.baseUrl,
    };
  }

  async fetchRaw(): Promise<unknown[]> {
    this.browser = createStealthBrowser(this.upstreamMeta.rateLimitPerMin);
    
    try {
      console.log(`Starting HTML scraping for ${this.sourceName}`);
      
      // Check robots.txt before proceeding
      const robotsAllowed = await checkRobotsTxt(this.baseUrl, "/", "Gigateer");
      if (!robotsAllowed) {
        throw new ScraperError(
          `Robots.txt disallows crawling for ${this.baseUrl}`,
          this.sourceName
        );
      }
      
      const rawEvents: HTMLEventData[] = [];
      
      for (const url of this.urls) {
        try {
          console.log(`Scraping ${url}`);
          
          const page = await this.browser.createPage();
          
          // Navigate with retry logic
          await this.browser.navigateWithRetry(page, url, this.sourceName);
          
          // Wait for content to load
          await page.waitForLoadState("domcontentloaded");
          
          // Simulate human scrolling for sites that load content dynamically
          await this.browser.simulateHumanScrolling(page);
          
          // Get the page content
          const html = await page.content();
          
          // Parse the HTML
          const parser = new HTMLParser(html, this.sourceName);
          
          // Try structured data extraction first
          const structuredEvents = parser.extractStructuredEventData();
          
          if (structuredEvents.length > 0) {
            console.log(`Found ${structuredEvents.length} events via structured data`);
            rawEvents.push(...structuredEvents);
          } else {
            // Fall back to custom extraction
            const eventData = parser.extractEventData(this.extractionConfig);
            if (eventData.title) {
              console.log(`Found 1 event via custom extraction`);
              rawEvents.push(eventData);
            } else {
              console.log(`No events found on ${url}`);
            }
          }
          
          await page.close();
          
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          // Continue with other URLs even if one fails
        }
      }
      
      console.log(`Successfully scraped ${rawEvents.length} events from ${this.sourceName}`);
      return rawEvents;
      
    } catch (error) {
      console.error(`Failed to scrape ${this.sourceName}:`, error);
      throw new ScraperError(
        `Failed to scrape HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sourceName,
        error instanceof Error ? error : undefined
      );
    }
  }

  async normalize(rawData: unknown[]): Promise<Gig[]> {
    const gigs: Gig[] = [];
    const now = new Date().toISOString();
    
    console.log(`Normalizing ${rawData.length} HTML events from ${this.sourceName}`);
    
    for (const rawEvent of rawData) {
      try {
        const eventData = rawEvent as HTMLEventData;
        
        // Skip events without required fields
        if (!eventData.title) {
          console.warn(`Skipping event missing title:`, eventData);
          continue;
        }
        
        // Extract and normalize venue information
        const venue = this.normalizeVenue(eventData);
        
        // Extract and normalize date/time
        const dateInfo = this.normalizeDateInfo(eventData);
        
        if (!dateInfo.dateStart) {
          console.warn(`Skipping event missing start date:`, eventData);
          continue;
        }
        
        // Extract artists
        const artists = this.normalizeArtists(eventData);
        
        // Extract genres
        const genres = this.normalizeGenres(eventData);
        
        // Extract price information
        const price = this.normalizePrice(eventData);
        
        // Build the gig object
        const gigData: Partial<Gig> = {
          source: this.sourceName,
          sourceId: eventData.eventUrl || undefined,
          title: eventData.title,
          artists,
          genre: genres,
          dateStart: dateInfo.dateStart,
          dateEnd: dateInfo.dateEnd || undefined,
          venue,
          price,
          status: "scheduled",
          ticketsUrl: eventData.ticketsUrl || undefined,
          eventUrl: eventData.eventUrl || undefined,
          images: eventData.imageUrls || [],
          updatedAt: now,
        };
        
        // Generate ID and hash
        gigData.id = createGigId(
          gigData.venue?.name || "unknown-venue",
          gigData.title || "unknown-event",
          gigData.dateStart || new Date().toISOString(),
          gigData.venue?.city
        );
        gigData.hash = createGigHash(gigData);
        
        // Validate the gig object
        const validatedGig = validateGig(gigData);
        gigs.push(validatedGig);
        
      } catch (error) {
        console.error(`Failed to normalize HTML event from ${this.sourceName}:`, error, rawEvent);
        // Continue processing other events even if one fails
      }
    }
    
    console.log(`Successfully normalized ${gigs.length}/${rawData.length} events from ${this.sourceName}`);
    return gigs;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private normalizeVenue(eventData: HTMLEventData): Gig['venue'] {
    let venueName = eventData.venue || "";
    let address = eventData.address || "";
    let city: string | undefined;
    let country: string | undefined;
    
    // If we have an address, parse it for city/country
    if (address) {
      const parsedAddress = parseAddress(address);
      city = parsedAddress.city || undefined;
      country = parsedAddress.country || undefined;
      
      // If venue name is empty but we have an address, use first part as venue
      if (!venueName) {
        venueName = parsedAddress.address.split(",")[0].trim() || "TBD";
      }
    }
    
    // Try to extract venue from title if still empty
    if (!venueName && eventData.title) {
      const atMatch = eventData.title.match(/(.+?)\s+[@at]\s+(.+)/i);
      if (atMatch) {
        venueName = atMatch[2].trim();
      }
    }
    
    return {
      name: venueName || "TBD",
      address: address || undefined,
      city,
      country,
    };
  }

  private normalizeDateInfo(eventData: HTMLEventData): { 
    dateStart: string | null; 
    dateEnd: string | null; 
  } {
    let dateStart: string | null = null;
    let dateEnd: string | null = null;
    
    try {
      // Try to use pre-parsed dateStart first
      if (eventData.dateStart) {
        dateStart = eventData.dateStart;
      }
      // Try to combine separate date and time fields
      else if (eventData.timeStart && (eventData.dateStart || eventData.venue)) {
        // If we have time but no date, we can't create a valid datetime
        // This is a limitation - we'd need the current context or a base date
        console.warn("Found time but no date for event:", eventData.title);
      }
      
      // Handle end date
      if (eventData.dateEnd) {
        dateEnd = eventData.dateEnd;
      } else if (eventData.timeEnd && dateStart) {
        try {
          // Extract date part from dateStart and combine with timeEnd
          const datePart = dateStart.split('T')[0];
          dateEnd = combineDateAndTime(datePart, eventData.timeEnd, this.sourceName);
        } catch (error) {
          console.warn("Failed to parse end time:", error);
        }
      }
      
    } catch (error) {
      console.warn("Failed to parse date information:", error);
    }
    
    return { dateStart, dateEnd };
  }

  private normalizeArtists(eventData: HTMLEventData): string[] {
    if (eventData.artists && eventData.artists.length > 0) {
      return eventData.artists;
    }
    
    // Try to extract from title
    const titleArtists = extractArtists(eventData.title || "");
    if (titleArtists.length > 0) {
      return titleArtists;
    }
    
    // Try to extract from description
    if (eventData.description) {
      const descArtists = extractArtists(eventData.description);
      if (descArtists.length > 0) {
        return descArtists;
      }
    }
    
    return [];
  }

  private normalizeGenres(eventData: HTMLEventData): string[] {
    const genres = new Set<string>();
    
    // Use pre-extracted genres
    if (eventData.genres) {
      eventData.genres.forEach(genre => genres.add(genre));
    }
    
    // Extract from all text fields
    const allText = [
      eventData.title,
      eventData.description,
      eventData.venue,
    ].filter(Boolean).join(" ");
    
    const extractedGenres = extractGenres(allText);
    extractedGenres.forEach(genre => genres.add(genre));
    
    return Array.from(genres);
  }

  private normalizePrice(eventData: HTMLEventData): Gig['price'] | undefined {
    if (eventData.price) {
      const priceInfo = extractPrice(eventData.price);
      
      if (priceInfo.min !== null || priceInfo.max !== null) {
        return {
          min: priceInfo.min,
          max: priceInfo.max,
          currency: priceInfo.currency,
        };
      }
    }
    
    return undefined;
  }
}

/**
 * Factory function to create HTML scrapers with common configurations
 */
export function createHTMLScraper(
  baseUrl: string,
  sourceName: string,
  urls?: string[],
  config?: EventExtractionConfig
): HTMLPlaywrightScraper {
  return new HTMLPlaywrightScraper(baseUrl, sourceName, urls, config);
}

/**
 * Example HTML scraper for a hypothetical venue website
 */
export const exampleVenueHTMLScraper: ScraperPlugin = new HTMLPlaywrightScraper(
  "https://example-venue.com",
  "example-venue-html",
  ["https://example-venue.com/events", "https://example-venue.com/calendar"],
  {
    title: [".event-title", "h1", ".title"],
    date: [".event-date", ".date", "time"],
    venue: [".venue-name", ".location"],
    price: [".price", ".ticket-price"],
    artists: [".performers", ".artists", ".lineup"],
  }
);

export default HTMLPlaywrightScraper;