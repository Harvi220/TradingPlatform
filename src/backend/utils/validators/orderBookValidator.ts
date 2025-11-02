/**
 * Валидаторы для данных order book
 */

import { BinanceDepthUpdate, BinanceDepthSnapshot } from '../../types/binance.types';
import { OrderBook, Order } from '../../types/orderBook.types';

/**
 * Проверить валидность depth update от Binance
 */
export function isValidDepthUpdate(data: any): data is BinanceDepthUpdate {
  return (
    data &&
    typeof data === 'object' &&
    data.e === 'depthUpdate' &&
    typeof data.E === 'number' &&
    typeof data.s === 'string' &&
    Array.isArray(data.b) &&
    Array.isArray(data.a)
  );
}

/**
 * Проверить валидность depth snapshot от Binance
 */
export function isValidDepthSnapshot(data: any): data is BinanceDepthSnapshot {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.lastUpdateId === 'number' &&
    Array.isArray(data.bids) &&
    Array.isArray(data.asks)
  );
}

/**
 * Проверить валидность order book entry [price, volume]
 */
export function isValidOrderBookEntry(entry: any): boolean {
  return (
    Array.isArray(entry) &&
    entry.length === 2 &&
    typeof entry[0] === 'string' &&
    typeof entry[1] === 'string' &&
    !isNaN(parseFloat(entry[0])) &&
    !isNaN(parseFloat(entry[1]))
  );
}

/**
 * Проверить валидность Order
 */
export function isValidOrder(order: any): order is Order {
  return (
    order &&
    typeof order === 'object' &&
    typeof order.price === 'number' &&
    typeof order.volume === 'number' &&
    order.price > 0 &&
    order.volume >= 0
  );
}

/**
 * Проверить валидность OrderBook
 */
export function isValidOrderBook(orderBook: any): orderBook is OrderBook {
  return (
    orderBook &&
    typeof orderBook === 'object' &&
    typeof orderBook.symbol === 'string' &&
    (orderBook.marketType === 'SPOT' || orderBook.marketType === 'FUTURES') &&
    Array.isArray(orderBook.bids) &&
    Array.isArray(orderBook.asks) &&
    orderBook.bids.every(isValidOrder) &&
    orderBook.asks.every(isValidOrder) &&
    typeof orderBook.timestamp === 'number'
  );
}

/**
 * Проверить, что bids отсортированы по убыванию цены
 */
export function areBidsSorted(bids: Order[]): boolean {
  for (let i = 1; i < bids.length; i++) {
    if (bids[i].price > bids[i - 1].price) {
      return false;
    }
  }
  return true;
}

/**
 * Проверить, что asks отсортированы по возрастанию цены
 */
export function areAsksSorted(asks: Order[]): boolean {
  for (let i = 1; i < asks.length; i++) {
    if (asks[i].price < asks[i - 1].price) {
      return false;
    }
  }
  return true;
}

/**
 * Проверить, что стакан ордеров не пересекается (лучший bid < лучший ask)
 */
export function hasNoSpread(orderBook: OrderBook): boolean {
  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return false;
  }

  const bestBid = orderBook.bids[0].price;
  const bestAsk = orderBook.asks[0].price;

  return bestBid < bestAsk;
}

/**
 * Полная валидация order book
 */
export function validateOrderBook(orderBook: OrderBook): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidOrderBook(orderBook)) {
    errors.push('Invalid order book structure');
    return { isValid: false, errors };
  }

  if (!areBidsSorted(orderBook.bids)) {
    errors.push('Bids are not sorted in descending order');
  }

  if (!areAsksSorted(orderBook.asks)) {
    errors.push('Asks are not sorted in ascending order');
  }

  if (!hasNoSpread(orderBook)) {
    errors.push('Invalid spread: best bid >= best ask');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
