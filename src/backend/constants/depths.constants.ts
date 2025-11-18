/**
 * Trading Depth Constants
 *
 * Defines all trading depth levels used throughout the application.
 * These depths represent percentage levels for order book analysis.
 *
 * @module DepthConstants
 */

/**
 * Standard trading depth levels (in percentages)
 * Used for calculating bid/ask volumes at different price levels
 *
 * Example: 1.5% means ±1.5% from current best bid/ask price
 */
export const TRADING_DEPTHS = [1.5, 3, 5, 8, 15, 30] as const;

/**
 * Type for valid trading depth values
 */
export type TradingDepth = typeof TRADING_DEPTHS[number];

/**
 * Default depth for initial data loading
 */
export const DEFAULT_DEPTH: TradingDepth = 5;

/**
 * Minimum allowed depth
 */
export const MIN_DEPTH: TradingDepth = 1.5;

/**
 * Maximum allowed depth
 */
export const MAX_DEPTH: TradingDepth = 30;

/**
 * Validate if a depth value is supported
 * @param depth - Depth value to validate
 * @returns true if depth is valid
 */
export function isValidDepth(depth: number): depth is TradingDepth {
  return TRADING_DEPTHS.includes(depth as TradingDepth);
}

/**
 * Get the closest valid depth to a given value
 * @param depth - Target depth value
 * @returns Closest valid trading depth
 */
export function getClosestDepth(depth: number): TradingDepth {
  return TRADING_DEPTHS.reduce((prev, curr) =>
    Math.abs(curr - depth) < Math.abs(prev - depth) ? curr : prev
  );
}
