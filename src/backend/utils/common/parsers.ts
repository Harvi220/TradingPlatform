/**
 * Safe Parsing Utilities
 *
 * Provides type-safe parsing functions with proper error handling
 * and default values. Prevents runtime errors from invalid data.
 *
 * @module Parsers
 */

/**
 * Safely parse a value to float
 * Returns null if parsing fails instead of NaN
 *
 * @param value - Value to parse (string or number)
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
 *
 * @example
 * ```typescript
 * safeParseFloat('123.45') // 123.45
 * safeParseFloat('invalid') // null
 * safeParseFloat('invalid', 0) // 0
 * safeParseFloat(123.45) // 123.45
 * ```
 */
export function safeParseFloat(
  value: string | number | null | undefined,
  defaultValue: number | null = null
): number | null {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a value to integer
 * Returns null if parsing fails instead of NaN
 *
 * @param value - Value to parse (string or number)
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * safeParseInt('123') // 123
 * safeParseInt('123.45') // 123
 * safeParseInt('invalid') // null
 * safeParseInt('invalid', 0) // 0
 * ```
 */
export function safeParseInt(
  value: string | number | null | undefined,
  defaultValue: number | null = null
): number | null {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : Math.floor(value);
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse boolean value
 * Handles common boolean representations
 *
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Boolean value or default
 *
 * @example
 * ```typescript
 * safeParseBoolean('true') // true
 * safeParseBoolean('1') // true
 * safeParseBoolean('yes') // true
 * safeParseBoolean('false') // false
 * safeParseBoolean('invalid') // false
 * ```
 */
export function safeParseBoolean(
  value: string | boolean | number | null | undefined,
  defaultValue = false
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = value.toString().toLowerCase().trim();
  const truthyValues = ['true', '1', 'yes', 'y', 'on'];
  return truthyValues.includes(normalized);
}

/**
 * Parse timestamp to Date object
 * Handles both Unix timestamps (ms and seconds) and ISO strings
 *
 * @param value - Timestamp value (number, string, or Date)
 * @param defaultValue - Default value if parsing fails
 * @returns Date object or default value
 *
 * @example
 * ```typescript
 * safeParseDate(1700000000000) // Date from ms timestamp
 * safeParseDate(1700000000) // Date from seconds timestamp (auto-detected)
 * safeParseDate('2024-01-01T00:00:00Z') // Date from ISO string
 * safeParseDate('invalid') // null
 * ```
 */
export function safeParseDate(
  value: number | string | Date | null | undefined,
  defaultValue: Date | null = null
): Date | null {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? defaultValue : value;
  }

  let date: Date;

  if (typeof value === 'number') {
    // Auto-detect if timestamp is in seconds or milliseconds
    // Timestamps before year 2001 in ms would be < 1000000000000
    const timestamp = value < 10000000000 ? value * 1000 : value;
    date = new Date(timestamp);
  } else {
    date = new Date(value);
  }

  return isNaN(date.getTime()) ? defaultValue : date;
}

/**
 * Parse JSON safely without throwing
 *
 * @param value - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 *
 * @example
 * ```typescript
 * safeParseJSON('{"key": "value"}') // { key: "value" }
 * safeParseJSON('invalid json') // null
 * safeParseJSON('invalid', {}) // {}
 * ```
 */
export function safeParseJSON<T = any>(
  value: string | null | undefined,
  defaultValue: T | null = null
): T | null {
  if (!value) {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Parse array from comma-separated string
 *
 * @param value - Comma-separated string or array
 * @param defaultValue - Default value if parsing fails
 * @returns Array of strings
 *
 * @example
 * ```typescript
 * parseArray('a,b,c') // ['a', 'b', 'c']
 * parseArray('a, b, c') // ['a', 'b', 'c'] (trimmed)
 * parseArray(['a', 'b']) // ['a', 'b']
 * parseArray('') // []
 * ```
 */
export function parseArray(
  value: string | string[] | null | undefined,
  defaultValue: string[] = []
): string[] {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return defaultValue;
}

/**
 * Clamp a number between min and max values
 *
 * @param value - Number to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 *
 * @example
 * ```typescript
 * clamp(50, 0, 100) // 50
 * clamp(-10, 0, 100) // 0
 * clamp(150, 0, 100) // 100
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
