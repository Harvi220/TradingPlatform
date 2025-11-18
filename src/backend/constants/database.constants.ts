/**
 * Database Constants
 *
 * Configuration for database operations including Prisma,
 * batch operations, query limits, and timeouts.
 *
 * @module DatabaseConstants
 */

/**
 * Batch Operation Configuration
 * Used for efficient bulk inserts and updates
 */
export const BATCH_CONFIG = {
  /**
   * Number of records to batch before writing to database
   * @default 50
   */
  SIZE: 50,

  /**
   * Maximum time to wait before flushing batch (milliseconds)
   * @default 60000ms - 60 seconds
   */
  INTERVAL_MS: 60000,

  /**
   * Maximum batch size (safety limit)
   * @default 1000
   */
  MAX_SIZE: 1000,
} as const;

/**
 * Query Limits
 * Default and maximum limits for database queries
 */
export const QUERY_LIMITS = {
  /**
   * Default number of records to return
   * @default 100
   */
  DEFAULT: 100,

  /**
   * Maximum number of records allowed in a single query
   * Prevents memory overflow
   * @default 10000
   */
  MAX: 10000,

  /**
   * Default limit for snapshot queries
   * Approximately 1 hour of data (60 snapshots/hour)
   * @default 3600
   */
  SNAPSHOTS_DEFAULT: 3600,

  /**
   * Maximum limit for snapshot queries
   * @default 43200 (30 days at 1 snapshot/minute)
   */
  SNAPSHOTS_MAX: 43200,
} as const;

/**
 * Database Timeout Configuration
 */
export const DB_TIMEOUT = {
  /**
   * Query timeout (milliseconds)
   * @default 30000ms - 30 seconds
   */
  QUERY_MS: 30000,

  /**
   * Transaction timeout (milliseconds)
   * @default 60000ms - 60 seconds
   */
  TRANSACTION_MS: 60000,

  /**
   * Connection timeout (milliseconds)
   * @default 10000ms - 10 seconds
   */
  CONNECTION_MS: 10000,
} as const;

/**
 * Prisma Connection Pool
 */
export const CONNECTION_POOL = {
  /**
   * Minimum number of connections in pool
   * @default 2
   */
  MIN: 2,

  /**
   * Maximum number of connections in pool
   * @default 10
   */
  MAX: 10,

  /**
   * Connection idle timeout (seconds)
   * @default 300 - 5 minutes
   */
  IDLE_TIMEOUT_SECONDS: 300,
} as const;

/**
 * Prisma Logging Configuration
 */
export const PRISMA_LOGGING = {
  /**
   * Log levels for development
   */
  DEVELOPMENT: ['query', 'error', 'warn'] as const,

  /**
   * Log levels for production
   */
  PRODUCTION: ['error'] as const,
} as const;

/**
 * Data Retention Policies
 * How long to keep different types of data
 */
export const RETENTION_POLICY = {
  /**
   * Keep raw snapshots for N days
   * @default 60 days
   */
  SNAPSHOTS_DAYS: 60,

  /**
   * Keep aggregated data for N days
   * @default 365 days - 1 year
   */
  AGGREGATES_DAYS: 365,

  /**
   * Keep logs for N days
   * @default 30 days
   */
  LOGS_DAYS: 30,
} as const;

/**
 * TimescaleDB Specific Configuration
 */
export const TIMESCALE_CONFIG = {
  /**
   * Hypertable chunk interval (time)
   * Data is partitioned by this interval
   * @default '1 day'
   */
  CHUNK_INTERVAL: '1 day',

  /**
   * Compression policy - compress data older than N days
   * @default 14 days
   */
  COMPRESSION_AFTER_DAYS: 14,

  /**
   * Retention policy - delete data older than N days
   * @default 60 days
   */
  RETENTION_DAYS: 60,

  /**
   * Continuous aggregate refresh interval
   * @default '1 hour'
   */
  AGGREGATE_REFRESH_INTERVAL: '1 hour',
} as const;

/**
 * Database Index Strategy
 */
export const INDEX_STRATEGY = {
  /**
   * Rebuild indexes after N operations
   * @default 100000
   */
  REBUILD_AFTER: 100000,

  /**
   * Analyze tables after N operations
   * Updates query planner statistics
   * @default 50000
   */
  ANALYZE_AFTER: 50000,
} as const;

/**
 * Snapshot Table Configuration
 */
export const SNAPSHOT_TABLE = {
  /**
   * Table name
   */
  NAME: 'snapshots',

  /**
   * Unique constraint fields
   * Prevents duplicate snapshots
   */
  UNIQUE_FIELDS: ['timestamp', 'symbol', 'marketType', 'depth'] as const,

  /**
   * Indexed fields for fast queries
   */
  INDEXED_FIELDS: ['symbol', 'marketType', 'depth', 'timestamp'] as const,
} as const;

/**
 * Transaction Isolation Levels
 */
export const ISOLATION_LEVEL = {
  /**
   * Default isolation level
   */
  DEFAULT: 'ReadCommitted' as const,

  /**
   * For critical operations
   */
  SERIALIZABLE: 'Serializable' as const,
} as const;
