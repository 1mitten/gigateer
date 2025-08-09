/**
 * HTML parsing utilities using Cheerio
 */
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
export declare class HTMLParser {
    private $;
    private source;
    constructor(html: string, source: string);
    /**
     * Extract text content from selectors
     */
    extractText(selectors: string | string[]): string | null;
    /**
     * Extract attribute value from selectors
     */
    extractAttribute(selectors: string | string[], attribute: string): string | null;
    /**
     * Extract multiple text values from selectors
     */
    extractTextArray(selectors: string | string[]): string[];
    /**
     * Extract URLs from selectors (href, src attributes)
     */
    extractUrls(selectors: string | string[], baseUrl?: string): string[];
    /**
     * Extract structured data from JSON-LD
     */
    extractJsonLd(): any[];
    /**
     * Extract microdata from HTML
     */
    extractMicrodata(): any[];
    /**
     * Extract Open Graph metadata
     */
    extractOpenGraph(): Record<string, string>;
    /**
     * Extract event data using common patterns
     */
    extractEventData(config: EventExtractionConfig): HTMLEventData;
    /**
     * Try to extract structured event data from various formats
     */
    extractStructuredEventData(): HTMLEventData[];
    private parseJsonLdEvent;
    private parseMicrodataEvent;
    private parseOpenGraphEvent;
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
//# sourceMappingURL=html-parser.d.ts.map