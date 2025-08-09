/**
 * Trust score system for source prioritization and merge decisions
 * Higher scores indicate more reliable/authoritative sources
 */

import { Gig } from '@gigateer/contracts';

/**
 * Source trust scores (0-100)
 * Official venue sources get higher scores than aggregators
 */
export const DEFAULT_TRUST_SCORES: Record<string, number> = {
  // Official venue sources (highest priority)
  'venue-official': 100,
  'venue-direct': 95,
  
  // Primary ticketing platforms
  'ticketmaster': 90,
  'eventbrite': 85,
  'stubhub': 80,
  
  // Music-specific aggregators
  'songkick': 75,
  'bandsintown': 70,
  'setlist-fm': 65,
  
  // General event aggregators
  'facebook-events': 60,
  'meetup': 55,
  'eventful': 50,
  
  // Scraper sources (lower priority)
  'web-scraper': 40,
  'rss-feed': 45,
  
  // Unknown sources (lowest priority)
  'unknown': 30
};

/**
 * Calculate trust score for a source
 * @param source Source name
 * @param customScores Custom score overrides
 * @returns Trust score (0-100)
 */
export function getTrustScore(
  source: string,
  customScores: Record<string, number> = {}
): number {
  // Check custom scores first
  if (customScores[source] !== undefined) {
    return Math.max(0, Math.min(100, customScores[source]));
  }
  
  // Check default scores
  if (DEFAULT_TRUST_SCORES[source] !== undefined) {
    return DEFAULT_TRUST_SCORES[source];
  }
  
  // Pattern-based scoring for unknown sources
  const lowerSource = source.toLowerCase();
  
  // Official/direct sources
  if (lowerSource.includes('official') || lowerSource.includes('direct')) {
    return 90;
  }
  
  // Venue websites
  if (lowerSource.includes('venue') || lowerSource.includes('.com')) {
    return 70;
  }
  
  // Social media
  if (lowerSource.includes('facebook') || lowerSource.includes('instagram')) {
    return 55;
  }
  
  // Default for unknown sources
  return DEFAULT_TRUST_SCORES.unknown;
}

/**
 * Compare trust scores of two sources
 * @param source1 First source
 * @param source2 Second source
 * @param customScores Custom score overrides
 * @returns Positive if source1 > source2, negative if source2 > source1, 0 if equal
 */
export function compareTrustScores(
  source1: string,
  source2: string,
  customScores: Record<string, number> = {}
): number {
  const score1 = getTrustScore(source1, customScores);
  const score2 = getTrustScore(source2, customScores);
  return score1 - score2;
}

/**
 * Get the most trusted source from a list of gigs
 * @param gigs Array of gigs to compare
 * @param customScores Custom score overrides
 * @returns Gig from most trusted source
 */
export function getMostTrustedGig(
  gigs: Gig[],
  customScores: Record<string, number> = {}
): Gig {
  if (gigs.length === 0) {
    throw new Error('Cannot find most trusted gig from empty array');
  }
  
  if (gigs.length === 1) {
    return gigs[0];
  }
  
  let mostTrusted = gigs[0];
  let highestScore = getTrustScore(mostTrusted.source, customScores);
  
  for (let i = 1; i < gigs.length; i++) {
    const currentScore = getTrustScore(gigs[i].source, customScores);
    
    if (currentScore > highestScore) {
      mostTrusted = gigs[i];
      highestScore = currentScore;
    } else if (currentScore === highestScore) {
      // For equal scores, prefer the one with earlier updatedAt (first seen)
      if (new Date(gigs[i].updatedAt) < new Date(mostTrusted.updatedAt)) {
        mostTrusted = gigs[i];
      }
    }
  }
  
  return mostTrusted;
}

/**
 * Merge field data from multiple gigs based on trust scores
 * @param gigs Array of gigs to merge
 * @param customScores Custom score overrides
 * @returns Merged gig data
 */
export function mergeTrustedData(
  gigs: Gig[],
  customScores: Record<string, number> = {}
): Partial<Gig> {
  if (gigs.length === 0) {
    throw new Error('Cannot merge empty array of gigs');
  }
  
  if (gigs.length === 1) {
    return { ...gigs[0] };
  }
  
  // Sort gigs by trust score (highest first)
  const sortedGigs = [...gigs].sort((a, b) => 
    compareTrustScores(b.source, a.source, customScores)
  );
  
  // Start with the most trusted gig as base
  const merged: Partial<Gig> = { ...sortedGigs[0] };
  
  // Override fields with data from higher-trust sources
  for (let i = 1; i < sortedGigs.length; i++) {
    const gig = sortedGigs[i];
    const gigTrustScore = getTrustScore(gig.source, customScores);
    const baseTrustScore = getTrustScore(merged.source!, customScores);
    
    // Only use data from equal or higher trust sources
    if (gigTrustScore >= baseTrustScore) {
      mergeGigFields(merged, gig, gigTrustScore >= baseTrustScore);
    }
  }
  
  return merged;
}

/**
 * Merge individual fields from source gig into target gig
 * @param target Target gig to merge into
 * @param source Source gig to merge from
 * @param preferSource Whether to prefer source data
 */
function mergeGigFields(target: Partial<Gig>, source: Gig, preferSource: boolean): void {
  // Merge arrays (concatenate and dedupe)
  if (source.artists && source.artists.length > 0) {
    target.artists = [...new Set([...(target.artists || []), ...source.artists])];
  }
  
  if (source.genre && source.genre.length > 0) {
    target.genre = [...new Set([...(target.genre || []), ...source.genre])];
  }
  
  if (source.images && source.images.length > 0) {
    target.images = [...new Set([...(target.images || []), ...source.images])];
  }
  
  // Merge venue data (prefer more complete data)
  if (source.venue) {
    target.venue = {
      name: target.venue?.name || source.venue.name,
      address: target.venue?.address || source.venue.address,
      city: target.venue?.city || source.venue.city,
      country: target.venue?.country || source.venue.country,
      lat: target.venue?.lat ?? source.venue.lat,
      lng: target.venue?.lng ?? source.venue.lng
    };
  }
  
  // Merge price (prefer complete price info)
  if (source.price && (!target.price || preferSource)) {
    target.price = source.price;
  }
  
  // Merge URLs (prefer non-empty values)
  if (source.ticketsUrl && (!target.ticketsUrl || preferSource)) {
    target.ticketsUrl = source.ticketsUrl;
  }
  
  if (source.eventUrl && (!target.eventUrl || preferSource)) {
    target.eventUrl = source.eventUrl;
  }
  
  // Merge other optional fields
  if (source.dateEnd && (!target.dateEnd || preferSource)) {
    target.dateEnd = source.dateEnd;
  }
  
  if (source.timezone && (!target.timezone || preferSource)) {
    target.timezone = source.timezone;
  }
  
  if (source.ageRestriction && (!target.ageRestriction || preferSource)) {
    target.ageRestriction = source.ageRestriction;
  }
  
  // Always keep the most recent updatedAt
  if (source.updatedAt && (!target.updatedAt || source.updatedAt > target.updatedAt)) {
    target.updatedAt = source.updatedAt;
  }
}

/**
 * Create source metadata for merged gig
 * @param gigs Array of source gigs
 * @returns Source metadata
 */
export function createSourceMetadata(gigs: Gig[]): {
  sources: string[];
  primarySource: string;
  sourceCount: number;
  trustScores: Record<string, number>;
} {
  const sources = [...new Set(gigs.map(g => g.source))];
  const primarySource = getMostTrustedGig(gigs).source;
  const trustScores: Record<string, number> = {};
  
  for (const source of sources) {
    trustScores[source] = getTrustScore(source);
  }
  
  return {
    sources,
    primarySource,
    sourceCount: sources.length,
    trustScores
  };
}

/**
 * Check if a source should be trusted for specific types of data
 * @param source Source name
 * @param dataType Type of data to check
 * @returns True if source is trusted for this data type
 */
export function isTrustedForDataType(
  source: string,
  dataType: 'pricing' | 'dates' | 'venue' | 'artists' | 'metadata'
): boolean {
  const trustScore = getTrustScore(source);
  
  switch (dataType) {
    case 'pricing':
      // Only trust official sources and major ticketing platforms for pricing
      return trustScore >= 80;
    
    case 'dates':
      // Trust most sources for dates, but be cautious with scrapers
      return trustScore >= 50;
    
    case 'venue':
      // Trust official venue sources and major platforms for venue info
      return trustScore >= 60;
    
    case 'artists':
      // Most sources can be trusted for artist information
      return trustScore >= 40;
    
    case 'metadata':
      // General metadata can come from any source
      return trustScore >= 30;
    
    default:
      return trustScore >= 50;
  }
}