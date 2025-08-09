/**
 * Fuzzy matching utilities for event deduplication
 * Combines normalized text comparison with string similarity
 */

import { Gig } from '@gigateer/contracts';
import { jaroWinklerSimilarity } from './string-similarity';
import { normalizeText, normalizeVenueName, normalizeTitle, normalizeCity } from './text-normalization';
import { isWithinTimeWindow, isSameDay } from './date-utils';

/**
 * Similarity thresholds for fuzzy matching
 */
export const SIMILARITY_THRESHOLDS = {
  EXACT_MATCH: 1.0,
  HIGH_SIMILARITY: 0.85,
  MEDIUM_SIMILARITY: 0.7,
  LOW_SIMILARITY: 0.5,
  VENUE_THRESHOLD: 0.8,
  TITLE_THRESHOLD: 0.75,
  LOCATION_THRESHOLD: 0.9
};

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  isMatch: boolean;
  confidence: number;
  reasons: string[];
  scores: {
    venue: number;
    title: number;
    location: number;
    date: number;
    overall: number;
  };
}

/**
 * Compare two gigs for fuzzy matching
 * @param gig1 First gig
 * @param gig2 Second gig
 * @param options Matching options
 * @returns Fuzzy match result
 */
export function fuzzyMatchGigs(
  gig1: Gig,
  gig2: Gig,
  options: {
    dateToleranceHours?: number;
    minOverallScore?: number;
    requireSameDay?: boolean;
  } = {}
): FuzzyMatchResult {
  const {
    dateToleranceHours = 2,
    minOverallScore = SIMILARITY_THRESHOLDS.MEDIUM_SIMILARITY,
    requireSameDay = false
  } = options;

  const reasons: string[] = [];
  const scores = {
    venue: 0,
    title: 0,
    location: 0,
    date: 0,
    overall: 0
  };

  // Skip if from same source with same sourceId
  if (gig1.source === gig2.source && gig1.sourceId && gig2.sourceId && gig1.sourceId === gig2.sourceId) {
    return {
      isMatch: true,
      confidence: 1.0,
      reasons: ['Same source and sourceId'],
      scores: { ...scores, overall: 1.0 }
    };
  }

  // Compare venue names
  const venue1 = normalizeVenueName(gig1.venue.name);
  const venue2 = normalizeVenueName(gig2.venue.name);
  scores.venue = jaroWinklerSimilarity(venue1, venue2);
  
  if (scores.venue >= SIMILARITY_THRESHOLDS.VENUE_THRESHOLD) {
    reasons.push(`Similar venues: "${gig1.venue.name}" vs "${gig2.venue.name}" (${scores.venue.toFixed(2)})`);
  }

  // Compare titles
  const title1 = normalizeTitle(gig1.title);
  const title2 = normalizeTitle(gig2.title);
  scores.title = jaroWinklerSimilarity(title1, title2);
  
  if (scores.title >= SIMILARITY_THRESHOLDS.TITLE_THRESHOLD) {
    reasons.push(`Similar titles: "${gig1.title}" vs "${gig2.title}" (${scores.title.toFixed(2)})`);
  }

  // Compare locations (city)
  const city1 = normalizeCity(gig1.venue.city || '');
  const city2 = normalizeCity(gig2.venue.city || '');
  
  if (city1 && city2) {
    scores.location = jaroWinklerSimilarity(city1, city2);
    if (scores.location >= SIMILARITY_THRESHOLDS.LOCATION_THRESHOLD) {
      reasons.push(`Same location: ${gig1.venue.city} (${scores.location.toFixed(2)})`);
    }
  } else {
    // If no city info, check country or address
    const addr1 = normalizeText(gig1.venue.address || gig1.venue.country || '');
    const addr2 = normalizeText(gig2.venue.address || gig2.venue.country || '');
    if (addr1 && addr2) {
      scores.location = jaroWinklerSimilarity(addr1, addr2);
    }
  }

  // Compare dates
  const sameDay = isSameDay(gig1.dateStart, gig2.dateStart);
  const withinWindow = isWithinTimeWindow(gig1.dateStart, gig2.dateStart, dateToleranceHours * 60 * 60 * 1000);
  
  if (sameDay) {
    scores.date = 1.0;
    reasons.push('Same day');
  } else if (withinWindow) {
    scores.date = 0.8;
    reasons.push(`Within ${dateToleranceHours}h time window`);
  } else {
    scores.date = 0;
  }

  // If requireSameDay is true and not same day, it's not a match
  if (requireSameDay && !sameDay) {
    return {
      isMatch: false,
      confidence: 0,
      reasons: ['Different days (same day required)'],
      scores
    };
  }

  // Calculate overall score with weighted components
  const weights = {
    venue: 0.3,
    title: 0.3,
    location: 0.2,
    date: 0.2
  };

  scores.overall = (
    scores.venue * weights.venue +
    scores.title * weights.title +
    scores.location * weights.location +
    scores.date * weights.date
  );

  const isMatch = scores.overall >= minOverallScore;
  
  return {
    isMatch,
    confidence: scores.overall,
    reasons: reasons.length > 0 ? reasons : ['No significant similarities found'],
    scores
  };
}

/**
 * Create a fuzzy matching key for grouping similar events
 * @param gig Gig object
 * @returns Fuzzy key object
 */
export function createFuzzyKey(gig: Gig): {
  venue: string;
  title: string;
  city: string;
  dateKey: string;
  composite: string;
} {
  const venue = normalizeVenueName(gig.venue.name);
  const title = normalizeTitle(gig.title);
  const city = normalizeCity(gig.venue.city || '');
  
  // Create date key (YYYY-MM-DD)
  const date = new Date(gig.dateStart);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Create composite key for exact grouping
  const composite = `${venue}|${title}|${city}|${dateKey}`;
  
  return {
    venue,
    title,
    city,
    dateKey,
    composite
  };
}

/**
 * Group gigs by fuzzy keys for efficient matching
 * @param gigs Array of gigs
 * @returns Map of fuzzy keys to gig arrays
 */
export function groupGigsByFuzzyKeys(gigs: Gig[]): Map<string, Gig[]> {
  const groups = new Map<string, Gig[]>();
  
  for (const gig of gigs) {
    const fuzzyKey = createFuzzyKey(gig);
    
    // Create multiple keys for better matching
    const keys = [
      fuzzyKey.composite,
      `${fuzzyKey.venue}|${fuzzyKey.dateKey}`,
      `${fuzzyKey.city}|${fuzzyKey.dateKey}|${fuzzyKey.title.substring(0, 20)}`
    ];
    
    for (const key of keys) {
      if (key.length > 5) { // Only use meaningful keys
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(gig);
      }
    }
  }
  
  return groups;
}

/**
 * Find potential duplicates for a gig within a group
 * @param targetGig Gig to find duplicates for
 * @param candidateGigs Array of candidate gigs
 * @param options Matching options
 * @returns Array of potential duplicates with match results
 */
export function findPotentialDuplicates(
  targetGig: Gig,
  candidateGigs: Gig[],
  options: {
    dateToleranceHours?: number;
    minConfidence?: number;
  } = {}
): Array<{ gig: Gig; match: FuzzyMatchResult }> {
  const { dateToleranceHours = 2, minConfidence = SIMILARITY_THRESHOLDS.MEDIUM_SIMILARITY } = options;
  
  const duplicates: Array<{ gig: Gig; match: FuzzyMatchResult }> = [];
  
  for (const candidate of candidateGigs) {
    if (candidate.id === targetGig.id) continue;
    
    const matchResult = fuzzyMatchGigs(targetGig, candidate, {
      dateToleranceHours,
      minOverallScore: minConfidence
    });
    
    if (matchResult.isMatch) {
      duplicates.push({
        gig: candidate,
        match: matchResult
      });
    }
  }
  
  // Sort by confidence (highest first)
  return duplicates.sort((a, b) => b.match.confidence - a.match.confidence);
}

/**
 * Check if two gigs are likely the same event
 * @param gig1 First gig
 * @param gig2 Second gig
 * @returns True if likely same event
 */
export function areLikelySameEvent(gig1: Gig, gig2: Gig): boolean {
  const match = fuzzyMatchGigs(gig1, gig2, {
    minOverallScore: SIMILARITY_THRESHOLDS.HIGH_SIMILARITY,
    requireSameDay: true
  });
  
  return match.isMatch;
}