/**
 * Утилиты для работы с ценами
 */

import { DepthLevel, getDepthDecimal } from '../../../shared/constants/depths';
import { PriceRange } from '../../types/orderBook.types';

/**
 * Рассчитать mid price (среднюю цену между лучшим bid и ask)
 */
export function calculateMidPrice(bestBid: number, bestAsk: number): number {
  return (bestBid + bestAsk) / 2;
}

/**
 * Рассчитать диапазон цен для заданной глубины
 * @param basePrice - базовая цена (bestBid для bid, bestAsk для ask)
 * @param depth - глубина в процентах (например, 5 для 5%)
 * @param side - 'bid' или 'ask'
 */
export function calculatePriceRange(
  basePrice: number,
  depth: DepthLevel,
  side: 'bid' | 'ask'
): PriceRange {
  const depthDecimal = getDepthDecimal(depth);

  if (side === 'bid') {
    // Для bid: от (bestBid × (1 - depth%)) до bestBid
    // Пример: bestBid=$100k, depth=5% → от $95k до $100k
    const lowerBound = basePrice * (1 - depthDecimal);
    return {
      from: lowerBound,
      to: basePrice,
    };
  } else {
    // Для ask: от bestAsk до (bestAsk × (1 + depth%))
    // Пример: bestAsk=$100k, depth=5% → от $100k до $105k
    const upperBound = basePrice * (1 + depthDecimal);
    return {
      from: basePrice,
      to: upperBound,
    };
  }
}

/**
 * Проверить, находится ли цена в заданном диапазоне
 */
export function isPriceInRange(price: number, range: PriceRange): boolean {
  return price >= range.from && price <= range.to;
}

/**
 * Конвертировать строковую цену в число
 */
export function parsePrice(priceString: string): number {
  return parseFloat(priceString);
}

/**
 * Конвертировать строковый объем в число
 */
export function parseVolume(volumeString: string): number {
  return parseFloat(volumeString);
}

/**
 * Форматировать цену для отображения
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

/**
 * Форматировать объем для отображения
 */
export function formatVolume(volume: number, decimals: number = 8): string {
  return volume.toFixed(decimals);
}

/**
 * Рассчитать процентное изменение цены
 */
export function calculatePriceChange(oldPrice: number, newPrice: number): number {
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Рассчитать стоимость ордера (price * volume)
 */
export function calculateOrderValue(price: number, volume: number): number {
  return price * volume;
}
