/**
 * Date and time parsing utilities for scrapers
 */
/**
 * Parse a date string into an ISO 8601 string
 * Handles various common date formats
 */
export declare function parseDate(dateStr: string, source: string, timezone?: string): string;
/**
 * Parse time strings like "7:00 PM", "19:30", etc.
 */
export declare function parseTime(timeStr: string, source: string): {
    hour: number;
    minute: number;
};
/**
 * Combine date and time strings into an ISO datetime string
 */
export declare function combineDateAndTime(dateStr: string, timeStr: string, source: string, timezone?: string): string;
/**
 * Check if a date is in the future
 */
export declare function isFutureDate(dateStr: string): boolean;
/**
 * Check if a date is within a reasonable range for events (not too far in past/future)
 */
export declare function isReasonableEventDate(dateStr: string): boolean;
/**
 * Extract timezone from various formats
 */
export declare function extractTimezone(text: string): string | undefined;
//# sourceMappingURL=date-utils.d.ts.map