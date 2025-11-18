/**
 * Redis Cache Constants
 *
 * Configuration for Redis caching layer including TTLs,
 * key patterns, and cache strategies.
 *
 * @module CacheConstants
 */

/**
 * Cache Time-To-Live (TTL) values in seconds
 */
export const CACHE_TTL = {
  /**
   * Recent snapshots cache (2 hours)
   * Used for hot data that's frequently accessed
   * @default 7200 seconds - 2 hours
   */
  RECENT_SNAPSHOTS: 7200,

  /**
   * Query results cache (30 minutes)
   * Cache for historical data queries
   * @default 1800 seconds - 30 minutes
   */
  QUERY_RESULTS: 1800,

  /**
   * Collector statistics cache (5 minutes)
   * @default 300 seconds - 5 minutes
   */
  COLLECTOR_STATS: 300,

  /**
   * Short-term cache for temporary data (1 minute)
   * @default 60 seconds
   */
  SHORT_TERM: 60,
} as const;

/**
 * Redis Key Prefixes
 * Used to organize and namespace different types of cached data
 */
export const CACHE_KEY_PREFIX = {
  /**
   * Prefix for snapshot data
   * Pattern: snapshot:{symbol}:{marketType}:{depth}:recent
   */
  SNAPSHOT: 'snapshot',

  /**
   * Prefix for query results
   * Pattern: query:{symbol}:{marketType}:{depth}:{type}:{from}:{to}:{limit}
   */
  QUERY: 'query',

  /**
   * Prefix for collector statistics
   * Pattern: stats:collector
   */
  STATS: 'stats',

  /**
   * Prefix for system metrics
   * Pattern: metrics:{type}
   */
  METRICS: 'metrics',
} as const;

/**
 * Cache Key Separators
 */
export const CACHE_KEY_SEPARATOR = ':';

/**
 * Recent Data Window
 * Time window for "recent" data stored in sorted sets
 */
export const RECENT_DATA_WINDOW = {
  /**
   * Keep data from last N milliseconds in hot cache
   * @default 7200000ms - 2 hours
   */
  WINDOW_MS: 2 * 60 * 60 * 1000, // 2 hours

  /**
   * Cleanup interval for old data (milliseconds)
   * @default 300000ms - 5 minutes
   */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Redis Connection Configuration
 */
export const REDIS_CONFIG = {
  /**
   * Connection retry strategy
   */
  RETRY: {
    /**
     * Maximum number of reconnection attempts
     * @default 10
     */
    MAX_ATTEMPTS: 10,

    /**
     * Initial retry delay (milliseconds)
     * @default 100ms
     */
    INITIAL_DELAY_MS: 100,

    /**
     * Maximum retry delay (milliseconds)
     * Uses exponential backoff
     * @default 5000ms - 5 seconds
     */
    MAX_DELAY_MS: 5000,
  },

  /**
   * Connection timeout (milliseconds)
   * @default 10000ms - 10 seconds
   */
  CONNECT_TIMEOUT_MS: 10000,
} as const;

/**
 * Cache Strategy Settings
 */
export const CACHE_STRATEGY = {
  /**
   * Enable write-through caching
   * Data is written to cache immediately when written to DB
   * @default true
   */
  WRITE_THROUGH: true,

  /**
   * Enable read-through caching
   * Data is cached when read from DB
   * @default true
   */
  READ_THROUGH: true,

  /**
   * Enable cache warming on startup
   * @default false (for production, enable manually)
   */
  WARM_ON_STARTUP: false,
} as const;

/**
 * Cache Size Limits
 */
export const CACHE_LIMITS = {
  /**
   * Maximum number of items in a sorted set
   * Prevents memory overflow
   * @default 10000
   */
  MAX_SORTED_SET_SIZE: 10000,

  /**
   * Maximum size of cached query results
   * @default 1000 items
   */
  MAX_QUERY_RESULT_SIZE: 1000,
} as const;
