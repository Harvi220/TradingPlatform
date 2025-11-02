/**
 * Типы для работы со стаканом ордеров
 */

import { MarketType, TradingSymbol, Timestamp } from '../../shared/types/common.types';

/**
 * Ордер в стакане (price, volume в числовом формате)
 */
export interface Order {
  price: number;
  volume: number;
}

/**
 * Стакан ордеров
 */
export interface OrderBook {
  symbol: TradingSymbol;
  marketType: MarketType;
  bids: Order[];
  asks: Order[];
  timestamp: Timestamp;
  lastUpdateId?: number;
}

/**
 * Диапазон цен для расчета глубины
 */
export interface PriceRange {
  from: number;
  to: number;
}

/**
 * Объемы на определенной глубине
 */
export interface DepthVolumes {
  depth: number;           // Процент глубины (1.5, 3, 5, и т.д.)
  bidVolume: number;       // Суммарный объем bid
  askVolume: number;       // Суммарный объем ask
  totalBidValue: number;   // Стоимость всех bid (price * volume)
  totalAskValue: number;   // Стоимость всех ask (price * volume)
  currentPrice: number;    // Текущая рыночная цена
  timestamp: Timestamp;
}
