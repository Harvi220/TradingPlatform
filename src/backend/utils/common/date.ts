/**
 * Date and Timestamp Utilities
 *
 * Helper functions for working with dates and timestamps
 * in a consistent way across the application.
 *
 * @module DateUtils
 */

import { COLLECTION_SCHEDULE } from '@/backend/constants';

/**
 * Round a date to the nearest minute
 * Removes seconds and milliseconds for consistent storage
 *
 * @param date - Date to round
 * @returns Rounded date
 *
 * @example
 * ```typescript
 * roundToMinute(new Date('2024-01-01T12:34:56.789Z'))
 * // Returns: Date('2024-01-01T12:34:00.000Z')
 * ```
 */
export function roundToMinute(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
}

/**
 * Round a date to the nearest hour
 *
 * @param date - Date to round
 * @returns Rounded date
 *
 * @example
 * ```typescript
 * roundToHour(new Date('2024-01-01T12:34:56.789Z'))
 * // Returns: Date('2024-01-01T12:00:00.000Z')
 * ```
 */
export function roundToHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  return rounded;
}

/**
 * Round a date to the nearest day (midnight)
 *
 * @param date - Date to round
 * @returns Rounded date
 *
 * @example
 * ```typescript
 * roundToDay(new Date('2024-01-01T12:34:56.789Z'))
 * // Returns: Date('2024-01-01T00:00:00.000Z')
 * ```
 */
export function roundToDay(date: Date): Date {
  const rounded = new Date(date);
  rounded.setHours(0, 0, 0, 0);
  return rounded;
}

/**
 * Get timestamp in milliseconds from Date
 *
 * @param date - Date object
 * @returns Unix timestamp in milliseconds
 *
 * @example
 * ```typescript
 * getTimestampMs(new Date('2024-01-01T00:00:00Z'))
 * // Returns: 1704067200000
 * ```
 */
export function getTimestampMs(date: Date): number {
  return date.getTime();
}

/**
 * Get timestamp in seconds from Date
 *
 * @param date - Date object
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```typescript
 * getTimestampSeconds(new Date('2024-01-01T00:00:00Z'))
 * // Returns: 1704067200
 * ```
 */
export function getTimestampSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Create a Date from timestamp (auto-detects ms or seconds)
 *
 * @param timestamp - Unix timestamp (milliseconds or seconds)
 * @returns Date object
 *
 * @example
 * ```typescript
 * fromTimestamp(1704067200000) // From milliseconds
 * fromTimestamp(1704067200)    // From seconds (auto-detected)
 * ```
 */
export function fromTimestamp(timestamp: number): Date {
  // Timestamps before year 2001 in ms would be < 10000000000
  // If number is small, assume it's in seconds
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  return new Date(ms);
}

/**
 * Add milliseconds to a date
 *
 * @param date - Base date
 * @param ms - Milliseconds to add
 * @returns New date
 *
 * @example
 * ```typescript
 * addMilliseconds(new Date('2024-01-01'), 1000)
 * // Returns: Date 1 second later
 * ```
 */
export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

/**
 * Add seconds to a date
 *
 * @param date - Base date
 * @param seconds - Seconds to add
 * @returns New date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return addMilliseconds(date, seconds * 1000);
}

/**
 * Add minutes to a date
 *
 * @param date - Base date
 * @param minutes - Minutes to add
 * @returns New date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return addMilliseconds(date, minutes * 60 * 1000);
}

/**
 * Add hours to a date
 *
 * @param date - Base date
 * @param hours - Hours to add
 * @returns New date
 */
export function addHours(date: Date, hours: number): Date {
  return addMilliseconds(date, hours * 60 * 60 * 1000);
}

/**
 * Add days to a date
 *
 * @param date - Base date
 * @param days - Days to add
 * @returns New date
 */
export function addDays(date: Date, days: number): Date {
  return addMilliseconds(date, days * 24 * 60 * 60 * 1000);
}

/**
 * Subtract milliseconds from a date
 *
 * @param date - Base date
 * @param ms - Milliseconds to subtract
 * @returns New date
 */
export function subtractMilliseconds(date: Date, ms: number): Date {
  return addMilliseconds(date, -ms);
}

/**
 * Get difference between two dates in milliseconds
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in milliseconds (date1 - date2)
 *
 * @example
 * ```typescript
 * const diff = getDifferenceMs(
 *   new Date('2024-01-02'),
 *   new Date('2024-01-01')
 * )
 * // Returns: 86400000 (1 day in ms)
 * ```
 */
export function getDifferenceMs(date1: Date, date2: Date): number {
  return date1.getTime() - date2.getTime();
}

/**
 * Check if a date is within a range
 *
 * @param date - Date to check
 * @param start - Range start
 * @param end - Range end
 * @returns True if date is within range (inclusive)
 *
 * @example
 * ```typescript
 * isWithinRange(
 *   new Date('2024-01-15'),
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * )
 * // Returns: true
 * ```
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const timestamp = date.getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

/**
 * Get the start of today (midnight)
 *
 * @returns Date at midnight today
 */
export function getStartOfToday(): Date {
  return roundToDay(new Date());
}

/**
 * Get the end of today (23:59:59.999)
 *
 * @returns Date at end of today
 */
export function getEndOfToday(): Date {
  const date = getStartOfToday();
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get date N days ago
 *
 * @param days - Number of days ago
 * @returns Date N days in the past
 *
 * @example
 * ```typescript
 * getDaysAgo(7) // Date 1 week ago
 * ```
 */
export function getDaysAgo(days: number): Date {
  return addDays(new Date(), -days);
}

/**
 * Get date N hours ago
 *
 * @param hours - Number of hours ago
 * @returns Date N hours in the past
 */
export function getHoursAgo(hours: number): Date {
  return addHours(new Date(), -hours);
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2h 30m 15s")
 *
 * @example
 * ```typescript
 * formatDuration(9015000)
 * // Returns: "2h 30m 15s"
 * ```
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if date is valid
 *
 * @param date - Date to check
 * @returns True if date is valid
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Round timestamp to collection interval
 * Used for consistent snapshot timestamps
 *
 * @param date - Date to round
 * @returns Rounded date
 *
 * @example
 * ```typescript
 * roundToCollectionInterval(new Date('2024-01-01T12:34:56Z'))
 * // Returns: Date('2024-01-01T12:34:00Z') - rounded to minute
 * ```
 */
export function roundToCollectionInterval(date: Date): Date {
  const intervalMs = COLLECTION_SCHEDULE.TIMESTAMP_ROUND_MS;
  const timestamp = date.getTime();
  const rounded = Math.floor(timestamp / intervalMs) * intervalMs;
  return new Date(rounded);
}
