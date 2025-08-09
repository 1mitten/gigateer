/**
 * Date and time parsing utilities for scrapers
 */
import { ParseError } from "./errors";
/**
 * Common date format patterns
 */
const DATE_PATTERNS = [
    // ISO 8601 formats
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    // Common formats
    /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?$/,
    /^\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?$/,
    /^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?$/,
];
/**
 * Parse a date string into an ISO 8601 string
 * Handles various common date formats
 */
export function parseDate(dateStr, source, timezone) {
    if (!dateStr) {
        throw new ParseError(source, "Empty date string provided");
    }
    const trimmed = dateStr.trim();
    // Try parsing as-is first (for ISO dates)
    let parsed = new Date(trimmed);
    // If that fails, try to clean and parse common formats
    if (isNaN(parsed.getTime())) {
        // Handle common format variations
        let cleaned = trimmed
            .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2") // MM/DD/YYYY -> YYYY-MM-DD
            .replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, "$3-$1-$2") // MM-DD-YYYY -> YYYY-MM-DD
            .replace(/\bat\s+/i, " ") // "at 7:00" -> " 7:00"
            .replace(/\s+/g, " "); // normalize spaces
        parsed = new Date(cleaned);
    }
    if (isNaN(parsed.getTime())) {
        throw new ParseError(source, `Invalid date format: "${dateStr}"`);
    }
    // Convert to ISO string, preserving timezone if provided
    if (timezone) {
        // For now, just return the ISO string
        // TODO: Implement proper timezone conversion using a library like date-fns-tz
        return parsed.toISOString();
    }
    return parsed.toISOString();
}
/**
 * Parse time strings like "7:00 PM", "19:30", etc.
 */
export function parseTime(timeStr, source) {
    const trimmed = timeStr.trim().toLowerCase();
    // Handle 12-hour format with AM/PM
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (twelveHourMatch) {
        let hour = parseInt(twelveHourMatch[1], 10);
        const minute = parseInt(twelveHourMatch[2], 10);
        const meridiem = twelveHourMatch[3];
        // Validate time ranges
        if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
            throw new ParseError(source, `Invalid time format: "${timeStr}"`);
        }
        if (meridiem === "pm" && hour !== 12)
            hour += 12;
        if (meridiem === "am" && hour === 12)
            hour = 0;
        return { hour, minute };
    }
    // Handle 24-hour format
    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hour = parseInt(twentyFourHourMatch[1], 10);
        const minute = parseInt(twentyFourHourMatch[2], 10);
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute };
        }
    }
    throw new ParseError(source, `Invalid time format: "${timeStr}"`);
}
/**
 * Combine date and time strings into an ISO datetime string
 */
export function combineDateAndTime(dateStr, timeStr, source, timezone) {
    const { hour, minute } = parseTime(timeStr, source);
    // Parse date without time component
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const baseDate = new Date(datePart + "T00:00:00.000Z");
    if (isNaN(baseDate.getTime())) {
        throw new ParseError(source, `Invalid date part: "${datePart}"`);
    }
    // Set the time
    baseDate.setUTCHours(hour, minute, 0, 0);
    return baseDate.toISOString();
}
/**
 * Check if a date is in the future
 */
export function isFutureDate(dateStr) {
    const date = new Date(dateStr);
    return date.getTime() > Date.now();
}
/**
 * Check if a date is within a reasonable range for events (not too far in past/future)
 */
export function isReasonableEventDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    // Not more than 1 year in the past
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    // Not more than 2 years in the future  
    const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    return date >= yearAgo && date <= twoYearsFromNow;
}
/**
 * Extract timezone from various formats
 */
export function extractTimezone(text) {
    const timezonePatterns = [
        /\b(UTC|GMT)([+-]\d{1,2}(?::\d{2})?)?/i,
        /\b(EST|PST|MST|CST|EDT|PDT|MDT|CDT)\b/i,
        /\b([A-Z]{3,4})\b/, // Generic 3-4 letter timezone codes
    ];
    for (const pattern of timezonePatterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0].toUpperCase();
        }
    }
    return undefined;
}
//# sourceMappingURL=date-utils.js.map