import crypto from "crypto";
import { Gig, GigSchema } from "./gig";

/**
 * Creates a URL-safe slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a stable ID for a gig based on venue name, title, date start, and city
 * ID strategy: slug(venue.name + title + dateStart + city)
 */
export function generateGigId(
  venueName: string,
  title: string,
  dateStart: string,
  city?: string
): string {
  const parts = [venueName, title, dateStart, city || ""].filter(Boolean);
  const combined = parts.join("-");
  return createSlug(combined);
}


/**
 * Creates a stable hash of important gig fields for change detection
 * Hash strategy: stable JSON of important fields → SHA256
 */
export function generateGigHash(gig: Partial<Gig>): string {
  // Extract only the important fields for hashing
  const hashableFields = {
    title: gig.title,
    artists: gig.artists,
    genre: gig.genre,
    dateStart: gig.dateStart,
    dateEnd: gig.dateEnd,
    venue: gig.venue,
    price: gig.price,
    ageRestriction: gig.ageRestriction,
    status: gig.status,
    ticketsUrl: gig.ticketsUrl,
    eventUrl: gig.eventUrl,
  };

  // Create stable JSON (sorted keys)
  const stableJson = JSON.stringify(hashableFields, Object.keys(hashableFields).sort());
  
  // Generate SHA256 hash
  return crypto.createHash("sha256").update(stableJson).digest("hex");
}


/**
 * Validates and normalizes a gig object using the GigSchema
 */
export function validateGig(data: unknown): Gig {
  return GigSchema.parse(data);
}

/**
 * Safely validates a gig object, returning validation errors if invalid
 */
export function safeValidateGig(data: unknown): { success: true; data: Gig } | { success: false; error: string } {
  const result = GigSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.message };
  }
}