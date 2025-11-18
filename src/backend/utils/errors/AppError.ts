/**
 * Application Error Class
 *
 * Custom error class that extends the native Error with additional
 * metadata for consistent error handling across the application.
 *
 * @module AppError
 */

import { ERROR_CODE, HTTP_STATUS } from '@/backend/constants';
import type { ErrorCode, HttpStatus, AppErrorData } from '@/backend/types';

/**
 * Application Error Class
 * Standardized error with error code, HTTP status, and additional details
 *
 * @example
 * ```typescript
 * throw new AppError(
 *   ERROR_CODE.INVALID_DATA,
 *   'Symbol is required',
 *   HTTP_STATUS.BAD_REQUEST,
 *   { field: 'symbol' }
 * );
 * ```
 */
export class AppError extends Error {
  /**
   * Error code (e.g., 'INVALID_DATA', 'DATABASE_ERROR')
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code for the response
   */
  public readonly httpStatus: HttpStatus;

  /**
   * Additional error details
   */
  public readonly details?: any;

  /**
   * Timestamp when error was created
   */
  public readonly timestamp: number;

  /**
   * Whether this is an operational error (expected) vs programming error (bug)
   */
  public readonly isOperational: boolean;

  /**
   * Create a new AppError
   *
   * @param code - Error code
   * @param message - Human-readable error message
   * @param httpStatus - HTTP status code (default: 500)
   * @param details - Additional error details (optional)
   * @param isOperational - Whether error is operational (default: true)
   */
  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: any,
    isOperational = true
  ) {
    super(message);

    // Set the prototype explicitly (for TypeScript)
    Object.setPrototypeOf(this, AppError.prototype);

    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.timestamp = Date.now();
    this.isOperational = isOperational;

    // Capture stack trace (excluding constructor call from stack trace)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format
   * @returns Error data object
   */
  toJSON(): AppErrorData {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Convert error to string
   * @returns String representation of error
   */
  toString(): string {
    return `[${this.code}] ${this.message}${
      this.details ? ` | Details: ${JSON.stringify(this.details)}` : ''
    }`;
  }

  /**
   * Create AppError from unknown error
   *
   * @param error - Unknown error object
   * @returns AppError instance
   *
   * @example
   * ```typescript
   * try {
   *   // some operation
   * } catch (error) {
   *   throw AppError.from(error);
   * }
   * ```
   */
  static from(error: unknown): AppError {
    // If already AppError, return as is
    if (error instanceof AppError) {
      return error;
    }

    // If standard Error, wrap it
    if (error instanceof Error) {
      return new AppError(
        ERROR_CODE.INTERNAL_ERROR,
        error.message,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { originalError: error.name },
        false // Programming error
      );
    }

    // For unknown errors, create generic error
    return new AppError(
      ERROR_CODE.UNKNOWN_ERROR,
      'An unknown error occurred',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      { originalError: String(error) },
      false
    );
  }

  /**
   * Check if error is AppError instance
   *
   * @param error - Error to check
   * @returns True if error is AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Check if error is operational (expected error)
   *
   * @param error - Error to check
   * @returns True if error is operational
   */
  static isOperational(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}
