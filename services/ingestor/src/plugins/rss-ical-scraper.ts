import type { Gig, ScraperPlugin } from "@gigateer/contracts";
import { createGigId, createGigHash, validateGig } from "@gigateer/contracts";
import { 
  FeedParser, 
  FeedItem, 
  parseAddress, 
  extractPrice, 
  extractArtists,
  extractGenres,
  ScraperError,
  ParseError 
} from "@gigateer/scraper";

/**
 * RSS/iCal scraper plugin that handles event feeds
 * Supports RSS, iCal, and JSON feed formats
 */
export class RSSiCalScraper implements ScraperPlugin {
  private feedUrl: string;
  private sourceName: string;

  constructor(feedUrl: string, sourceName: string) {
    this.feedUrl = feedUrl;
    this.sourceName = sourceName;
  }

  get upstreamMeta() {
    return {
      name: this.sourceName,
      rateLimitPerMin: 10, // Conservative rate limiting for feed sources
      defaultSchedule: "0 */4 * * *", // Every 4 hours (feeds don't change as frequently)
      description: `RSS/iCal feed scraper for ${this.sourceName}`,
      baseUrl: this.feedUrl,
    };
  }

  async fetchRaw(): Promise<unknown[]> {
    try {
      console.log(`Fetching feed from ${this.feedUrl}`);
      
      const feedItems = await FeedParser.fetchAndParse(this.feedUrl, this.sourceName);
      
      console.log(`Successfully fetched ${feedItems.length} items from ${this.sourceName}`);
      return feedItems;
      
    } catch (error) {
      console.error(`Failed to fetch feed from ${this.sourceName}:`, error);
      throw new ScraperError(
        `Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sourceName,
        error instanceof Error ? error : undefined
      );
    }
  }

  async normalize(rawData: unknown[]): Promise<Gig[]> {
    const gigs: Gig[] = [];
    const now = new Date().toISOString();
    
    console.log(`Normalizing ${rawData.length} feed items from ${this.sourceName}`);
    
    for (const rawItem of rawData) {
      try {
        const feedItem = rawItem as FeedItem;
        
        // Skip items without required fields
        if (!feedItem.title || !feedItem.dateStart) {
          console.warn(`Skipping item missing required fields:`, feedItem);
          continue;
        }
        
        // Extract and parse venue information
        const venueInfo = this.extractVenueInfo(feedItem);
        
        // Extract artists from title and description
        const artists = this.extractArtistsFromFeedItem(feedItem);
        
        // Extract genre information
        const genres = this.extractGenresFromFeedItem(feedItem);
        
        // Extract price information
        const price = this.extractPriceFromFeedItem(feedItem);
        
        // Create base gig object
        const gigData: Partial<Gig> = {
          source: this.sourceName,
          sourceId: feedItem.link || undefined,
          title: feedItem.title,
          artists,
          genre: genres,
          dateStart: feedItem.dateStart,
          dateEnd: feedItem.dateEnd || undefined,
          venue: venueInfo,
          price,
          status: "scheduled",
          ticketsUrl: feedItem.link || undefined,
          eventUrl: feedItem.link || undefined,
          images: [],
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
        console.error(`Failed to normalize feed item from ${this.sourceName}:`, error, rawItem);
        // Continue processing other items even if one fails
      }
    }
    
    console.log(`Successfully normalized ${gigs.length}/${rawData.length} items from ${this.sourceName}`);
    return gigs;
  }

  private extractVenueInfo(feedItem: FeedItem): Gig['venue'] {
    let venueName = "";
    let address = "";
    let city: string | undefined;
    let country: string | undefined;
    
    // Try to extract venue from location field
    if (feedItem.location) {
      const parsedAddress = parseAddress(feedItem.location);
      
      // If location looks like an address, use the first part as venue name
      if (parsedAddress.address.includes(",") || parsedAddress.city || parsedAddress.country) {
        venueName = parsedAddress.address.split(",")[0].trim();
        address = feedItem.location;
        city = parsedAddress.city || undefined;
        country = parsedAddress.country || undefined;
      } else {
        // Location is probably just a venue name
        venueName = feedItem.location;
      }
    }
    
    // Try to extract venue from title if not found
    if (!venueName) {
      // Look for patterns like "Event @ Venue" or "Event at Venue"
      const atMatch = feedItem.title.match(/(.+?)\s+[@at]\s+(.+)/i);
      if (atMatch) {
        venueName = atMatch[2].trim();
      }
    }
    
    // Try to extract venue from description
    if (!venueName && feedItem.description) {
      const locationKeywords = ['venue:', 'location:', 'at:', 'where:'];
      for (const keyword of locationKeywords) {
        const regex = new RegExp(`${keyword}\\s*(.+?)(?:[\\n\\.]|$)`, 'i');
        const match = feedItem.description.match(regex);
        if (match) {
          venueName = match[1].trim();
          break;
        }
      }
    }
    
    // Fallback to a generic venue name
    if (!venueName) {
      venueName = "TBD";
    }
    
    return {
      name: venueName,
      address: address || undefined,
      city,
      country,
    };
  }

  private extractArtistsFromFeedItem(feedItem: FeedItem): string[] {
    const allText = [feedItem.title, feedItem.description].filter(Boolean).join(" ");
    
    // Remove common venue indicators from title for artist extraction
    let titleForArtists = feedItem.title;
    const atMatch = feedItem.title.match(/(.+?)\s+[@at]\s+(.+)/i);
    if (atMatch) {
      titleForArtists = atMatch[1].trim();
    }
    
    const artists = extractArtists(titleForArtists);
    
    // If no artists found in title, try description
    if (artists.length === 0 && feedItem.description) {
      return extractArtists(feedItem.description);
    }
    
    return artists;
  }

  private extractGenresFromFeedItem(feedItem: FeedItem): string[] {
    const genres = new Set<string>();
    
    // Extract from categories
    if (feedItem.categories) {
      for (const category of feedItem.categories) {
        const extractedGenres = extractGenres(category);
        extractedGenres.forEach(genre => genres.add(genre));
      }
    }
    
    // Extract from title and description
    const allText = [feedItem.title, feedItem.description].filter(Boolean).join(" ");
    const extractedGenres = extractGenres(allText);
    extractedGenres.forEach(genre => genres.add(genre));
    
    return Array.from(genres);
  }

  private extractPriceFromFeedItem(feedItem: FeedItem): Gig['price'] | undefined {
    const allText = [feedItem.title, feedItem.description].filter(Boolean).join(" ");
    const priceInfo = extractPrice(allText);
    
    if (priceInfo.min !== null || priceInfo.max !== null) {
      return {
        min: priceInfo.min,
        max: priceInfo.max,
        currency: priceInfo.currency,
      };
    }
    
    return undefined;
  }
}

/**
 * Factory function to create RSS/iCal scrapers for common event feeds
 */
export function createFeedScraper(feedUrl: string, sourceName: string): RSSiCalScraper {
  return new RSSiCalScraper(feedUrl, sourceName);
}

/**
 * Example RSS scraper for a hypothetical events feed
 */
export const exampleRSSScraper: ScraperPlugin = new RSSiCalScraper(
  "https://example.com/events.rss",
  "example-rss-events"
);

/**
 * Example iCal scraper for a hypothetical venue calendar
 */
export const exampleiCalScraper: ScraperPlugin = new RSSiCalScraper(
  "https://example-venue.com/calendar.ics", 
  "example-venue-ical"
);

export default RSSiCalScraper;