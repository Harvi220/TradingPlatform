/**
 * Типы для API endpoints
 */

import { MarketType, TradingSymbol, PriceString, VolumeString, Timestamp } from './common.types';
import { DepthLevel } from '../constants/depths';

/**
 * Запись ордера [цена, объем]
 */
export type OrderBookEntry = [PriceString, VolumeString];

/**
 * Ответ API для SPOT/FUTURES рынка
 */
export interface OrderBookResponse {
  type: MarketType;
  symbol: TradingSymbol;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: Timestamp;
}

/**
 * Данные объемов на определенной глубине
 */
export interface DepthVolumeData {
  bid: number;
  ask: number;
  diff: number;
}

/**
 * Ответ API для глубины рынка
 */
export interface DepthResponse {
  depth: DepthLevel;
  spot?: DepthVolumeData;
  futures?: DepthVolumeData;
  timestamp: Timestamp;
}

/**
 * Параметры запроса глубины
 */
export interface DepthQueryParams {
  depth: DepthLevel;
  type?: 'spot' | 'futures' | 'all';
  symbol?: TradingSymbol;
}

/**
 * Стандартный ответ об ошибке
 */
export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: Timestamp;
}

/**
 * Health check ответ
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: Timestamp;
  uptime: number;
}
