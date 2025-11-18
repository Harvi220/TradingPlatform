/**
 * Service Layer Types
 *
 * Type definitions for service layer operations including
 * snapshot service, collector service, and repository interfaces.
 *
 * @module ServiceTypes
 */

import { MarketType } from './config.types';

/**
 * Snapshot Input Data
 * Data required to create a snapshot
 */
export interface SnapshotInput {
  /**
   * Snapshot timestamp
   */
  timestamp: Date;

  /**
   * Trading symbol (e.g., 'BTCUSDT')
   */
  symbol: string;

  /**
   * Market type
   */
  marketType: MarketType;

  /**
   * Depth percentage (1.5, 3, 5, 8, 15, 30)
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
 * Snapshot Query Parameters
 * Parameters for querying snapshots
 */
export interface SnapshotQuery {
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
   * Data type to retrieve
   */
  type?: 'bid' | 'ask';

  /**
   * Start date (optional)
   */
  from?: Date;

  /**
   * End date (optional)
   */
  to?: Date;

  /**
   * Maximum number of results
   */
  limit?: number;
}

/**
 * Snapshot Data
 * Retrieved snapshot data structure
 */
export interface SnapshotData {
  /**
   * Snapshot timestamp
   */
  timestamp: Date;

  /**
   * BID volume (if requested)
   */
  bidVolume?: number;

  /**
   * ASK volume (if requested)
   */
  askVolume?: number;

  /**
   * BID volume in USD (if requested)
   */
  bidVolumeUsd?: number;

  /**
   * ASK volume in USD (if requested)
   */
  askVolumeUsd?: number;
}

/**
 * Collector Statistics
 * Statistics about the data collector
 */
export interface CollectorStatistics {
  /**
   * Total number of API requests made
   */
  totalRequests: number;

  /**
   * Number of successful requests
   */
  successfulRequests: number;

  /**
   * Number of failed requests
   */
  failedRequests: number;

  /**
   * Last collection timestamp
   */
  lastCollectionTime: Date | null;

  /**
   * Number of symbols being collected
   */
  symbolCount?: number;

  /**
   * Average collection duration (ms)
   */
  avgDuration?: number;

  /**
   * Whether collector is currently running
   */
  isRunning?: boolean;
}

/**
 * Service Operation Result
 * Generic result type for service operations
 */
export interface ServiceResult<T = any> {
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
   * Operation metadata
   */
  metadata?: {
    duration?: number;
    cached?: boolean;
    count?: number;
  };
}

/**
 * Batch Write Result
 * Result of batch write operation
 */
export interface BatchWriteResult {
  /**
   * Number of items written
   */
  written: number;

  /**
   * Number of items skipped (duplicates)
   */
  skipped: number;

  /**
   * Number of items failed
   */
  failed: number;

  /**
   * Total time taken (ms)
   */
  duration: number;
}

/**
 * Repository Query Options
 * Common options for repository queries
 */
export interface QueryOptions {
  /**
   * Fields to select
   */
  select?: string[];

  /**
   * Ordering
   */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  /**
   * Pagination
   */
  pagination?: {
    limit: number;
    offset?: number;
  };

  /**
   * Include soft-deleted records
   */
  includeDeleted?: boolean;
}

/**
 * Paginated Result
 * Result with pagination metadata
 */
export interface PaginatedResult<T> {
  /**
   * Result data
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Total number of items
     */
    total: number;

    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    pageSize: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Whether there is a next page
     */
    hasNext: boolean;

    /**
     * Whether there is a previous page
     */
    hasPrev: boolean;
  };
}

/**
 * Aggregation Options
 * Options for data aggregation queries
 */
export interface AggregationOptions {
  /**
   * Aggregation function
   */
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';

  /**
   * Field to aggregate
   */
  field: string;

  /**
   * Group by field
   */
  groupBy?: string;

  /**
   * Time bucket for time-series aggregation
   */
  timeBucket?: '1m' | '5m' | '15m' | '1h' | '1d';
}

/**
 * Health Check Result
 * Service health status
 */
export interface HealthCheckResult {
  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Individual component checks
   */
  checks: {
    /**
     * Database connection
     */
    database?: {
      connected: boolean;
      latency?: number;
    };

    /**
     * Redis connection
     */
    cache?: {
      connected: boolean;
      latency?: number;
    };

    /**
     * Collector status
     */
    collector?: {
      running: boolean;
      lastCollection?: Date;
    };

    /**
     * External APIs
     */
    externalApis?: {
      [key: string]: {
        reachable: boolean;
        latency?: number;
      };
    };
  };

  /**
   * Timestamp of health check
   */
  timestamp: Date;

  /**
   * Uptime in seconds
   */
  uptime?: number;
}

/**
 * Service Event
 * Event emitted by services
 */
export interface ServiceEvent<T = any> {
  /**
   * Event type
   */
  type: string;

  /**
   * Event payload
   */
  payload: T;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Source service
   */
  source: string;
}

/**
 * Type guard to check if result is successful
 */
export function isSuccessResult<T>(
  result: ServiceResult<T>
): result is ServiceResult<T> & { success: true; data: T } {
  return result.success === true && result.data !== undefined;
}

/**
 * Type guard to check if result is error
 */
export function isErrorResult<T>(
  result: ServiceResult<T>
): result is ServiceResult<T> & { success: false; error: string } {
  return result.success === false && result.error !== undefined;
}
