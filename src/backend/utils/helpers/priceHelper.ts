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
 * @param currentPrice - текущая рыночная цена
 * @param depth - глубина в процентах (например, 5 для 5%)
 * @param side - 'bid' или 'ask'
 */
export function calculatePriceRange(
  currentPrice: number,
  depth: DepthLevel,
  side: 'bid' | 'ask'
): PriceRange {
  const depthDecimal = getDepthDecimal(depth);
  const priceChange = currentPrice * depthDecimal;

  if (side === 'bid') {
    // Для bid: от (цена - глубина) до текущей цены
    return {
      from: currentPrice - priceChange,
      to: currentPrice,
    };
  } else {
    // Для ask: от текущей цены до (цена + глубина)
    return {
      from: currentPrice,
      to: currentPrice + priceChange,
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
