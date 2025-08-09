import type { ScraperPlugin } from "@gigateer/contracts";
import { HTMLPlaywrightScraper } from "./html-playwright-scraper";

/**
 * Eventbrite scraper for music events in specific cities
 * Scrapes Eventbrite's search results for music events
 */
export class EventbriteScraper extends HTMLPlaywrightScraper {
  private city: string;
  
  constructor(city: string, categories: string[] = ["music"]) {
    const encodedCity = encodeURIComponent(city);
    const encodedCategories = categories.map(c => encodeURIComponent(c)).join(",");
    
    const baseUrl = "https://eventbrite.com";
    const searchUrl = `https://eventbrite.com/d/${encodedCity}/music--events/`;
    const sourceName = `eventbrite-${city.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Eventbrite-specific selectors
    const eventbriteConfig = {
      title: [
        "[data-event-title]",
        ".event-title",
        ".event-card__title",
        "h3 a",
        ".title-link"
      ],
      date: [
        "[data-event-date]",
        ".event-card__date",
        ".date-display",
        ".event-date",
        "time"
      ],
      venue: [
        "[data-event-location]",
        ".event-card__location",
        ".venue-name",
        ".location-info"
      ],
      price: [
        "[data-event-price]",
        ".event-card__price",
        ".ticket-price",
        ".price-display"
      ],
      eventUrl: [
        ".event-card a[href]",
        ".title-link",
        "[data-event-url]"
      ],
      images: [
        ".event-card__image img",
        ".event-image img",
        ".card-image img"
      ]
    };
    
    super(baseUrl, sourceName, [searchUrl], eventbriteConfig);
    
    this.city = city;
  }
  
  get upstreamMeta() {
    return {
      ...super.upstreamMeta,
      name: `Eventbrite ${this.city}`,
      rateLimitPerMin: 12, // Conservative for Eventbrite
      description: `Eventbrite music events scraper for ${this.city}`,
    };
  }
}

/**
 * Example instances for major cities
 */
export const eventbriteNYScraper: ScraperPlugin = new EventbriteScraper("New York");
export const eventbriteLAScraper: ScraperPlugin = new EventbriteScraper("Los Angeles");
export const eventbriteChicagoScraper: ScraperPlugin = new EventbriteScraper("Chicago");
export const eventbriteLondonScraper: ScraperPlugin = new EventbriteScraper("London");
export const eventbriteAmsterdamScraper: ScraperPlugin = new EventbriteScraper("Amsterdam");

export default EventbriteScraper;