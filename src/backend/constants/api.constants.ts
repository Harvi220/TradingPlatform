/**
 * API Constants
 *
 * HTTP status codes, error codes, response formats,
 * and other API-related constants.
 *
 * @module ApiConstants
 */

/**
 * HTTP Status Codes
 * Standard HTTP response status codes used in API responses
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * API Error Codes
 * Application-specific error codes for better error handling
 */
export const ERROR_CODE = {
  // Validation Errors
  INVALID_DATA: 'INVALID_DATA',
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  INVALID_DEPTH: 'INVALID_DEPTH',
  INVALID_MARKET_TYPE: 'INVALID_MARKET_TYPE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',

  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // Cache Errors
  REDIS_ERROR: 'REDIS_ERROR',
  CACHE_MISS: 'CACHE_MISS',
  CACHE_WRITE_FAILED: 'CACHE_WRITE_FAILED',

  // External API Errors
  BINANCE_API_ERROR: 'BINANCE_API_ERROR',
  BINANCE_RATE_LIMIT: 'BINANCE_RATE_LIMIT',
  BINANCE_TIMEOUT: 'BINANCE_TIMEOUT',

  // Service Errors
  COLLECTOR_ERROR: 'COLLECTOR_ERROR',
  COLLECTOR_NOT_RUNNING: 'COLLECTOR_NOT_RUNNING',
  COLLECTOR_ALREADY_RUNNING: 'COLLECTOR_ALREADY_RUNNING',

  // Generic Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * API Response Messages
 */
export const API_MESSAGE = {
  // Success Messages
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Collector Messages
  COLLECTOR_STARTED: 'Collector started successfully',
  COLLECTOR_STOPPED: 'Collector stopped successfully',
  SYMBOLS_ADDED: 'Symbols added to collection',
  SYMBOLS_REMOVED: 'Symbols removed from collection',

  // Data Messages
  SNAPSHOTS_SAVED: 'Snapshots saved successfully',
  DATA_RETRIEVED: 'Data retrieved successfully',

  // Error Messages
  INVALID_REQUEST: 'Invalid request parameters',
  RESOURCE_NOT_FOUND: 'Requested resource not found',
  INTERNAL_ERROR: 'Internal server error occurred',
} as const;

/**
 * API Request/Response Headers
 */
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
  X_REQUEST_ID: 'X-Request-ID',
  X_API_VERSION: 'X-API-Version',
} as const;

/**
 * Content Types
 */
export const CONTENT_TYPE = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
} as const;

/**
 * API Versioning
 */
export const API_VERSION = {
  CURRENT: 'v1',
  SUPPORTED: ['v1'] as const,
} as const;

/**
 * Request Timeout Configuration
 */
export const REQUEST_TIMEOUT = {
  /**
   * Default API request timeout (milliseconds)
   * @default 30000ms - 30 seconds
   */
  DEFAULT_MS: 30000,

  /**
   * Long-running operation timeout (milliseconds)
   * @default 60000ms - 60 seconds
   */
  LONG_MS: 60000,

  /**
   * Short operation timeout (milliseconds)
   * @default 5000ms - 5 seconds
   */
  SHORT_MS: 5000,
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  /**
   * Default page size
   * @default 100
   */
  DEFAULT_LIMIT: 100,

  /**
   * Maximum page size
   * @default 1000
   */
  MAX_LIMIT: 1000,

  /**
   * Minimum page size
   * @default 1
   */
  MIN_LIMIT: 1,
} as const;

/**
 * CORS Configuration
 */
export const CORS_CONFIG = {
  /**
   * Allowed HTTP methods
   */
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as const,

  /**
   * Allowed headers
   */
  ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
  ] as const,

  /**
   * Max age for preflight cache (seconds)
   * @default 86400 - 24 hours
   */
  MAX_AGE: 86400,
} as const;
