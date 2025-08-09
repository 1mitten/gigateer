/**
 * RSS, iCal, and JSON feed parsing utilities
 */

import { ParseError, NetworkError } from "./errors";
import { parseDate, combineDateAndTime } from "./date-utils";
import { normalizeText, extractPrice, extractArtists, parseAddress } from "./text-utils";

/**
 * Generic feed item interface
 */
export interface FeedItem {
  title: string;
  description?: string;
  link?: string;
  dateStart: string;
  dateEnd?: string;
  location?: string;
  categories?: string[];
  [key: string]: any; // Allow additional properties
}

/**
 * RSS feed parser
 */
export class RSSParser {
  /**
   * Parse RSS feed from XML string
   */
  static parseXML(xmlContent: string, source: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      // Simple regex-based XML parsing (for production, consider using xml2js)
      const itemMatches = xmlContent.match(/<item[^>]*>([\s\S]*?)<\/item>/gi);
      
      if (!itemMatches) {
        throw new ParseError(source, "No RSS items found in feed");
      }
      
      for (const itemXml of itemMatches) {
        const item = this.parseRSSItem(itemXml, source);
        if (item) items.push(item);
      }
      
    } catch (error) {
      throw new ParseError(source, "Failed to parse RSS XML", error as Error);
    }
    
    return items;
  }

  private static parseRSSItem(itemXml: string, source: string): FeedItem | null {
    try {
      const getTagContent = (tag: string): string => {
        const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return match ? match[1].trim() : "";
      };

      const title = getTagContent("title");
      const description = getTagContent("description");
      const link = getTagContent("link");
      const pubDate = getTagContent("pubDate") || getTagContent("dc:date");
      const location = getTagContent("location") || getTagContent("geo:lat");
      
      // Extract categories
      const categoryMatches = itemXml.match(/<category[^>]*>([^<]*)<\/category>/gi);
      const categories = categoryMatches?.map(match => 
        match.replace(/<[^>]*>/g, "").trim()
      ) || [];

      if (!title || !pubDate) {
        return null;
      }

      return {
        title: normalizeText(title),
        description: description ? normalizeText(description) : undefined,
        link: link || undefined,
        dateStart: parseDate(pubDate, source),
        location: location ? normalizeText(location) : undefined,
        categories,
      };
      
    } catch (error) {
      console.warn(`Failed to parse RSS item from ${source}:`, error);
      return null;
    }
  }
}

/**
 * iCal (ICS) feed parser
 */
export class ICalParser {
  /**
   * Parse iCal feed from ICS string
   */
  static parseICS(icsContent: string, source: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      const events = this.extractEvents(icsContent);
      
      for (const event of events) {
        const item = this.parseICalEvent(event, source);
        if (item) items.push(item);
      }
      
    } catch (error) {
      throw new ParseError(source, "Failed to parse iCal ICS", error as Error);
    }
    
    return items;
  }

  private static extractEvents(icsContent: string): string[] {
    const events: string[] = [];
    const lines = icsContent.split(/\r?\n/);
    let currentEvent: string[] = [];
    let inEvent = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === "BEGIN:VEVENT") {
        inEvent = true;
        currentEvent = [trimmed];
      } else if (trimmed === "END:VEVENT") {
        currentEvent.push(trimmed);
        events.push(currentEvent.join("\n"));
        currentEvent = [];
        inEvent = false;
      } else if (inEvent) {
        currentEvent.push(line); // Keep original formatting for iCal parsing
      }
    }
    
    return events;
  }

  private static parseICalEvent(eventText: string, source: string): FeedItem | null {
    try {
      const properties = this.parseICalProperties(eventText);
      
      const title = properties.SUMMARY;
      const description = properties.DESCRIPTION;
      const dtStart = properties.DTSTART;
      const dtEnd = properties.DTEND;
      const location = properties.LOCATION;
      const categories = properties.CATEGORIES?.split(",") || [];
      const url = properties.URL;

      if (!title || !dtStart) {
        return null;
      }

      return {
        title: normalizeText(title),
        description: description ? normalizeText(description) : undefined,
        link: url || undefined,
        dateStart: this.parseICalDateTime(dtStart, source),
        dateEnd: dtEnd ? this.parseICalDateTime(dtEnd, source) : undefined,
        location: location ? normalizeText(location) : undefined,
        categories: categories.map(cat => cat.trim()).filter(Boolean),
      };
      
    } catch (error) {
      console.warn(`Failed to parse iCal event from ${source}:`, error);
      return null;
    }
  }

  private static parseICalProperties(eventText: string): Record<string, string> {
    const properties: Record<string, string> = {};
    const lines = eventText.split(/\r?\n/);
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Handle line continuations (lines starting with space or tab)
      while (i + 1 < lines.length && /^\s/.test(lines[i + 1])) {
        line += lines[i + 1].substring(1);
        i++;
      }
      
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        let key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Remove parameters from key (e.g., "DTSTART;TZID=..." -> "DTSTART")
        key = key.split(";")[0];
        
        properties[key] = this.unescapeICalValue(value);
      }
    }
    
    return properties;
  }

  private static unescapeICalValue(value: string): string {
    return value
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }

  private static parseICalDateTime(dtString: string, source: string): string {
    // Handle various iCal date formats
    // YYYYMMDD
    if (/^\d{8}$/.test(dtString)) {
      const year = dtString.substring(0, 4);
      const month = dtString.substring(4, 6);
      const day = dtString.substring(6, 8);
      return parseDate(`${year}-${month}-${day}`, source);
    }
    
    // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    if (/^\d{8}T\d{6}Z?$/.test(dtString)) {
      const year = dtString.substring(0, 4);
      const month = dtString.substring(4, 6);
      const day = dtString.substring(6, 8);
      const hour = dtString.substring(9, 11);
      const minute = dtString.substring(11, 13);
      const second = dtString.substring(13, 15);
      const isUTC = dtString.endsWith("Z");
      
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${isUTC ? "Z" : ""}`;
      return parseDate(isoString, source);
    }
    
    // Fallback to regular date parsing
    return parseDate(dtString, source);
  }
}

/**
 * JSON feed parser (e.g., JSON Feed format, event APIs)
 */
export class JSONFeedParser {
  /**
   * Parse JSON feed
   */
  static parseJSON(jsonContent: string, source: string): FeedItem[] {
    try {
      const data = JSON.parse(jsonContent);
      
      // Handle JSON Feed format (jsonfeed.org)
      if (data.version && data.items) {
        return this.parseJSONFeedFormat(data, source);
      }
      
      // Handle generic array of events
      if (Array.isArray(data)) {
        return this.parseGenericEventArray(data, source);
      }
      
      // Handle object with events property
      if (data.events && Array.isArray(data.events)) {
        return this.parseGenericEventArray(data.events, source);
      }
      
      throw new ParseError(source, "Unrecognized JSON feed format");
      
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(source, "Failed to parse JSON feed", error as Error);
    }
  }

  private static parseJSONFeedFormat(feed: any, source: string): FeedItem[] {
    return feed.items.map((item: any) => ({
      title: normalizeText(item.title || item.summary || ""),
      description: item.content_text || item.content_html || undefined,
      link: item.url || item.external_url || undefined,
      dateStart: parseDate(item.date_published || item.date_modified, source),
      categories: item.tags || [],
    })).filter((item: FeedItem) => item.title);
  }

  private static parseGenericEventArray(events: any[], source: string): FeedItem[] {
    return events.map(event => {
      try {
        // Try to map common event properties
        const title = event.title || event.name || event.summary || "";
        const description = event.description || event.details || undefined;
        const link = event.url || event.link || event.website || undefined;
        
        // Try various date field names
        const startDate = event.start_date || event.date_start || event.date || 
                         event.start_time || event.datetime || event.when;
        const endDate = event.end_date || event.date_end || event.end_time;
        
        const location = event.location || event.venue || event.where || undefined;
        const categories = event.categories || event.tags || event.genres || [];
        
        if (!title || !startDate) return null;
        
        return {
          title: normalizeText(title),
          description: description ? normalizeText(description) : undefined,
          link,
          dateStart: parseDate(startDate, source),
          dateEnd: endDate ? parseDate(endDate, source) : undefined,
          location: location ? normalizeText(location) : undefined,
          categories: Array.isArray(categories) ? categories : [categories].filter(Boolean),
        };
      } catch (error) {
        console.warn(`Failed to parse JSON event from ${source}:`, error);
        return null;
      }
    }).filter(Boolean) as FeedItem[];
  }
}

/**
 * Unified feed fetcher and parser
 */
export class FeedParser {
  /**
   * Fetch and parse a feed from URL
   */
  static async fetchAndParse(url: string, source: string): Promise<FeedItem[]> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Gigateer/1.0; Event Aggregator)",
          "Accept": "application/rss+xml, application/xml, text/xml, application/json, text/calendar",
        },
      });
      
      if (!response.ok) {
        throw new NetworkError(source, url, new Error(`HTTP ${response.status}`));
      }
      
      const contentType = response.headers.get("content-type") || "";
      const content = await response.text();
      
      return this.parseContent(content, contentType, source);
      
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ParseError) {
        throw error;
      }
      throw new NetworkError(source, url, error as Error);
    }
  }

  /**
   * Parse content based on content type
   */
  static parseContent(content: string, contentType: string, source: string): FeedItem[] {
    const lowerContentType = contentType.toLowerCase();
    
    if (lowerContentType.includes("json")) {
      return JSONFeedParser.parseJSON(content, source);
    }
    
    if (lowerContentType.includes("calendar") || content.includes("BEGIN:VCALENDAR")) {
      return ICalParser.parseICS(content, source);
    }
    
    if (lowerContentType.includes("xml") || content.includes("<rss") || content.includes("<feed")) {
      return RSSParser.parseXML(content, source);
    }
    
    // Try to auto-detect format
    const trimmedContent = content.trim();
    
    if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
      return JSONFeedParser.parseJSON(content, source);
    }
    
    if (trimmedContent.includes("BEGIN:VCALENDAR")) {
      return ICalParser.parseICS(content, source);
    }
    
    if (trimmedContent.startsWith("<")) {
      return RSSParser.parseXML(content, source);
    }
    
    throw new ParseError(source, "Unable to determine feed format");
  }
}