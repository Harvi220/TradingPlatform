/**
 * Configuration Types
 *
 * Type definitions for application configuration and environment variables.
 *
 * @module ConfigTypes
 */

/**
 * Node environment type
 */
export type NodeEnvironment = 'development' | 'production' | 'test';

/**
 * Market type for trading
 */
export type MarketType = 'SPOT' | 'FUTURES';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Environment Configuration
 * All environment variables with types
 */
export interface EnvironmentConfig {
  /**
   * Node environment
   * @default 'development'
   */
  NODE_ENV: NodeEnvironment;

  /**
   * API base URL
   */
  API_BASE_URL: string;

  /**
   * PostgreSQL database URL
   */
  DATABASE_URL: string;

  /**
   * Redis connection URL
   */
  REDIS_URL: string;

  /**
   * Binance SPOT WebSocket URL
   */
  BINANCE_SPOT_WS_URL: string;

  /**
   * Binance FUTURES WebSocket URL
   */
  BINANCE_FUTURES_WS_URL: string;

  /**
   * CORS allowed origins (comma-separated)
   */
  ALLOWED_ORIGINS: string;

  /**
   * Log level
   * @default 'info'
   */
  LOG_LEVEL?: LogLevel;

  /**
   * Enable debug mode
   * @default false
   */
  DEBUG?: boolean;
}

/**
 * Database Configuration
 */
export interface DatabaseConfig {
  /**
   * Connection URL
   */
  url: string;

  /**
   * Connection pool size
   */
  poolSize?: number;

  /**
   * Connection timeout (ms)
   */
  timeout?: number;

  /**
   * Enable query logging
   */
  logging?: boolean;

  /**
   * SSL configuration
   */
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
  };
}

/**
 * Redis Configuration
 */
export interface RedisConfig {
  /**
   * Redis connection URL
   */
  url: string;

  /**
   * Connection timeout (ms)
   */
  timeout?: number;

  /**
   * Max retry attempts
   */
  maxRetries?: number;

  /**
   * Enable offline queue
   */
  enableOfflineQueue?: boolean;

  /**
   * Key prefix for all keys
   */
  keyPrefix?: string;
}

/**
 * Binance API Configuration
 */
export interface BinanceConfig {
  /**
   * SPOT WebSocket URL
   */
  spotWsUrl: string;

  /**
   * FUTURES WebSocket URL
   */
  futuresWsUrl: string;

  /**
   * API key (if required)
   */
  apiKey?: string;

  /**
   * API secret (if required)
   */
  apiSecret?: string;

  /**
   * Request timeout (ms)
   */
  timeout?: number;
}

/**
 * Collector Configuration
 */
export interface CollectorConfig {
  /**
   * Symbols to collect
   */
  symbols: string[];

  /**
   * Collection interval (ms)
   */
  interval: number;

  /**
   * Batch size for database writes
   */
  batchSize: number;

  /**
   * Enable automatic start on app boot
   */
  autoStart?: boolean;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  /**
   * Enable caching
   */
  enabled: boolean;

  /**
   * Default TTL (seconds)
   */
  ttl: number;

  /**
   * Enable cache warming on startup
   */
  warmOnStartup?: boolean;

  /**
   * Cache strategy
   */
  strategy?: {
    writeThrough?: boolean;
    readThrough?: boolean;
  };
}

/**
 * Application Configuration
 * Complete app configuration combining all parts
 */
export interface AppConfig {
  /**
   * Environment
   */
  env: NodeEnvironment;

  /**
   * Database configuration
   */
  database: DatabaseConfig;

  /**
   * Redis configuration
   */
  redis: RedisConfig;

  /**
   * Binance API configuration
   */
  binance: BinanceConfig;

  /**
   * Collector configuration
   */
  collector: CollectorConfig;

  /**
   * Cache configuration
   */
  cache: CacheConfig;

  /**
   * CORS configuration
   */
  cors?: {
    allowedOrigins: string[];
    allowedMethods?: string[];
    allowedHeaders?: string[];
  };

  /**
   * Logging configuration
   */
  logging?: {
    level: LogLevel;
    format?: 'json' | 'text';
    destination?: 'console' | 'file';
  };
}

/**
 * Configuration Validation Result
 */
export interface ConfigValidationResult {
  /**
   * Whether configuration is valid
   */
  valid: boolean;

  /**
   * Validation errors (if any)
   */
  errors?: string[];

  /**
   * Missing required fields
   */
  missing?: string[];

  /**
   * Invalid field values
   */
  invalid?: Array<{
    field: string;
    value: any;
    reason: string;
  }>;
}

/**
 * Type guard to check if environment is production
 */
export function isProduction(env: NodeEnvironment): env is 'production' {
  return env === 'production';
}

/**
 * Type guard to check if environment is development
 */
export function isDevelopment(env: NodeEnvironment): env is 'development' {
  return env === 'development';
}

/**
 * Type guard to check if market type is SPOT
 */
export function isSpotMarket(type: MarketType): type is 'SPOT' {
  return type === 'SPOT';
}

/**
 * Type guard to check if market type is FUTURES
 */
export function isFuturesMarket(type: MarketType): type is 'FUTURES' {
  return type === 'FUTURES';
}
