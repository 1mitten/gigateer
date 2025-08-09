/**
 * Main deduplication logic for event processing
 * Handles primary key deduplication and fuzzy matching
 */

import { Gig } from '@gigateer/contracts';
import { fuzzyMatchGigs, findPotentialDuplicates, groupGigsByFuzzyKeys, SIMILARITY_THRESHOLDS } from './utils/fuzzy-matching';
import { getMostTrustedGig, mergeTrustedData, createSourceMetadata } from './trust-score';
import { createGigContentHash, createCompositeKey } from './utils/hash-utils';

/**
 * Deduplication result
 */
export interface DeduplicationResult {
  dedupedGigs: Gig[];
  duplicatesRemoved: number;
  mergedGroups: number;
  sourceStats: Record<string, {
    original: number;
    afterDedup: number;
    duplicatesRemoved: number;
  }>;
}

/**
 * Duplicate group with merge information
 */
export interface DuplicateGroup {
  id: string;
  gigs: Gig[];
  merged: Gig;
  confidence: number;
  reasons: string[];
}

/**
 * Deduplication options
 */
export interface DeduplicationOptions {
  /** Minimum confidence score for fuzzy matching (0-1) */
  minConfidence?: number;
  /** Maximum hours difference for date matching */
  dateToleranceHours?: number;
  /** Whether to require same day for matches */
  requireSameDay?: boolean;
  /** Custom trust scores for sources */
  customTrustScores?: Record<string, number>;
  /** Whether to preserve original IDs in merged gigs */
  preserveOriginalIds?: boolean;
}

/**
 * Main deduplication function
 * @param gigs Array of gigs to deduplicate
 * @param options Deduplication options
 * @returns Deduplication result
 */
export function deduplicateGigs(
  gigs: Gig[],
  options: DeduplicationOptions = {}
): DeduplicationResult {
  const {
    minConfidence = SIMILARITY_THRESHOLDS.MEDIUM_SIMILARITY,
    dateToleranceHours = 2,
    requireSameDay = false,
    customTrustScores = {},
    preserveOriginalIds = false
  } = options;

  if (gigs.length === 0) {
    return {
      dedupedGigs: [],
      duplicatesRemoved: 0,
      mergedGroups: 0,
      sourceStats: {}
    };
  }

  // Step 1: Primary key deduplication (exact ID matches)
  const primaryDeduped = deduplicateByPrimaryKey(gigs);
  
  // Step 2: Fuzzy matching for near-duplicates
  const fuzzyDeduped = deduplicateByFuzzyMatching(
    primaryDeduped.gigs,
    {
      minConfidence,
      dateToleranceHours,
      requireSameDay,
      customTrustScores,
      preserveOriginalIds
    }
  );

  // Calculate source statistics
  const sourceStats = calculateSourceStats(gigs, fuzzyDeduped.gigs);

  return {
    dedupedGigs: fuzzyDeduped.gigs,
    duplicatesRemoved: primaryDeduped.duplicatesRemoved + fuzzyDeduped.duplicatesRemoved,
    mergedGroups: primaryDeduped.mergedGroups + fuzzyDeduped.mergedGroups,
    sourceStats
  };
}

/**
 * Deduplicate by exact ID matches
 * @param gigs Input gigs
 * @returns Primary deduplication result
 */
function deduplicateByPrimaryKey(gigs: Gig[]): {
  gigs: Gig[];
  duplicatesRemoved: number;
  mergedGroups: number;
} {
  const seenIds = new Map<string, Gig[]>();
  
  // Group by ID
  for (const gig of gigs) {
    if (!seenIds.has(gig.id)) {
      seenIds.set(gig.id, []);
    }
    seenIds.get(gig.id)!.push(gig);
  }

  const dedupedGigs: Gig[] = [];
  let duplicatesRemoved = 0;
  let mergedGroups = 0;

  for (const [id, gigGroup] of seenIds) {
    if (gigGroup.length === 1) {
      dedupedGigs.push(gigGroup[0]);
    } else {
      // Merge duplicates with same ID
      const merged = mergeTrustedData(gigGroup) as Gig;
      merged.id = id; // Ensure ID is preserved
      merged.hash = createGigContentHash(merged);
      
      dedupedGigs.push(merged);
      duplicatesRemoved += gigGroup.length - 1;
      mergedGroups += 1;
    }
  }

  return {
    gigs: dedupedGigs,
    duplicatesRemoved,
    mergedGroups
  };
}

/**
 * Deduplicate by fuzzy matching
 * @param gigs Input gigs (after primary dedup)
 * @param options Fuzzy matching options
 * @returns Fuzzy deduplication result
 */
function deduplicateByFuzzyMatching(
  gigs: Gig[],
  options: Required<Omit<DeduplicationOptions, 'customTrustScores'>> & {
    customTrustScores: Record<string, number>;
  }
): {
  gigs: Gig[];
  duplicatesRemoved: number;
  mergedGroups: number;
} {
  const {
    minConfidence,
    dateToleranceHours,
    requireSameDay,
    customTrustScores,
    preserveOriginalIds
  } = options;

  // Group gigs by fuzzy keys for efficient comparison
  const fuzzyGroups = groupGigsByFuzzyKeys(gigs);
  
  const processed = new Set<string>();
  const dedupedGigs: Gig[] = [];
  const duplicateGroups: DuplicateGroup[] = [];

  for (const gig of gigs) {
    if (processed.has(gig.id)) {
      continue;
    }

    // Find potential duplicates
    const candidates = findCandidatesForGig(gig, fuzzyGroups);
    const duplicates = findPotentialDuplicates(gig, candidates, {
      dateToleranceHours,
      minConfidence
    });

    if (duplicates.length === 0) {
      // No duplicates found, add as-is
      dedupedGigs.push(gig);
      processed.add(gig.id);
    } else {
      // Found duplicates, create merge group
      const allGigs = [gig, ...duplicates.map(d => d.gig)];
      const unprocessedGigs = allGigs.filter(g => !processed.has(g.id));
      
      if (unprocessedGigs.length > 1) {
        const merged = mergeTrustedData(unprocessedGigs, customTrustScores) as Gig;
        
        // Generate new ID if not preserving originals
        if (!preserveOriginalIds) {
          merged.id = createCompositeKey(merged);
        }
        
        // Update hash
        merged.hash = createGigContentHash(merged);
        
        // Create duplicate group metadata
        const group: DuplicateGroup = {
          id: merged.id,
          gigs: unprocessedGigs,
          merged,
          confidence: Math.max(...duplicates.map(d => d.match.confidence)),
          reasons: duplicates.flatMap(d => d.match.reasons)
        };
        
        duplicateGroups.push(group);
        dedupedGigs.push(merged);
        
        // Mark all as processed
        for (const g of unprocessedGigs) {
          processed.add(g.id);
        }
      }
    }
  }

  return {
    gigs: dedupedGigs,
    duplicatesRemoved: gigs.length - dedupedGigs.length,
    mergedGroups: duplicateGroups.length
  };
}

/**
 * Find candidates for fuzzy matching
 * @param gig Target gig
 * @param fuzzyGroups Grouped gigs by fuzzy keys
 * @returns Array of candidate gigs
 */
function findCandidatesForGig(
  gig: Gig,
  fuzzyGroups: Map<string, Gig[]>
): Gig[] {
  const candidates = new Set<Gig>();
  
  // Create fuzzy keys for the target gig
  const venue = gig.venue.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const city = (gig.venue.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const date = new Date(gig.dateStart);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Look for candidates using various key combinations
  const searchKeys = [
    `${venue}|${dateKey}`,
    `${city}|${dateKey}`,
    dateKey
  ];
  
  for (const key of searchKeys) {
    const group = fuzzyGroups.get(key);
    if (group) {
      group.forEach(candidate => {
        if (candidate.id !== gig.id) {
          candidates.add(candidate);
        }
      });
    }
  }
  
  return Array.from(candidates);
}

/**
 * Calculate source statistics
 * @param originalGigs Original gig array
 * @param dedupedGigs Deduplicated gig array
 * @returns Source statistics
 */
function calculateSourceStats(
  originalGigs: Gig[],
  dedupedGigs: Gig[]
): Record<string, { original: number; afterDedup: number; duplicatesRemoved: number }> {
  const originalCounts = new Map<string, number>();
  const dedupedCounts = new Map<string, number>();

  // Count originals
  for (const gig of originalGigs) {
    originalCounts.set(gig.source, (originalCounts.get(gig.source) || 0) + 1);
  }

  // Count after deduplication
  for (const gig of dedupedGigs) {
    dedupedCounts.set(gig.source, (dedupedCounts.get(gig.source) || 0) + 1);
  }

  const stats: Record<string, { original: number; afterDedup: number; duplicatesRemoved: number }> = {};

  // Get all sources
  const allSources = new Set([...originalCounts.keys(), ...dedupedCounts.keys()]);

  for (const source of allSources) {
    const original = originalCounts.get(source) || 0;
    const afterDedup = dedupedCounts.get(source) || 0;
    
    stats[source] = {
      original,
      afterDedup,
      duplicatesRemoved: original - afterDedup
    };
  }

  return stats;
}

/**
 * Find exact duplicates (same content hash)
 * @param gigs Input gigs
 * @returns Groups of exact duplicates
 */
export function findExactDuplicates(gigs: Gig[]): Map<string, Gig[]> {
  const hashGroups = new Map<string, Gig[]>();
  
  for (const gig of gigs) {
    const hash = createGigContentHash(gig);
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash)!.push(gig);
  }
  
  // Return only groups with duplicates
  const duplicateGroups = new Map<string, Gig[]>();
  for (const [hash, group] of hashGroups) {
    if (group.length > 1) {
      duplicateGroups.set(hash, group);
    }
  }
  
  return duplicateGroups;
}

/**
 * Validate gigs before deduplication
 * @param gigs Input gigs
 * @returns Array of validation errors
 */
export function validateGigsForDeduplication(gigs: Gig[]): string[] {
  const errors: string[] = [];
  
  for (let i = 0; i < gigs.length; i++) {
    const gig = gigs[i];
    
    if (!gig.id) {
      errors.push(`Gig at index ${i} missing required id field`);
    }
    
    if (!gig.source) {
      errors.push(`Gig at index ${i} missing required source field`);
    }
    
    if (!gig.title) {
      errors.push(`Gig at index ${i} missing required title field`);
    }
    
    if (!gig.venue?.name) {
      errors.push(`Gig at index ${i} missing required venue.name field`);
    }
    
    if (!gig.dateStart) {
      errors.push(`Gig at index ${i} missing required dateStart field`);
    } else {
      const date = new Date(gig.dateStart);
      if (isNaN(date.getTime())) {
        errors.push(`Gig at index ${i} has invalid dateStart: ${gig.dateStart}`);
      }
    }
  }
  
  return errors;
}