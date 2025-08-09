/**
 * Text processing and normalization utilities
 */
/**
 * Clean and normalize text by removing extra whitespace, special characters, etc.
 */
export declare function normalizeText(text: string): string;
/**
 * Extract price information from text
 * Handles formats like: "$15", "€20-30", "Free", "£25.50", "10-15 EUR"
 */
export declare function extractPrice(text: string): {
    min: number | null;
    max: number | null;
    currency: string | null;
};
/**
 * Extract artists from various text formats
 * Handles: "Artist A, Artist B & Artist C", "Artist A featuring Artist B", etc.
 */
export declare function extractArtists(text: string): string[];
/**
 * Extract venue information from address-like text
 */
export declare function parseAddress(addressText: string): {
    address: string;
    city: string | null;
    country: string | null;
};
/**
 * Clean venue names by removing common prefixes/suffixes
 */
export declare function normalizeVenueName(name: string): string;
/**
 * Extract genre information from text
 * Maps common genre variations to standard genres
 */
export declare function extractGenres(text: string): string[];
/**
 * Calculate text similarity using Jaro-Winkler algorithm (simplified version)
 * Returns a value between 0 and 1, where 1 is identical
 */
export declare function textSimilarity(str1: string, str2: string): number;
//# sourceMappingURL=text-utils.d.ts.map