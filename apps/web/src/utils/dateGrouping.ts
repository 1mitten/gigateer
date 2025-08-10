import { Gig } from '@gigateer/contracts';
import { format } from 'date-fns/format';

export interface GigsByDate {
  date: string;
  dateFormatted: string;
  gigs: Gig[];
}

/**
 * Groups gigs by their start date
 * @param gigs Array of gigs to group (assumes already sorted by API)
 * @param preserveOrder Whether to preserve the original order instead of sorting
 * @returns Array of objects containing date and gigs for that date
 */
export function groupGigsByDate(gigs: Gig[], preserveOrder: boolean = false): GigsByDate[] {
  // Create a map to group gigs by date
  const gigsByDate = new Map<string, Gig[]>();
  
  gigs.forEach(gig => {
    try {
      const date = new Date(gig.dateStart);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // For invalid dates, group under "Date TBA"
        const key = 'date-tba';
        if (!gigsByDate.has(key)) {
          gigsByDate.set(key, []);
        }
        gigsByDate.get(key)!.push(gig);
        return;
      }
      
      // Use ISO date string (YYYY-MM-DD) as key for consistent grouping
      const dateKey = date.toISOString().split('T')[0];
      
      if (!gigsByDate.has(dateKey)) {
        gigsByDate.set(dateKey, []);
      }
      gigsByDate.get(dateKey)!.push(gig);
    } catch (error) {
      // For any parsing errors, group under "Date TBA"
      const key = 'date-tba';
      if (!gigsByDate.has(key)) {
        gigsByDate.set(key, []);
      }
      gigsByDate.get(key)!.push(gig);
    }
  });
  
  // Convert map to array and sort by date
  const groupedGigs: GigsByDate[] = Array.from(gigsByDate.entries())
    .map(([dateKey, gigs]) => {
      let dateFormatted: string;
      
      if (dateKey === 'date-tba') {
        dateFormatted = 'Date TBA';
      } else {
        try {
          const date = new Date(dateKey);
          // Format as "10th August 2025"
          dateFormatted = format(date, 'do MMMM yyyy');
        } catch (error) {
          dateFormatted = 'Date TBA';
        }
      }
      
      return {
        date: dateKey,
        dateFormatted,
        gigs: preserveOrder ? gigs : gigs.sort((a, b) => {
          // Sort gigs within the same date by time (only if not preserving order)
          try {
            const timeA = new Date(a.dateStart).getTime();
            const timeB = new Date(b.dateStart).getTime();
            return timeA - timeB;
          } catch {
            return 0;
          }
        })
      };
    });

  // If preserving order, keep groups in the order they appear in the original array
  if (preserveOrder) {
    // Create a map to track the order of dates as they appear
    const dateOrder = new Map<string, number>();
    let orderIndex = 0;
    
    gigs.forEach(gig => {
      try {
        const date = new Date(gig.dateStart);
        const dateKey = isNaN(date.getTime()) ? 'date-tba' : date.toISOString().split('T')[0];
        if (!dateOrder.has(dateKey)) {
          dateOrder.set(dateKey, orderIndex++);
        }
      } catch {
        if (!dateOrder.has('date-tba')) {
          dateOrder.set('date-tba', orderIndex++);
        }
      }
    });
    
    // Sort by original appearance order
    groupedGigs.sort((a, b) => {
      const orderA = dateOrder.get(a.date) ?? 999;
      const orderB = dateOrder.get(b.date) ?? 999;
      return orderA - orderB;
    });
  } else {
    // Original sorting behavior
    groupedGigs.sort((a, b) => {
      // Sort groups by date, with "Date TBA" at the end
      if (a.date === 'date-tba') return 1;
      if (b.date === 'date-tba') return -1;
      
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      } catch {
        return 0;
      }
    });
  }
  
  return groupedGigs;
}