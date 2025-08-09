import { Gig } from "./gig";
/**
 * Creates a URL-safe slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 */
export declare function createSlug(text: string): string;
/**
 * Generates a stable ID for a gig based on venue name, title, date start, and city
 * ID strategy: slug(venue.name + title + dateStart + city)
 */
export declare function generateGigId(venueName: string, title: string, dateStart: string, city?: string): string;
/**
 * Creates a stable hash of important gig fields for change detection
 * Hash strategy: stable JSON of important fields → SHA256
 */
export declare function generateGigHash(gig: Partial<Gig>): string;
/**
 * Validates and normalizes a gig object using the GigSchema
 */
export declare function validateGig(data: unknown): Gig;
/**
 * Safely validates a gig object, returning validation errors if invalid
 */
export declare function safeValidateGig(data: unknown): {
    success: true;
    data: Gig;
} | {
    success: false;
    error: string;
};
//# sourceMappingURL=utils.d.ts.map