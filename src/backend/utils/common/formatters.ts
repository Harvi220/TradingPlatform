/**
 * Formatting Utilities
 *
 * Functions for formatting numbers, dates, and other values
 * for display and logging purposes.
 *
 * @module Formatters
 */

/**
 * Format number with thousand separators
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatNumber(1234567.89)
 * // Returns: "1,234,567.89"
 *
 * formatNumber(1234567.89, 0)
 * // Returns: "1,234,568"
 * ```
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format number as percentage
 *
 * @param value - Number to format (0.15 = 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 *
 * @example
 * ```typescript
 * formatPercent(0.1234)
 * // Returns: "12.34%"
 *
 * formatPercent(0.1234, 1)
 * // Returns: "12.3%"
 * ```
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number in compact notation (K, M, B)
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatCompact(1234)
 * // Returns: "1.23K"
 *
 * formatCompact(1234567)
 * // Returns: "1.23M"
 *
 * formatCompact(1234567890)
 * // Returns: "1.23B"
 * ```
 */
export function formatCompact(value: number, decimals = 2): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  }
  return `${sign}${absValue.toFixed(decimals)}`;
}

/**
 * Format USD value with dollar sign
 *
 * @param value - Value in USD
 * @param decimals - Number of decimal places
 * @returns Formatted USD string
 *
 * @example
 * ```typescript
 * formatUSD(1234.56)
 * // Returns: "$1,234.56"
 *
 * formatUSD(1234567)
 * // Returns: "$1,234,567.00"
 * ```
 */
export function formatUSD(value: number, decimals = 2): string {
  return `$${formatNumber(value, decimals)}`;
}

/**
 * Format volume with appropriate unit (K, M, B)
 *
 * @param value - Volume value
 * @returns Formatted volume string
 *
 * @example
 * ```typescript
 * formatVolume(1234567)
 * // Returns: "1.23M"
 * ```
 */
export function formatVolume(value: number): string {
  return formatCompact(value, 2);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2024-01-15T12:34:56Z'))
 * // Returns: "2024-01-15"
 * ```
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date and time to ISO string (YYYY-MM-DD HH:mm:ss)
 *
 * @param date - Date to format
 * @returns ISO datetime string
 *
 * @example
 * ```typescript
 * formatDateTime(new Date('2024-01-15T12:34:56Z'))
 * // Returns: "2024-01-15 12:34:56"
 * ```
 */
export function formatDateTime(date: Date): string {
  const iso = date.toISOString();
  return iso.replace('T', ' ').split('.')[0];
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 *
 * @param date - Date to format
 * @returns Relative time string
 *
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))
 * // Returns: "2 hours ago"
 * ```
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  return formatDate(date);
}

/**
 * Format bytes to human-readable size
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted size string
 *
 * @example
 * ```typescript
 * formatBytes(1024)
 * // Returns: "1.00 KB"
 *
 * formatBytes(1048576)
 * // Returns: "1.00 MB"
 * ```
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format price with appropriate precision
 * High prices: 2 decimals, Low prices: more decimals
 *
 * @param price - Price value
 * @returns Formatted price string
 *
 * @example
 * ```typescript
 * formatPrice(50000.123)
 * // Returns: "50,000.12"
 *
 * formatPrice(0.001234)
 * // Returns: "0.001234"
 * ```
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return formatNumber(price, 2);
  }
  if (price >= 0.01) {
    return formatNumber(price, 4);
  }
  return formatNumber(price, 6);
}

/**
 * Format trading symbol for display
 * Separates base and quote currency
 *
 * @param symbol - Trading symbol (e.g., "BTCUSDT")
 * @returns Formatted symbol (e.g., "BTC/USDT")
 *
 * @example
 * ```typescript
 * formatSymbol('BTCUSDT')
 * // Returns: "BTC/USDT"
 * ```
 */
export function formatSymbol(symbol: string): string {
  // Handle common quote currencies
  const quoteCurrencies = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];

  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
  }

  return symbol;
}

/**
 * Truncate string to max length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncate('This is a long text', 10)
 * // Returns: "This is..."
 * ```
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format object as JSON string with indentation
 *
 * @param obj - Object to format
 * @param indent - Indentation spaces
 * @returns Formatted JSON string
 */
export function formatJSON(obj: any, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Format error message for logging
 *
 * @param error - Error object or message
 * @returns Formatted error string
 *
 * @example
 * ```typescript
 * formatError(new Error('Something went wrong'))
 * // Returns: "Error: Something went wrong"
 * ```
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}
