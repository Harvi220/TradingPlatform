/**
 * Backend Types Index
 *
 * Central export point for all backend type definitions.
 * Import types from this file to ensure consistency.
 *
 * @example
 * ```typescript
 * import {
 *   AppErrorData,
 *   EnvironmentConfig,
 *   CachedSnapshot,
 *   SnapshotInput
 * } from '@/backend/types';
 * ```
 *
 * @module BackendTypes
 */

// ============================================================================
// Existing Types (re-exported)
// ============================================================================

// Binance types
export type {
  BinanceDepthUpdate,
  BinanceDepthSnapshot,
  WebSocketConfig,
  WebSocketStatus,
  WebSocketEvent,
} from './binance.types';

// Indicator types
export type {
  DiffIndicator,
  DiffIndicators,
  TotalIndicator,
  TotalConfig,
} from './indicators.types';

// Order book types
export type {
  Order,
  OrderBook,
  PriceRange,
  DepthVolumes,
} from './orderBook.types';

// ============================================================================
// Error Types
// ============================================================================

export type {
  ErrorCode,
  HttpStatus,
  AppErrorData,
  ValidationErrorDetails,
  DatabaseErrorDetails,
  RedisErrorDetails,
  ExternalApiErrorDetails,
  ErrorContext,
  ErrorHandlerOptions,
  ErrorResponse,
} from './errors.types';

export {
  isAppError,
  hasValidationDetails,
  hasDatabaseDetails,
  hasRedisDetails,
} from './errors.types';

// ============================================================================
// Configuration Types
// ============================================================================

export type {
  NodeEnvironment,
  MarketType,
  LogLevel,
  EnvironmentConfig,
  DatabaseConfig,
  RedisConfig,
  BinanceConfig,
  CollectorConfig,
  CacheConfig,
  AppConfig,
  ConfigValidationResult,
} from './config.types';

export {
  isProduction,
  isDevelopment,
  isSpotMarket,
  isFuturesMarket,
} from './config.types';

// ============================================================================
// Redis Types
// ============================================================================

export type {
  RedisValue,
  RedisKey,
  RedisTTL,
  RedisScore,
  CachedSnapshot,
  CachedQueryResult,
  RedisSortedSetMember,
  RedisCacheEntry,
  RedisOperationResult,
  RedisConnectionStatus,
  RedisStatistics,
  CacheWriteOptions,
  CacheReadOptions,
  CacheDeleteOptions,
  SortedSetRangeOptions,
  BatchCacheOperation,
} from './redis.types';

export {
  isCachedSnapshot,
  isCachedQueryResult,
} from './redis.types';

// ============================================================================
// Service Types
// ============================================================================

export type {
  SnapshotInput,
  SnapshotQuery,
  SnapshotData,
  CollectorStatistics,
  ServiceResult,
  BatchWriteResult,
  QueryOptions,
  PaginatedResult,
  AggregationOptions,
  HealthCheckResult,
  ServiceEvent,
} from './service.types';

export {
  isSuccessResult,
  isErrorResult,
} from './service.types';
