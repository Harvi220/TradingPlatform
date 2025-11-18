/**
 * Error Types and Interfaces
 *
 * Defines standardized error types for consistent error handling
 * across the application.
 *
 * @module ErrorTypes
 */

import { ERROR_CODE, HTTP_STATUS } from '@/backend/constants';

/**
 * Error code type - all possible error codes in the application
 */
export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];

/**
 * HTTP status code type
 */
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * Application Error Interface
 * Standardized error structure for API responses
 */
export interface AppErrorData {
  /**
   * Error code (e.g., 'INVALID_DATA', 'DATABASE_ERROR')
   */
  code: ErrorCode;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code
   */
  httpStatus: HttpStatus;

  /**
   * Additional error details (optional)
   */
  details?: any;

  /**
   * Timestamp when error occurred
   */
  timestamp?: number;

  /**
   * Stack trace (only in development)
   */
  stack?: string;
}

/**
 * Validation Error Details
 * Used when input validation fails
 */
export interface ValidationErrorDetails {
  /**
   * Field that failed validation
   */
  field: string;

  /**
   * Validation rule that failed
   */
  rule: string;

  /**
   * Expected value or format
   */
  expected?: string;

  /**
   * Actual value received
   */
  received?: any;
}

/**
 * Database Error Details
 * Additional context for database errors
 */
export interface DatabaseErrorDetails {
  /**
   * Database operation that failed
   */
  operation: 'query' | 'insert' | 'update' | 'delete' | 'transaction';

  /**
   * Table or collection name
   */
  table?: string;

  /**
   * Original database error message
   */
  originalError?: string;
}

/**
 * Redis Error Details
 * Additional context for cache errors
 */
export interface RedisErrorDetails {
  /**
   * Redis operation that failed
   */
  operation: 'get' | 'set' | 'delete' | 'zadd' | 'zrange' | 'expire';

  /**
   * Redis key involved
   */
  key?: string;

  /**
   * Original Redis error message
   */
  originalError?: string;
}

/**
 * External API Error Details
 * For errors from third-party APIs (e.g., Binance)
 */
export interface ExternalApiErrorDetails {
  /**
   * API provider name
   */
  provider: string;

  /**
   * API endpoint called
   */
  endpoint: string;

  /**
   * HTTP status code from API
   */
  statusCode?: number;

  /**
   * Response body from API
   */
  responseBody?: any;

  /**
   * Rate limit information
   */
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt?: number;
  };
}

/**
 * Error Context
 * Additional context that can be attached to any error
 */
export interface ErrorContext {
  /**
   * User ID (if applicable)
   */
  userId?: string;

  /**
   * Request ID for tracing
   */
  requestId?: string;

  /**
   * Service or component where error occurred
   */
  component?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Error Handler Options
 * Configuration for error handling behavior
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to log the error
   */
  log?: boolean;

  /**
   * Whether to include stack trace
   */
  includeStack?: boolean;

  /**
   * Whether to notify external error tracking service
   */
  notify?: boolean;

  /**
   * Custom error transformer
   */
  transform?: (error: any) => AppErrorData;
}

/**
 * Error Response
 * Standard API error response format
 */
export interface ErrorResponse {
  /**
   * Always false for error responses
   */
  success: false;

  /**
   * Error information
   */
  error: AppErrorData;

  /**
   * Response timestamp
   */
  timestamp: number;
}

/**
 * Type guard to check if error is AppErrorData
 */
export function isAppError(error: any): error is AppErrorData {
  return (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'httpStatus' in error
  );
}

/**
 * Type guard to check if error has validation details
 */
export function hasValidationDetails(
  error: AppErrorData
): error is AppErrorData & { details: ValidationErrorDetails } {
  return (
    isAppError(error) &&
    error.details &&
    'field' in error.details &&
    'rule' in error.details
  );
}

/**
 * Type guard to check if error has database details
 */
export function hasDatabaseDetails(
  error: AppErrorData
): error is AppErrorData & { details: DatabaseErrorDetails } {
  return (
    isAppError(error) &&
    error.details &&
    'operation' in error.details &&
    ['query', 'insert', 'update', 'delete', 'transaction'].includes(
      error.details.operation
    )
  );
}

/**
 * Type guard to check if error has Redis details
 */
export function hasRedisDetails(
  error: AppErrorData
): error is AppErrorData & { details: RedisErrorDetails } {
  return (
    isAppError(error) &&
    error.details &&
    'operation' in error.details &&
    ['get', 'set', 'delete', 'zadd', 'zrange', 'expire'].includes(
      error.details.operation
    )
  );
}
