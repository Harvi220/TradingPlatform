/**
 * Redis Key Generation Utilities
 *
 * Centralized functions for generating consistent Redis cache keys.
 * Ensures uniform key structure across the application.
 *
 * @module RedisKeys
 */

import { CACHE_KEY_PREFIX, CACHE_KEY_SEPARATOR } from '@/backend/constants';

/**
 * Parameters for snapshot cache key
 */
export interface SnapshotCacheKeyParams {
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
}

/**
 * Parameters for query cache key
 */
export interface QueryCacheKeyParams {
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
  type?: 'bid' | 'ask' | 'all';
  from?: Date | number;
  to?: Date | number;
  limit?: number;
}

/**
 * Create a Redis key for recent snapshot data
 * Pattern: snapshot:{symbol}:{marketType}:{depth}:recent
 *
 * @param params - Snapshot parameters
 * @returns Redis key string
 *
 * @example
 * ```typescript
 * createSnapshotCacheKey({
 *   symbol: 'BTCUSDT',
 *   marketType: 'SPOT',
 *   depth: 5
 * })
 * // Returns: "snapshot:BTCUSDT:SPOT:5:recent"
 * ```
 */
export function createSnapshotCacheKey(params: SnapshotCacheKeyParams): string {
  const { symbol, marketType, depth } = params;
  return [
    CACHE_KEY_PREFIX.SNAPSHOT,
    symbol.toUpperCase(),
    marketType,
    depth,
    'recent',
  ].join(CACHE_KEY_SEPARATOR);
}

/**
 * Create a Redis key for query results
 * Pattern: query:{symbol}:{marketType}:{depth}:{type}:{from}:{to}:{limit}
 *
 * @param params - Query parameters
 * @returns Redis key string
 *
 * @example
 * ```typescript
 * createQueryCacheKey({
 *   symbol: 'BTCUSDT',
 *   marketType: 'SPOT',
 *   depth: 5,
 *   type: 'bid',
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-01-02'),
 *   limit: 1000
 * })
 * // Returns: "query:BTCUSDT:SPOT:5:bid:1704067200000:1704153600000:1000"
 * ```
 */
export function createQueryCacheKey(params: QueryCacheKeyParams): string {
  const { symbol, marketType, depth, type, from, to, limit } = params;

  const fromValue = from instanceof Date ? from.getTime() : from || 'noFrom';
  const toValue = to instanceof Date ? to.getTime() : to || 'noTo';

  return [
    CACHE_KEY_PREFIX.QUERY,
    symbol.toUpperCase(),
    marketType,
    depth,
    type || 'all',
    fromValue,
    toValue,
    limit || 3600,
  ].join(CACHE_KEY_SEPARATOR);
}

/**
 * Create a Redis key for collector statistics
 * Pattern: stats:collector
 *
 * @returns Redis key string
 *
 * @example
 * ```typescript
 * createCollectorStatsKey()
 * // Returns: "stats:collector"
 * ```
 */
export function createCollectorStatsKey(): string {
  return [CACHE_KEY_PREFIX.STATS, 'collector'].join(CACHE_KEY_SEPARATOR);
}

/**
 * Create a Redis key for system metrics
 * Pattern: metrics:{type}
 *
 * @param metricType - Type of metric (e.g., 'cpu', 'memory', 'requests')
 * @returns Redis key string
 *
 * @example
 * ```typescript
 * createMetricsKey('cpu')
 * // Returns: "metrics:cpu"
 * ```
 */
export function createMetricsKey(metricType: string): string {
  return [CACHE_KEY_PREFIX.METRICS, metricType].join(CACHE_KEY_SEPARATOR);
}

/**
 * Create a generic cache key with custom prefix and parts
 *
 * @param prefix - Key prefix
 * @param parts - Key parts to join
 * @returns Redis key string
 *
 * @example
 * ```typescript
 * createCacheKey('user', ['profile', '12345'])
 * // Returns: "user:profile:12345"
 * ```
 */
export function createCacheKey(prefix: string, parts: (string | number)[]): string {
  return [prefix, ...parts].join(CACHE_KEY_SEPARATOR);
}

/**
 * Parse a snapshot cache key back to its components
 * Inverse of createSnapshotCacheKey
 *
 * @param key - Redis key to parse
 * @returns Parsed components or null if invalid
 *
 * @example
 * ```typescript
 * parseSnapshotCacheKey('snapshot:BTCUSDT:SPOT:5:recent')
 * // Returns: { symbol: 'BTCUSDT', marketType: 'SPOT', depth: 5 }
 * ```
 */
export function parseSnapshotCacheKey(
  key: string
): SnapshotCacheKeyParams | null {
  const parts = key.split(CACHE_KEY_SEPARATOR);

  if (
    parts.length !== 5 ||
    parts[0] !== CACHE_KEY_PREFIX.SNAPSHOT ||
    parts[4] !== 'recent'
  ) {
    return null;
  }

  const [, symbol, marketType, depthStr] = parts;
  const depth = parseFloat(depthStr);

  if (isNaN(depth) || !['SPOT', 'FUTURES'].includes(marketType)) {
    return null;
  }

  return {
    symbol,
    marketType: marketType as 'SPOT' | 'FUTURES',
    depth,
  };
}

/**
 * Generate a wildcard pattern for finding related keys
 *
 * @param prefix - Key prefix
 * @param pattern - Wildcard pattern parts
 * @returns Redis pattern string
 *
 * @example
 * ```typescript
 * createKeyPattern('snapshot', ['BTCUSDT', '*', '*', 'recent'])
 * // Returns: "snapshot:BTCUSDT:*:*:recent"
 * ```
 */
export function createKeyPattern(
  prefix: string,
  pattern: (string | number | '*')[]
): string {
  return [prefix, ...pattern].join(CACHE_KEY_SEPARATOR);
}

/**
 * Create pattern to find all snapshot keys for a symbol
 *
 * @param symbol - Trading symbol
 * @returns Redis pattern string
 *
 * @example
 * ```typescript
 * createSnapshotPattern('BTCUSDT')
 * // Returns: "snapshot:BTCUSDT:*:*:recent"
 * ```
 */
export function createSnapshotPattern(symbol: string): string {
  return createKeyPattern(CACHE_KEY_PREFIX.SNAPSHOT, [
    symbol.toUpperCase(),
    '*',
    '*',
    'recent',
  ]);
}

/**
 * Create pattern to find all query keys for a symbol
 *
 * @param symbol - Trading symbol
 * @returns Redis pattern string
 *
 * @example
 * ```typescript
 * createQueryPattern('BTCUSDT')
 * // Returns: "query:BTCUSDT:*"
 * ```
 */
export function createQueryPattern(symbol: string): string {
  return createKeyPattern(CACHE_KEY_PREFIX.QUERY, [symbol.toUpperCase(), '*']);
}
