/**
 * Binance Data Collector Constants
 *
 * Configuration for the REST API collector that fetches order book data
 * from Binance SPOT and FUTURES markets.
 *
 * @module CollectorConstants
 */

/**
 * Binance API Endpoints
 */
export const BINANCE_API = {
  SPOT: {
    BASE_URL: 'https://api.binance.com/api/v3',
    DEPTH_ENDPOINT: 'https://api.binance.com/api/v3/depth',
  },
  FUTURES: {
    BASE_URL: 'https://fapi.binance.com/fapi/v1',
    DEPTH_ENDPOINT: 'https://fapi.binance.com/fapi/v1/depth',
  },
} as const;

/**
 * Rate Limiting Configuration
 * To avoid hitting Binance API rate limits
 */
export const RATE_LIMITING = {
  /**
   * Delay between consecutive API requests (milliseconds)
   * @default 300ms - allows ~3 requests per second
   */
  REQUEST_DELAY_MS: 300,

  /**
   * Maximum number of retries for failed requests
   * @default 3
   */
  MAX_RETRIES: 3,

  /**
   * Delay before retry attempt (milliseconds)
   * @default 1000ms - 1 second
   */
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Order Book Request Configuration
 */
export const ORDER_BOOK_CONFIG = {
  /**
   * Number of price levels to request
   * Weight: limit=500 → weight=5
   * @default 500
   */
  LIMIT: 500,

  /**
   * Request timeout (milliseconds)
   * @default 10000ms - 10 seconds
   */
  TIMEOUT_MS: 10000,
} as const;

/**
 * Collection Scheduling
 */
export const COLLECTION_SCHEDULE = {
  /**
   * Interval between collection cycles (milliseconds)
   * @default 60000ms - 1 minute
   */
  INTERVAL_MS: 60000,

  /**
   * Timestamp rounding interval (milliseconds)
   * Round to nearest minute for consistent storage
   * @default 60000ms - 1 minute
   */
  TIMESTAMP_ROUND_MS: 60000,
} as const;

/**
 * Default symbols for collection
 */
export const DEFAULT_COLLECTION_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'ADAUSDT',
] as const;

/**
 * Collector Statistics
 */
export const COLLECTOR_STATS = {
  /**
   * Whether to track detailed statistics
   * @default true
   */
  ENABLED: true,

  /**
   * Log statistics every N collections
   * @default 10
   */
  LOG_INTERVAL: 10,
} as const;

/**
 * HTTP Headers for Binance API requests
 */
export const BINANCE_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;
