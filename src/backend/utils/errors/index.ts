/**
 * Error Utilities Index
 *
 * Central export point for error handling utilities.
 * Import error utilities from this file to ensure consistency.
 *
 * @example
 * ```typescript
 * import {
 *   AppError,
 *   createValidationError,
 *   createDatabaseError,
 *   wrapError
 * } from '@/backend/utils/errors';
 * ```
 *
 * @module ErrorUtils
 */

// Export AppError class
export { AppError } from './AppError';

// Export all factory functions
export {
  createValidationError,
  createMissingParamsError,
  createInvalidSymbolError,
  createInvalidDepthError,
  createInvalidMarketTypeError,
  createInvalidDateRangeError,
  createDatabaseError,
  createQueryFailedError,
  createRedisError,
  createCacheWriteFailedError,
  createBinanceApiError,
  createBinanceTimeoutError,
  createCollectorError,
  createCollectorNotRunningError,
  createCollectorAlreadyRunningError,
  createInternalError,
  wrapError,
} from './errorFactory';
