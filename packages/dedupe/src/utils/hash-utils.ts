/**
 * Hash utilities for change detection and content verification
 * Uses stable JSON serialization for consistent hashing
 */

import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { Gig } from '@gigateer/contracts';

/**
 * Fields to include in content hash for change detection
 * Excludes metadata fields that change on every update
 */
const HASH_FIELDS: (keyof Gig)[] = [
  'title',
  'artists',
  'tags',
  'dateStart',
  'dateEnd',
  'timezone',
  'venue',
  'ageRestriction',
  'status',
  'ticketsUrl',
  'eventUrl',
  'images'
];

/**
 * Create a stable hash from an object using SHA256
 * @param data Object to hash
 * @returns SHA256 hash string
 */
export function createStableHash(data: any): string {
  try {
    // Use stable stringify to ensure consistent ordering
    const stableJson = stringify(data);
    return createHash('sha256').update(stableJson, 'utf8').digest('hex');
  } catch (error) {
    console.error('Error creating hash:', error);
    return '';
  }
}

/**
 * Create content hash for a gig using only relevant fields
 * @param gig Gig object
 * @returns Content hash string
 */
export function createGigContentHash(gig: Partial<Gig>): string {
  const contentData: Partial<Gig> = {};
  
  // Only include fields that matter for content changes
  for (const field of HASH_FIELDS) {
    if (gig[field] !== undefined) {
      (contentData as any)[field] = gig[field];
    }
  }
  
  return createStableHash(contentData);
}

/**
 * Create a fuzzy match key for deduplication
 * This creates a hash of normalized, simplified data for fuzzy matching
 * @param gig Gig object
 * @returns Fuzzy match key
 */
export function createFuzzyMatchKey(gig: Partial<Gig>): string {
  const fuzzyData = {
    // Normalized title (first 50 chars to handle variations)
    title: normalizeForMatching(gig.title || '').substring(0, 50),
    // Normalized venue name
    venue: normalizeForMatching(gig.venue?.name || ''),
    // Normalized city
    city: normalizeForMatching(gig.venue?.city || ''),
    // Date rounded to nearest hour
    dateHour: roundDateToHour(gig.dateStart || ''),
    // Main artist if available
    mainArtist: extractMainArtistForMatching(gig.title || '', gig.artists || [])
  };
  
  return createStableHash(fuzzyData);
}

/**
 * Normalize text for fuzzy matching
 * @param text Input text
 * @returns Normalized text
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim();
}

/**
 * Round date to nearest hour for fuzzy matching
 * @param dateString ISO date string
 * @returns Rounded date string
 */
function roundDateToHour(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Round to nearest hour
    date.setMinutes(date.getMinutes() >= 30 ? 60 : 0, 0, 0);
    return date.toISOString();
  } catch {
    return '';
  }
}

/**
 * Extract main artist for matching purposes
 * @param title Event title
 * @param artists Artists array
 * @returns Main artist name
 */
function extractMainArtistForMatching(title: string, artists: string[]): string {
  if (artists.length > 0) {
    return normalizeForMatching(artists[0]);
  }
  
  // Try to extract from title
  const separators = [' + ', ' & ', ' and ', ' feat ', ' featuring ', ' with '];
  let mainArtist = title;
  
  for (const separator of separators) {
    const parts = title.toLowerCase().split(separator);
    if (parts.length > 1) {
      mainArtist = parts[0].trim();
      break;
    }
  }
  
  return normalizeForMatching(mainArtist);
}

/**
 * Compare two hashes for equality
 * @param hash1 First hash
 * @param hash2 Second hash
 * @returns True if hashes are equal
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2 && hash1.length > 0;
}

/**
 * Validate hash format (SHA256 hex string)
 * @param hash Hash to validate
 * @returns True if valid hash format
 */
export function isValidHash(hash: string): boolean {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Create a quick hash for basic comparison (faster but less secure)
 * @param data Data to hash
 * @returns Quick hash string
 */
export function createQuickHash(data: any): string {
  try {
    const str = typeof data === 'string' ? data : stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  } catch {
    return '0';
  }
}

/**
 * Create a composite key for unique identification
 * @param gig Gig object
 * @returns Composite key string
 */
export function createCompositeKey(gig: Partial<Gig>): string {
  const parts = [
    normalizeForMatching(gig.venue?.name || ''),
    normalizeForMatching(gig.title || ''),
    gig.dateStart || '',
    normalizeForMatching(gig.venue?.city || '')
  ];
  
  return createStableHash(parts.join('|'));
}