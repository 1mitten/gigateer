/**
 * RSS, iCal, and JSON feed parsing utilities
 */
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
    [key: string]: any;
}
/**
 * RSS feed parser
 */
export declare class RSSParser {
    /**
     * Parse RSS feed from XML string
     */
    static parseXML(xmlContent: string, source: string): FeedItem[];
    private static parseRSSItem;
}
/**
 * iCal (ICS) feed parser
 */
export declare class ICalParser {
    /**
     * Parse iCal feed from ICS string
     */
    static parseICS(icsContent: string, source: string): FeedItem[];
    private static extractEvents;
    private static parseICalEvent;
    private static parseICalProperties;
    private static unescapeICalValue;
    private static parseICalDateTime;
}
/**
 * JSON feed parser (e.g., JSON Feed format, event APIs)
 */
export declare class JSONFeedParser {
    /**
     * Parse JSON feed
     */
    static parseJSON(jsonContent: string, source: string): FeedItem[];
    private static parseJSONFeedFormat;
    private static parseGenericEventArray;
}
/**
 * Unified feed fetcher and parser
 */
export declare class FeedParser {
    /**
     * Fetch and parse a feed from URL
     */
    static fetchAndParse(url: string, source: string): Promise<FeedItem[]>;
    /**
     * Parse content based on content type
     */
    static parseContent(content: string, contentType: string, source: string): FeedItem[];
}
//# sourceMappingURL=feed-parser.d.ts.map