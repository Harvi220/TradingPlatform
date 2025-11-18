/**
 * Backend Constants Index
 *
 * Central export point for all backend constants.
 * Import constants from this file to ensure consistency.
 *
 * @example
 * ```typescript
 * import { TRADING_DEPTHS, CACHE_TTL, HTTP_STATUS } from '@/backend/constants';
 * ```
 *
 * @module Constants
 */

// API Constants
export {
  HTTP_STATUS,
  ERROR_CODE,
  API_MESSAGE,
  API_HEADERS,
  CONTENT_TYPE,
  API_VERSION,
  REQUEST_TIMEOUT,
  PAGINATION,
  CORS_CONFIG,
} from './api.constants';

// Cache Constants
export {
  CACHE_TTL,
  CACHE_KEY_PREFIX,
  CACHE_KEY_SEPARATOR,
  RECENT_DATA_WINDOW,
  REDIS_CONFIG,
  CACHE_STRATEGY,
  CACHE_LIMITS,
} from './cache.constants';

// Collector Constants
export {
  BINANCE_API,
  RATE_LIMITING,
  ORDER_BOOK_CONFIG,
  COLLECTION_SCHEDULE,
  DEFAULT_COLLECTION_SYMBOLS,
  COLLECTOR_STATS,
  BINANCE_HEADERS,
} from './collector.constants';

// Database Constants
export {
  BATCH_CONFIG,
  QUERY_LIMITS,
  DB_TIMEOUT,
  CONNECTION_POOL,
  PRISMA_LOGGING,
  RETENTION_POLICY,
  TIMESCALE_CONFIG,
  INDEX_STRATEGY,
  SNAPSHOT_TABLE,
  ISOLATION_LEVEL,
} from './database.constants';

// Depth Constants
export {
  TRADING_DEPTHS,
  DEFAULT_DEPTH,
  MIN_DEPTH,
  MAX_DEPTH,
  isValidDepth,
  getClosestDepth,
} from './depths.constants';

// Re-export types
export type { TradingDepth } from './depths.constants';
