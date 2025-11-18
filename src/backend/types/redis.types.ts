/**
 * Redis Types
 *
 * Type definitions for Redis cache operations and data structures.
 *
 * @module RedisTypes
 */

import { MarketType } from './config.types';

/**
 * Redis value type - can be string or JSON object
 */
export type RedisValue = string | number | object;

/**
 * Redis key type
 */
export type RedisKey = string;

/**
 * Redis TTL type (seconds)
 */
export type RedisTTL = number;

/**
 * Redis score for sorted sets
 */
export type RedisScore = number;

/**
 * Cached Snapshot Data
 * Structure stored in Redis for snapshot cache
 */
export interface CachedSnapshot {
  /**
   * Timestamp of snapshot
   */
  timestamp: number;

  /**
   * Trading symbol
   */
  symbol: string;

  /**
   * Market type
   */
  marketType: MarketType;

  /**
   * Depth percentage
   */
  depth: number;

  /**
   * BID volume
   */
  bidVolume: number;

  /**
   * ASK volume
   */
  askVolume: number;

  /**
   * BID volume in USD
   */
  bidVolumeUsd: number;

  /**
   * ASK volume in USD
   */
  askVolumeUsd: number;
}

/**
 * Cached Query Result
 * Structure for cached query results
 */
export interface CachedQueryResult {
  /**
   * Query parameters hash
   */
  queryHash: string;

  /**
   * Result data
   */
  data: any[];

  /**
   * Number of results
   */
  count: number;

  /**
   * Cache timestamp
   */
  cachedAt: number;

  /**
   * Time to live (seconds)
   */
  ttl: number;
}

/**
 * Redis Sorted Set Member
 */
export interface RedisSortedSetMember {
  /**
   * Score (timestamp for time-series data)
   */
  score: number;

  /**
   * Value (serialized data)
   */
  value: string;
}

/**
 * Redis Cache Entry
 * Generic cache entry structure
 */
export interface RedisCacheEntry<T = any> {
  /**
   * Cache key
   */
  key: RedisKey;

  /**
   * Cached value
   */
  value: T;

  /**
   * TTL in seconds
   */
  ttl: RedisTTL;

  /**
   * When the entry was cached
   */
  cachedAt?: number;
}

/**
 * Redis Operation Result
 * Result of a Redis operation
 */
export interface RedisOperationResult<T = any> {
  /**
   * Whether operation was successful
   */
  success: boolean;

  /**
   * Result data (if successful)
   */
  data?: T;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Operation duration in ms
   */
  duration?: number;
}

/**
 * Redis Connection Status
 */
export interface RedisConnectionStatus {
  /**
   * Whether connected
   */
  connected: boolean;

  /**
   * Connection uptime (ms)
   */
  uptime?: number;

  /**
   * Last error (if any)
   */
  lastError?: string;

  /**
   * Reconnect attempts
   */
  reconnectAttempts?: number;
}

/**
 * Redis Statistics
 */
export interface RedisStatistics {
  /**
   * Total commands executed
   */
  totalCommands: number;

  /**
   * Cache hits
   */
  hits: number;

  /**
   * Cache misses
   */
  misses: number;

  /**
   * Hit rate (percentage)
   */
  hitRate: number;

  /**
   * Used memory (bytes)
   */
  usedMemory?: number;

  /**
   * Number of keys
   */
  keyCount?: number;
}

/**
 * Cache Write Options
 */
export interface CacheWriteOptions {
  /**
   * TTL in seconds
   */
  ttl?: number;

  /**
   * Overwrite if exists
   */
  overwrite?: boolean;

  /**
   * Only set if not exists
   */
  nx?: boolean;

  /**
   * Only set if exists
   */
  xx?: boolean;
}

/**
 * Cache Read Options
 */
export interface CacheReadOptions {
  /**
   * Update TTL on read
   */
  refreshTtl?: boolean;

  /**
   * Default value if key not found
   */
  defaultValue?: any;

  /**
   * Parse JSON automatically
   */
  parseJson?: boolean;
}

/**
 * Cache Delete Options
 */
export interface CacheDeleteOptions {
  /**
   * Pattern matching for keys
   */
  pattern?: string;

  /**
   * Delete multiple keys
   */
  multi?: boolean;
}

/**
 * Sorted Set Range Options
 */
export interface SortedSetRangeOptions {
  /**
   * Minimum score (inclusive)
   */
  min: number;

  /**
   * Maximum score (inclusive)
   */
  max: number;

  /**
   * Limit number of results
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Include scores in result
   */
  withScores?: boolean;
}

/**
 * Batch Cache Operation
 */
export interface BatchCacheOperation {
  /**
   * Operation type
   */
  type: 'set' | 'get' | 'delete';

  /**
   * Cache key
   */
  key: RedisKey;

  /**
   * Value (for set operations)
   */
  value?: any;

  /**
   * TTL (for set operations)
   */
  ttl?: number;
}

/**
 * Type guard to check if value is CachedSnapshot
 */
export function isCachedSnapshot(value: any): value is CachedSnapshot {
  return (
    value &&
    typeof value === 'object' &&
    'timestamp' in value &&
    'symbol' in value &&
    'marketType' in value &&
    'depth' in value &&
    'bidVolume' in value &&
    'askVolume' in value
  );
}

/**
 * Type guard to check if value is CachedQueryResult
 */
export function isCachedQueryResult(value: any): value is CachedQueryResult {
  return (
    value &&
    typeof value === 'object' &&
    'queryHash' in value &&
    'data' in value &&
    Array.isArray(value.data) &&
    'cachedAt' in value
  );
}
