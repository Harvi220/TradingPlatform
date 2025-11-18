/**
 * Common Utilities Index
 *
 * Central export point for all common utility functions.
 * Import utilities from this file to ensure consistency.
 *
 * @example
 * ```typescript
 * import {
 *   safeParseFloat,
 *   createSnapshotCacheKey,
 *   roundToMinute,
 *   formatNumber
 * } from '@/backend/utils/common';
 * ```
 *
 * @module CommonUtils
 */

// Parsing utilities
export {
  safeParseFloat,
  safeParseInt,
  safeParseBoolean,
  safeParseDate,
  safeParseJSON,
  parseArray,
  clamp,
} from './parsers';

// Redis key utilities
export {
  createSnapshotCacheKey,
  createQueryCacheKey,
  createCollectorStatsKey,
  createMetricsKey,
  createCacheKey,
  parseSnapshotCacheKey,
  createKeyPattern,
  createSnapshotPattern,
  createQueryPattern,
} from './redis-keys';

// Re-export types
export type {
  SnapshotCacheKeyParams,
  QueryCacheKeyParams,
} from './redis-keys';

// Date utilities
export {
  roundToMinute,
  roundToHour,
  roundToDay,
  getTimestampMs,
  getTimestampSeconds,
  fromTimestamp,
  addMilliseconds,
  addSeconds,
  addMinutes,
  addHours,
  addDays,
  subtractMilliseconds,
  getDifferenceMs,
  isWithinRange,
  getStartOfToday,
  getEndOfToday,
  getDaysAgo,
  getHoursAgo,
  formatDuration,
  isValidDate,
  roundToCollectionInterval,
} from './date';

// Formatting utilities
export {
  formatNumber,
  formatPercent,
  formatCompact,
  formatUSD,
  formatVolume,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatBytes,
  formatPrice,
  formatSymbol,
  truncate,
  formatJSON,
  formatError,
} from './formatters';
