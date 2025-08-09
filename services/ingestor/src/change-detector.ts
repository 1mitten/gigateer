import type { Gig } from "@gigateer/contracts";
import { createGigHash, createGigId } from "@gigateer/contracts";
import type { Logger } from "./logger.js";

export interface ChangeDetectionResult {
  newGigs: Gig[];
  updatedGigs: Gig[];
  unchangedGigs: Gig[];
  totalCount: number;
}

export class ChangeDetector {
  constructor(private readonly logger: Logger) {}

  /**
   * Compares current gigs with previous gigs to detect changes
   */
  detectChanges(
    currentGigs: Gig[],
    previousGigs: Gig[] | null
  ): ChangeDetectionResult {
    const now = new Date().toISOString();
    const result: ChangeDetectionResult = {
      newGigs: [],
      updatedGigs: [],
      unchangedGigs: [],
      totalCount: currentGigs.length,
    };

    // Create lookup map from previous gigs
    const previousGigsMap = new Map<string, Gig>();
    if (previousGigs) {
      for (const gig of previousGigs) {
        previousGigsMap.set(gig.id, gig);
      }
    }

    for (const currentGig of currentGigs) {
      // Ensure the gig has proper ID and hash
      if (!currentGig.id) {
        currentGig.id = createGigId(
          currentGig.venue.name,
          currentGig.title,
          currentGig.dateStart,
          currentGig.venue.city
        );
      }
      if (!currentGig.hash) {
        currentGig.hash = createGigHash(currentGig);
      }

      const previousGig = previousGigsMap.get(currentGig.id);

      if (!previousGig) {
        // This is a new gig
        result.newGigs.push({
          ...currentGig,
          isNew: true,
          isUpdated: false,
          firstSeenAt: now,
          lastSeenAt: now,
        });
      } else if (previousGig.hash !== currentGig.hash) {
        // This gig has been updated
        result.updatedGigs.push({
          ...currentGig,
          isNew: false,
          isUpdated: true,
          firstSeenAt: previousGig.firstSeenAt || now,
          lastSeenAt: now,
        });
      } else {
        // This gig is unchanged
        result.unchangedGigs.push({
          ...currentGig,
          isNew: false,
          isUpdated: false,
          firstSeenAt: previousGig.firstSeenAt || now,
          lastSeenAt: now,
        });
      }
    }

    this.logger.info(
      {
        total: result.totalCount,
        new: result.newGigs.length,
        updated: result.updatedGigs.length,
        unchanged: result.unchangedGigs.length,
      },
      "Change detection completed"
    );

    return result;
  }

  /**
   * Merges change detection results back into a single array
   */
  mergeResults(result: ChangeDetectionResult): Gig[] {
    return [...result.newGigs, ...result.updatedGigs, ...result.unchangedGigs];
  }
}