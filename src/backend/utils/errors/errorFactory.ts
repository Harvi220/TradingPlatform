/**
 * Error Factory Functions
 *
 * Factory functions for creating specific types of errors
 * with consistent error codes and messages.
 *
 * @module ErrorFactory
 */

import { ERROR_CODE, HTTP_STATUS } from '@/backend/constants';
import { AppError } from './AppError';
import type {
  ValidationErrorDetails,
  DatabaseErrorDetails,
  RedisErrorDetails,
  ExternalApiErrorDetails,
} from '@/backend/types';

/**
 * Create a validation error
 *
 * @param message - Error message
 * @param field - Field that failed validation
 * @param rule - Validation rule that failed
 * @param expected - Expected value or format
 * @param received - Actual value received
 * @returns AppError instance
 *
 * @example
 * ```typescript
 * throw createValidationError(
 *   'Symbol is required',
 *   'symbol',
 *   'required'
 * );
 * ```
 */
export function createValidationError(
  message: string,
  field: string,
  rule: string,
  expected?: string,
  received?: any
): AppError {
  const details: ValidationErrorDetails = {
    field,
    rule,
    expected,
    received,
  };

  return new AppError(
    ERROR_CODE.INVALID_DATA,
    message,
    HTTP_STATUS.BAD_REQUEST,
    details
  );
}

/**
 * Create a missing parameters error
 *
 * @param missingParams - Array of missing parameter names
 * @returns AppError instance
 *
 * @example
 * ```typescript
 * throw createMissingParamsError(['symbol', 'depth']);
 * ```
 */
export function createMissingParamsError(missingParams: string[]): AppError {
  return new AppError(
    ERROR_CODE.MISSING_PARAMS,
    `Missing required parameters: ${missingParams.join(', ')}`,
    HTTP_STATUS.BAD_REQUEST,
    { missing: missingParams }
  );
}

/**
 * Create an invalid symbol error
 *
 * @param symbol - Invalid symbol
 * @returns AppError instance
 */
export function createInvalidSymbolError(symbol: string): AppError {
  return createValidationError(
    `Invalid trading symbol: ${symbol}`,
    'symbol',
    'format',
    'Valid trading symbol (e.g., BTCUSDT)',
    symbol
  );
}

/**
 * Create an invalid depth error
 *
 * @param depth - Invalid depth value
 * @param validDepths - Array of valid depth values
 * @returns AppError instance
 */
export function createInvalidDepthError(
  depth: number,
  validDepths: readonly number[]
): AppError {
  return createValidationError(
    `Invalid depth: ${depth}. Must be one of: ${validDepths.join(', ')}`,
    'depth',
    'enum',
    validDepths.join(', '),
    depth
  );
}

/**
 * Create an invalid market type error
 *
 * @param marketType - Invalid market type
 * @returns AppError instance
 */
export function createInvalidMarketTypeError(marketType: string): AppError {
  return createValidationError(
    `Invalid market type: ${marketType}. Must be SPOT or FUTURES`,
    'marketType',
    'enum',
    'SPOT | FUTURES',
    marketType
  );
}

/**
 * Create an invalid date range error
 *
 * @param message - Error message
 * @returns AppError instance
 */
export function createInvalidDateRangeError(message: string): AppError {
  return new AppError(
    ERROR_CODE.INVALID_DATE_RANGE,
    message,
    HTTP_STATUS.BAD_REQUEST
  );
}

/**
 * Create a database error
 *
 * @param message - Error message
 * @param operation - Database operation that failed
 * @param table - Table or collection name
 * @param originalError - Original database error
 * @returns AppError instance
 *
 * @example
 * ```typescript
 * throw createDatabaseError(
 *   'Failed to insert snapshot',
 *   'insert',
 *   'snapshots',
 *   error
 * );
 * ```
 */
export function createDatabaseError(
  message: string,
  operation: DatabaseErrorDetails['operation'],
  table?: string,
  originalError?: unknown
): AppError {
  const details: DatabaseErrorDetails = {
    operation,
    table,
    originalError: originalError instanceof Error ? originalError.message : String(originalError),
  };

  return new AppError(
    ERROR_CODE.DATABASE_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  );
}

/**
 * Create a query failed error
 *
 * @param message - Error message
 * @param originalError - Original error
 * @returns AppError instance
 */
export function createQueryFailedError(
  message: string,
  originalError?: unknown
): AppError {
  return createDatabaseError(message, 'query', undefined, originalError);
}

/**
 * Create a Redis error
 *
 * @param message - Error message
 * @param operation - Redis operation that failed
 * @param key - Redis key involved
 * @param originalError - Original Redis error
 * @returns AppError instance
 *
 * @example
 * ```typescript
 * throw createRedisError(
 *   'Failed to get cached data',
 *   'get',
 *   'snapshot:BTCUSDT:SPOT:5:recent',
 *   error
 * );
 * ```
 */
export function createRedisError(
  message: string,
  operation: RedisErrorDetails['operation'],
  key?: string,
  originalError?: unknown
): AppError {
  const details: RedisErrorDetails = {
    operation,
    key,
    originalError: originalError instanceof Error ? originalError.message : String(originalError),
  };

  return new AppError(
    ERROR_CODE.REDIS_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  );
}

/**
 * Create a cache write failed error
 *
 * @param key - Cache key
 * @param originalError - Original error
 * @returns AppError instance
 */
export function createCacheWriteFailedError(
  key: string,
  originalError?: unknown
): AppError {
  return createRedisError(
    `Failed to write to cache: ${key}`,
    'set',
    key,
    originalError
  );
}

/**
 * Create a Binance API error
 *
 * @param message - Error message
 * @param endpoint - API endpoint called
 * @param statusCode - HTTP status code from API
 * @param responseBody - Response body from API
 * @returns AppError instance
 *
 * @example
 * ```typescript
 * throw createBinanceApiError(
 *   'Failed to fetch order book',
 *   '/api/v3/depth',
 *   429,
 *   { error: 'Rate limit exceeded' }
 * );
 * ```
 */
export function createBinanceApiError(
  message: string,
  endpoint: string,
  statusCode?: number,
  responseBody?: any
): AppError {
  const details: ExternalApiErrorDetails = {
    provider: 'Binance',
    endpoint,
    statusCode,
    responseBody,
  };

  const httpStatus = statusCode === 429
    ? HTTP_STATUS.TOO_MANY_REQUESTS
    : HTTP_STATUS.BAD_GATEWAY;

  return new AppError(
    statusCode === 429 ? ERROR_CODE.BINANCE_RATE_LIMIT : ERROR_CODE.BINANCE_API_ERROR,
    message,
    httpStatus,
    details
  );
}

/**
 * Create a Binance timeout error
 *
 * @param endpoint - API endpoint that timed out
 * @param timeout - Timeout duration in ms
 * @returns AppError instance
 */
export function createBinanceTimeoutError(
  endpoint: string,
  timeout: number
): AppError {
  return new AppError(
    ERROR_CODE.BINANCE_TIMEOUT,
    `Binance API request timed out after ${timeout}ms`,
    HTTP_STATUS.GATEWAY_TIMEOUT,
    { endpoint, timeout }
  );
}

/**
 * Create a collector error
 *
 * @param message - Error message
 * @param details - Additional details
 * @returns AppError instance
 */
export function createCollectorError(message: string, details?: any): AppError {
  return new AppError(
    ERROR_CODE.COLLECTOR_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  );
}

/**
 * Create a collector not running error
 *
 * @returns AppError instance
 */
export function createCollectorNotRunningError(): AppError {
  return new AppError(
    ERROR_CODE.COLLECTOR_NOT_RUNNING,
    'Collector is not currently running',
    HTTP_STATUS.CONFLICT
  );
}

/**
 * Create a collector already running error
 *
 * @returns AppError instance
 */
export function createCollectorAlreadyRunningError(): AppError {
  return new AppError(
    ERROR_CODE.COLLECTOR_ALREADY_RUNNING,
    'Collector is already running',
    HTTP_STATUS.CONFLICT
  );
}

/**
 * Create a generic internal error
 *
 * @param message - Error message
 * @param originalError - Original error
 * @returns AppError instance
 */
export function createInternalError(
  message: string,
  originalError?: unknown
): AppError {
  return new AppError(
    ERROR_CODE.INTERNAL_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    { originalError: originalError instanceof Error ? originalError.message : String(originalError) }
  );
}

/**
 * Wrap unknown error in AppError
 *
 * @param error - Unknown error
 * @param defaultMessage - Default message if error has no message
 * @returns AppError instance
 */
export function wrapError(error: unknown, defaultMessage = 'An error occurred'): AppError {
  if (AppError.isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createInternalError(error.message || defaultMessage, error);
  }

  return createInternalError(defaultMessage, error);
}
