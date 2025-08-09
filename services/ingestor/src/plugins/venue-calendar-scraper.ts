import type { ScraperPlugin } from "@gigateer/contracts";
import { RSSiCalScraper } from "./rss-ical-scraper";

/**
 * Generic venue calendar scraper for iCal feeds
 * Many venues provide iCal feeds for their event calendars
 */
export class VenueCalendarScraper extends RSSiCalScraper {
  private venueName: string;
  
  constructor(venueName: string, icalUrl: string) {
    const sourceName = `${venueName.toLowerCase().replace(/\s+/g, '-')}-calendar`;
    
    super(icalUrl, sourceName);
    
    this.venueName = venueName;
  }
  
  get upstreamMeta() {
    return {
      ...super.upstreamMeta,
      name: `${this.venueName} Calendar`,
      rateLimitPerMin: 20,
      description: `iCal calendar feed for ${this.venueName}`,
    };
  }
}

/**
 * Example: The Fillmore San Francisco
 * Note: This is a hypothetical URL - venues may or may not provide public iCal feeds
 */
export const fillmoreSFCalendarScraper: ScraperPlugin = new VenueCalendarScraper(
  "The Fillmore San Francisco",
  "https://thefillmore.com/events/calendar.ics"
);

/**
 * Example: Apollo Theater
 */
export const apolloTheaterCalendarScraper: ScraperPlugin = new VenueCalendarScraper(
  "Apollo Theater",
  "https://apollotheater.org/calendar.ics"
);

/**
 * Example: Paradiso Amsterdam
 */
export const paradisoCalendarScraper: ScraperPlugin = new VenueCalendarScraper(
  "Paradiso Amsterdam",
  "https://paradiso.nl/events.ics"
);

export default VenueCalendarScraper;