/**
 * Date utilities for event comparison and matching
 */

/**
 * Parse ISO date string to Date object with error handling
 * @param dateString ISO date string
 * @returns Date object or null if invalid
 */
export function parseISODate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Check if two dates are within a specified time window
 * @param date1 First date (ISO string or Date)
 * @param date2 Second date (ISO string or Date)
 * @param windowMs Time window in milliseconds (default: 1 hour)
 * @returns True if dates are within the window
 */
export function isWithinTimeWindow(
  date1: string | Date,
  date2: string | Date,
  windowMs: number = 60 * 60 * 1000 // 1 hour default
): boolean {
  const d1 = typeof date1 === 'string' ? parseISODate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODate(date2) : date2;
  
  if (!d1 || !d2) return false;
  
  const diff = Math.abs(d1.getTime() - d2.getTime());
  return diff <= windowMs;
}

/**
 * Check if two date ranges overlap
 * @param start1 Start of first range
 * @param end1 End of first range (optional)
 * @param start2 Start of second range
 * @param end2 End of second range (optional)
 * @returns True if ranges overlap
 */
export function dateRangesOverlap(
  start1: string | Date,
  end1: string | Date | null | undefined,
  start2: string | Date,
  end2: string | Date | null | undefined
): boolean {
  const s1 = typeof start1 === 'string' ? parseISODate(start1) : start1;
  const e1 = end1 ? (typeof end1 === 'string' ? parseISODate(end1) : end1) : s1;
  const s2 = typeof start2 === 'string' ? parseISODate(start2) : start2;
  const e2 = end2 ? (typeof end2 === 'string' ? parseISODate(end2) : end2) : s2;
  
  if (!s1 || !s2 || !e1 || !e2) return false;
  
  // Check if ranges overlap: start1 <= end2 && start2 <= end1
  return s1.getTime() <= e2.getTime() && s2.getTime() <= e1.getTime();
}

/**
 * Check if two events are on the same day (ignoring time)
 * @param date1 First date
 * @param date2 Second date
 * @returns True if same day
 */
export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === 'string' ? parseISODate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODate(date2) : date2;
  
  if (!d1 || !d2) return false;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get the time difference between two dates in hours
 * @param date1 First date
 * @param date2 Second date
 * @returns Difference in hours (positive number)
 */
export function getTimeDifferenceHours(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? parseISODate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODate(date2) : date2;
  
  if (!d1 || !d2) return Infinity;
  
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Normalize date to start of day for comparison
 * @param date Date to normalize
 * @returns Date at start of day
 */
export function normalizeToStartOfDay(date: string | Date): Date | null {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  if (!d) return null;
  
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Create a fuzzy date key for grouping similar events
 * This creates a date key that includes some tolerance for matching
 * @param date Date to create key for
 * @param toleranceHours Hours of tolerance (default: 2)
 * @returns Array of possible date keys
 */
export function createFuzzyDateKeys(date: string | Date, toleranceHours: number = 2): string[] {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  if (!d) return [];
  
  const keys: string[] = [];
  const baseTime = d.getTime();
  const toleranceMs = toleranceHours * 60 * 60 * 1000;
  
  // Create keys for the tolerance window
  for (let offset = -toleranceMs; offset <= toleranceMs; offset += toleranceMs / 2) {
    const keyDate = new Date(baseTime + offset);
    const key = `${keyDate.getFullYear()}-${String(keyDate.getMonth() + 1).padStart(2, '0')}-${String(keyDate.getDate()).padStart(2, '0')}-${String(Math.floor(keyDate.getHours() / 4) * 4).padStart(2, '0')}`;
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  
  return keys;
}

/**
 * Format date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: string | Date): string {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  if (!d) return 'Invalid Date';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}