/**
 * Утилиты для расчета объемов на разных глубинах
 */

import { DepthLevel } from '../../../shared/constants/depths';
import { Order, DepthVolumes, OrderBook } from '../../types/orderBook.types';
import { calculatePriceRange, calculateMidPrice, isPriceInRange, calculateOrderValue } from '../helpers/priceHelper';

/**
 * Рассчитать объемы на заданной глубине для order book
 */
export function calculateDepthVolumes(
  orderBook: OrderBook,
  depth: DepthLevel
): DepthVolumes {
  // Определяем текущую цену (mid price)
  const bestBid = orderBook.bids[0]?.price || 0;
  const bestAsk = orderBook.asks[0]?.price || 0;
  const currentPrice = calculateMidPrice(bestBid, bestAsk);

  // Рассчитываем диапазоны цен для bid и ask
  const bidRange = calculatePriceRange(currentPrice, depth, 'bid');
  const askRange = calculatePriceRange(currentPrice, depth, 'ask');

  // Суммируем объемы в диапазонах
  const bidVolume = sumVolumeInRange(orderBook.bids, bidRange);
  const askVolume = sumVolumeInRange(orderBook.asks, askRange);

  // Рассчитываем стоимость
  const totalBidValue = sumValueInRange(orderBook.bids, bidRange);
  const totalAskValue = sumValueInRange(orderBook.asks, askRange);

  return {
    depth,
    bidVolume,
    askVolume,
    totalBidValue,
    totalAskValue,
    currentPrice,
    timestamp: Date.now(),
  };
}

/**
 * Суммировать объемы ордеров в заданном ценовом диапазоне
 */
function sumVolumeInRange(orders: Order[], range: { from: number; to: number }): number {
  return orders
    .filter(order => isPriceInRange(order.price, range))
    .reduce((sum, order) => sum + order.volume, 0);
}

/**
 * Суммировать стоимость ордеров в заданном ценовом диапазоне
 */
function sumValueInRange(orders: Order[], range: { from: number; to: number }): number {
  return orders
    .filter(order => isPriceInRange(order.price, range))
    .reduce((sum, order) => sum + calculateOrderValue(order.price, order.volume), 0);
}

/**
 * Рассчитать объемы для всех глубин
 */
export function calculateAllDepthVolumes(
  orderBook: OrderBook,
  depths: readonly DepthLevel[]
): DepthVolumes[] {
  return depths.map(depth => calculateDepthVolumes(orderBook, depth));
}

/**
 * Рассчитать средний объем на всех глубинах
 */
export function calculateAverageVolume(depthVolumes: DepthVolumes[]): {
  avgBidVolume: number;
  avgAskVolume: number;
} {
  const totalBid = depthVolumes.reduce((sum, dv) => sum + dv.bidVolume, 0);
  const totalAsk = depthVolumes.reduce((sum, dv) => sum + dv.askVolume, 0);
  const count = depthVolumes.length;

  return {
    avgBidVolume: totalBid / count,
    avgAskVolume: totalAsk / count,
  };
}

/**
 * Найти глубину с максимальным объемом bid
 */
export function findMaxBidDepth(depthVolumes: DepthVolumes[]): DepthVolumes | null {
  if (depthVolumes.length === 0) return null;
  return depthVolumes.reduce((max, current) =>
    current.bidVolume > max.bidVolume ? current : max
  );
}

/**
 * Найти глубину с максимальным объемом ask
 */
export function findMaxAskDepth(depthVolumes: DepthVolumes[]): DepthVolumes | null {
  if (depthVolumes.length === 0) return null;
  return depthVolumes.reduce((max, current) =>
    current.askVolume > max.askVolume ? current : max
  );
}
