import type { ScraperPlugin } from "@gigateer/contracts";
import { EventExtractionConfig } from "@gigateer/scraper";
import { HTMLPlaywrightScraper } from "./html-playwright-scraper";

/**
 * Generic venue website scraper with Playwright
 * Configured for common venue website patterns
 */
export class VenueWebsiteScraper extends HTMLPlaywrightScraper {
  private venueName: string;
  
  constructor(
    venueName: string,
    baseUrl: string,
    eventUrls: string[] = [],
    customConfig?: Partial<EventExtractionConfig>
  ) {
    const sourceName = `${venueName.toLowerCase().replace(/\s+/g, '-')}-website`;
    
    // Common venue website patterns
    const defaultConfig: EventExtractionConfig = {
      title: [
        ".event-title",
        ".title",
        "h1",
        "h2",
        ".event-name",
        ".show-title",
        "[itemprop='name']"
      ],
      date: [
        ".event-date",
        ".date",
        ".show-date",
        "time[datetime]",
        "[itemprop='startDate']",
        ".datetime",
        ".when"
      ],
      time: [
        ".event-time",
        ".time",
        ".start-time",
        ".doors-time",
        ".showtime"
      ],
      venue: [
        ".venue-name",
        ".location",
        ".venue",
        "[itemprop='location']"
      ],
      address: [
        ".venue-address",
        ".address",
        "[itemprop='address']"
      ],
      price: [
        ".price",
        ".ticket-price",
        ".cost",
        "[itemprop='price']",
        ".admission"
      ],
      artists: [
        ".performers",
        ".artists",
        ".lineup",
        ".performer",
        ".artist",
        "[itemprop='performer']",
        ".acts"
      ],
      genres: [
        ".genre",
        ".category",
        ".music-genre",
        ".style",
        ".tag"
      ],
      ticketsUrl: [
        "a[href*='ticket']",
        "a[href*='buy']",
        ".ticket-link",
        ".buy-tickets",
        ".purchase"
      ],
      images: [
        ".event-image img",
        ".poster img",
        ".show-image img",
        "[itemprop='image']",
        ".hero-image img"
      ]
    };
    
    const finalConfig = { ...defaultConfig, ...customConfig };
    
    super(baseUrl, sourceName, eventUrls, finalConfig);
    
    this.venueName = venueName;
  }
  
  get upstreamMeta() {
    return {
      ...super.upstreamMeta,
      name: `${this.venueName} Website`,
      description: `HTML scraper for ${this.venueName} website`,
    };
  }
}

/**
 * Example: Blue Note NYC
 */
export const blueNoteNYCScraper: ScraperPlugin = new VenueWebsiteScraper(
  "Blue Note NYC",
  "https://bluenotejazz.com",
  [
    "https://bluenotejazz.com/events",
    "https://bluenotejazz.com/calendar"
  ]
);

/**
 * Example: The Troubadour Los Angeles
 */
export const troubadourLAScraper: ScraperPlugin = new VenueWebsiteScraper(
  "The Troubadour",
  "https://troubadour.com",
  ["https://troubadour.com/events"],
  {
    // Custom selectors specific to this venue's website
    title: [".show-title", "h1.event-name"],
    date: [".show-date", ".event-date-time"],
    price: [".ticket-prices", ".price-range"],
  }
);

/**
 * Example: Concertgebouw Amsterdam
 */
export const concertgebouwScraper: ScraperPlugin = new VenueWebsiteScraper(
  "Concertgebouw Amsterdam",
  "https://concertgebouw.nl",
  ["https://concertgebouw.nl/en/concerts"],
  {
    // European date formats might need special handling
    date: [".concert-date", ".performance-date"],
    artists: [".artists", ".performers", ".soloist"],
    genres: [".genre", ".concert-type"]
  }
);

/**
 * Example: The Roundhouse London
 */
export const roundhouseLondonScraper: ScraperPlugin = new VenueWebsiteScraper(
  "The Roundhouse",
  "https://roundhouse.org.uk",
  ["https://roundhouse.org.uk/whats-on"],
  {
    title: [".event-title", "h1", ".show-name"],
    date: [".event-date", ".show-date"],
    price: [".price-from", ".ticket-price"],
    genres: [".event-category", ".genre-tag"]
  }
);

export default VenueWebsiteScraper;