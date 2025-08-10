import { Gig } from '@gigateer/contracts';

export interface EventGroup {
  type: 'happening' | 'future';
  events: Gig[];
}

/**
 * Determines if an event is currently happening
 */
export function isEventHappening(gig: Gig): boolean {
  const now = new Date();
  
  if (!gig.date?.start) return false;
  
  const startDate = new Date(gig.date.start);
  
  // If there's an end date, check if current time is between start and end
  if (gig.date.end) {
    const endDate = new Date(gig.date.end);
    return now >= startDate && now <= endDate;
  }
  
  // If no end date, assume event lasts 3 hours (typical concert length)
  const estimatedEndDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
  return now >= startDate && now <= estimatedEndDate;
}

/**
 * Groups events into 'happening now' and 'future' categories
 */
export function groupEventsByHappening(gigs: Gig[], showHappeningEvents: boolean): EventGroup[] {
  const happening: Gig[] = [];
  const future: Gig[] = [];
  
  gigs.forEach(gig => {
    if (isEventHappening(gig)) {
      happening.push(gig);
    } else {
      future.push(gig);
    }
  });
  
  const groups: EventGroup[] = [];
  
  // Add happening events first if enabled and there are any
  if (showHappeningEvents && happening.length > 0) {
    groups.push({
      type: 'happening',
      events: happening
    });
  }
  
  // Add future events
  if (future.length > 0) {
    groups.push({
      type: 'future',
      events: future
    });
  }
  
  return groups;
}

/**
 * Flattens grouped events back into a single array with proper ordering
 */
export function flattenEventGroups(groups: EventGroup[]): Gig[] {
  return groups.flatMap(group => group.events);
}