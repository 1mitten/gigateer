/**
 * HTML parsing utilities using Cheerio
 */

import * as cheerio from "cheerio";
import { ParseError } from "./errors";
import { parseDate, combineDateAndTime, extractTimezone } from "./date-utils";
import { normalizeText, extractPrice, extractArtists, parseAddress, extractGenres } from "./text-utils";

/**
 * Generic HTML event data structure
 */
export interface HTMLEventData {
  title?: string;
  description?: string;
  artists?: string[];
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
  venue?: string;
  address?: string;
  price?: string;
  genres?: string[];
  ticketsUrl?: string;
  eventUrl?: string;
  imageUrls?: string[];
  [key: string]: any;
}

/**
 * HTML parser with common extraction methods
 */
export class HTMLParser {
  private $: cheerio.CheerioAPI;
  private source: string;

  constructor(html: string, source: string) {
    this.$ = cheerio.load(html);
    this.source = source;
  }

  /**
   * Extract text content from selectors
   */
  extractText(selectors: string | string[]): string | null {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorArray) {
      const element = this.$(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text) return normalizeText(text);
      }
    }
    
    return null;
  }

  /**
   * Extract attribute value from selectors
   */
  extractAttribute(selectors: string | string[], attribute: string): string | null {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorArray) {
      const element = this.$(selector).first();
      if (element.length) {
        const value = element.attr(attribute);
        if (value) return value.trim();
      }
    }
    
    return null;
  }

  /**
   * Extract multiple text values from selectors
   */
  extractTextArray(selectors: string | string[]): string[] {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const results: string[] = [];
    
    for (const selector of selectorArray) {
      this.$(selector).each((_, element) => {
        const text = this.$(element).text().trim();
        if (text) results.push(normalizeText(text));
      });
    }
    
    return [...new Set(results)]; // Remove duplicates
  }

  /**
   * Extract URLs from selectors (href, src attributes)
   */
  extractUrls(selectors: string | string[], baseUrl?: string): string[] {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const urls: string[] = [];
    
    for (const selector of selectorArray) {
      this.$(selector).each((_, element) => {
        const href = this.$(element).attr("href");
        const src = this.$(element).attr("src");
        
        const url = href || src;
        if (url) {
          try {
            const fullUrl = baseUrl ? new URL(url, baseUrl).toString() : url;
            urls.push(fullUrl);
          } catch {
            // Invalid URL, skip
          }
        }
      });
    }
    
    return [...new Set(urls)];
  }

  /**
   * Extract structured data from JSON-LD
   */
  extractJsonLd(): any[] {
    const jsonLdElements = this.$('script[type="application/ld+json"]');
    const results: any[] = [];
    
    jsonLdElements.each((_, element) => {
      try {
        const content = this.$(element).html();
        if (content) {
          const data = JSON.parse(content);
          results.push(data);
        }
      } catch {
        // Invalid JSON, skip
      }
    });
    
    return results;
  }

  /**
   * Extract microdata from HTML
   */
  extractMicrodata(): any[] {
    const items: any[] = [];
    
    this.$('[itemscope]').each((_, element) => {
      const item: any = {};
      const $item = this.$(element);
      
      // Get itemtype
      const itemType = $item.attr('itemtype');
      if (itemType) item['@type'] = itemType;
      
      // Extract properties
      $item.find('[itemprop]').each((_, propElement) => {
        const $prop = this.$(propElement);
        const propName = $prop.attr('itemprop');
        
        if (propName) {
          let value: string | undefined;
          
          if ($prop.attr('content')) {
            value = $prop.attr('content');
          } else if ($prop.attr('datetime')) {
            value = $prop.attr('datetime');
          } else if ($prop.attr('href')) {
            value = $prop.attr('href');
          } else if ($prop.attr('src')) {
            value = $prop.attr('src');
          } else {
            value = $prop.text().trim();
          }
          
          if (value) {
            item[propName] = value;
          }
        }
      });
      
      if (Object.keys(item).length > 0) {
        items.push(item);
      }
    });
    
    return items;
  }

  /**
   * Extract Open Graph metadata
   */
  extractOpenGraph(): Record<string, string> {
    const og: Record<string, string> = {};
    
    this.$('meta[property^="og:"]').each((_, element) => {
      const property = this.$(element).attr('property');
      const content = this.$(element).attr('content');
      
      if (property && content) {
        const key = property.replace('og:', '');
        og[key] = content;
      }
    });
    
    return og;
  }

  /**
   * Extract event data using common patterns
   */
  extractEventData(config: EventExtractionConfig): HTMLEventData {
    const data: HTMLEventData = {};
    
    // Extract basic information
    data.title = this.extractText(config.title || [
      'h1',
      '.event-title',
      '.title',
      '[itemprop="name"]',
      '.event-name'
    ]) || undefined;
    
    data.description = this.extractText(config.description || [
      '.description',
      '.event-description',
      '[itemprop="description"]',
      '.summary',
      '.about'
    ]) || undefined;
    
    // Extract venue information
    data.venue = this.extractText(config.venue || [
      '.venue',
      '.location',
      '[itemprop="location"]',
      '.venue-name',
      '.place'
    ]) || undefined;
    
    data.address = this.extractText(config.address || [
      '.address',
      '.venue-address',
      '[itemprop="address"]',
      '.location-address'
    ]) || undefined;
    
    // Extract date/time information
    const dateText = this.extractText(config.date || [
      '.date',
      '.event-date',
      '[itemprop="startDate"]',
      '.start-date',
      'time[datetime]'
    ]);
    
    const timeText = this.extractText(config.time || [
      '.time',
      '.event-time',
      '.start-time',
      '.doors'
    ]);
    
    // Try to extract datetime from attributes
    const dateTimeAttr = this.extractAttribute([
      'time[datetime]',
      '[datetime]',
      '[data-date]',
      '[data-datetime]'
    ], 'datetime') || this.extractAttribute([
      '[data-date]',
      '[data-datetime]'
    ], 'data-date') || this.extractAttribute([
      '[data-datetime]'
    ], 'data-datetime');
    
    if (dateTimeAttr) {
      try {
        data.dateStart = parseDate(dateTimeAttr, this.source);
      } catch {
        // Fall back to text extraction
      }
    }
    
    if (!data.dateStart && dateText) {
      if (timeText) {
        try {
          data.dateStart = combineDateAndTime(dateText, timeText, this.source);
        } catch {
          try {
            data.dateStart = parseDate(dateText, this.source);
          } catch {
            // Unable to parse date
          }
        }
      } else {
        try {
          data.dateStart = parseDate(dateText, this.source);
        } catch {
          // Unable to parse date
        }
      }
    }
    
    // Extract price information
    const priceText = this.extractText(config.price || [
      '.price',
      '.cost',
      '.ticket-price',
      '[itemprop="price"]',
      '.fee'
    ]);
    
    if (priceText) {
      data.price = priceText;
    }
    
    // Extract artists/performers
    const artistsText = this.extractTextArray(config.artists || [
      '.artists',
      '.performers',
      '.artist',
      '.performer',
      '[itemprop="performer"]'
    ]);
    
    if (artistsText.length > 0) {
      data.artists = artistsText.flatMap(text => extractArtists(text));
    }
    
    // Extract genres
    const genresText = this.extractTextArray(config.genres || [
      '.genre',
      '.category',
      '.tag',
      '[itemprop="genre"]',
      '.music-genre'
    ]);
    
    if (genresText.length > 0) {
      data.genres = genresText.flatMap(text => extractGenres(text));
    }
    
    // Extract URLs
    data.ticketsUrl = this.extractAttribute(config.ticketsUrl || [
      'a[href*="ticket"]',
      'a[href*="buy"]', 
      '.ticket-link',
      '.buy-tickets'
    ], 'href') || undefined;
    
    data.eventUrl = this.extractAttribute(config.eventUrl || [
      'link[rel="canonical"]',
      'meta[property="og:url"]'
    ], 'href') || this.extractAttribute(['meta[property="og:url"]'], 'content') || undefined;
    
    // Extract images
    data.imageUrls = this.extractUrls(config.images || [
      '.event-image img',
      '.poster img', 
      'img[itemprop="image"]',
      'meta[property="og:image"]'
    ]);
    
    return data;
  }

  /**
   * Try to extract structured event data from various formats
   */
  extractStructuredEventData(): HTMLEventData[] {
    const events: HTMLEventData[] = [];
    
    // Try JSON-LD first
    const jsonLdData = this.extractJsonLd();
    for (const data of jsonLdData) {
      const event = this.parseJsonLdEvent(data);
      if (event) events.push(event);
    }
    
    // Try microdata
    const microdataItems = this.extractMicrodata();
    for (const item of microdataItems) {
      const event = this.parseMicrodataEvent(item);
      if (event) events.push(event);
    }
    
    // Try Open Graph
    const ogData = this.extractOpenGraph();
    const ogEvent = this.parseOpenGraphEvent(ogData);
    if (ogEvent) events.push(ogEvent);
    
    return events;
  }

  private parseJsonLdEvent(data: any): HTMLEventData | null {
    if (data['@type'] !== 'Event' && !data.name) return null;
    
    const event: HTMLEventData = {};
    
    event.title = data.name;
    event.description = data.description;
    
    if (data.startDate) {
      try {
        event.dateStart = parseDate(data.startDate, this.source);
      } catch {
        // Unable to parse date
      }
    }
    
    if (data.endDate) {
      try {
        event.dateEnd = parseDate(data.endDate, this.source);
      } catch {
        // Unable to parse date
      }
    }
    
    if (data.location) {
      if (typeof data.location === 'string') {
        event.venue = data.location;
      } else if (data.location.name) {
        event.venue = data.location.name;
        if (data.location.address) {
          event.address = typeof data.location.address === 'string' 
            ? data.location.address 
            : data.location.address.streetAddress || data.location.address.name;
        }
      }
    }
    
    if (data.offers && data.offers.price) {
      event.price = `${data.offers.price} ${data.offers.priceCurrency || ''}`.trim();
    }
    
    if (data.performer) {
      const performers = Array.isArray(data.performer) ? data.performer : [data.performer];
      event.artists = performers.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
    }
    
    if (data.url) {
      event.eventUrl = data.url;
    }
    
    if (data.image) {
      const images = Array.isArray(data.image) ? data.image : [data.image];
      event.imageUrls = images.filter((img: any) => typeof img === 'string');
    }
    
    return event;
  }

  private parseMicrodataEvent(item: any): HTMLEventData | null {
    if (!item.name) return null;
    
    const event: HTMLEventData = {};
    
    event.title = item.name;
    event.description = item.description;
    
    if (item.startDate) {
      try {
        event.dateStart = parseDate(item.startDate, this.source);
      } catch {
        // Unable to parse date
      }
    }
    
    if (item.location) {
      event.venue = item.location;
    }
    
    if (item.address) {
      event.address = item.address;
    }
    
    return event;
  }

  private parseOpenGraphEvent(og: Record<string, string>): HTMLEventData | null {
    if (!og.title) return null;
    
    const event: HTMLEventData = {};
    
    event.title = og.title;
    event.description = og.description;
    event.eventUrl = og.url;
    
    if (og.image) {
      event.imageUrls = [og.image];
    }
    
    return event;
  }
}

/**
 * Configuration for event extraction
 */
export interface EventExtractionConfig {
  title?: string[];
  description?: string[];
  venue?: string[];
  address?: string[];
  date?: string[];
  time?: string[];
  price?: string[];
  artists?: string[];
  genres?: string[];
  ticketsUrl?: string[];
  eventUrl?: string[];
  images?: string[];
}