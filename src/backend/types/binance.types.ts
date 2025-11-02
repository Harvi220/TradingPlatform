/**
 * Типы для Binance WebSocket API
 */

import { TradingSymbol, PriceString, VolumeString, Timestamp } from '../../shared/types/common.types';

/**
 * Сообщение Depth Update от Binance WebSocket
 */
export interface BinanceDepthUpdate {
  e: 'depthUpdate';          // Event type
  E: Timestamp;              // Event time
  s: TradingSymbol;          // Symbol
  U: number;                 // First update ID in event
  u: number;                 // Final update ID in event
  b: [PriceString, VolumeString][]; // Bids to be updated
  a: [PriceString, VolumeString][]; // Asks to be updated
}

/**
 * Snapshot стакана ордеров от Binance REST API
 */
export interface BinanceDepthSnapshot {
  lastUpdateId: number;
  bids: [PriceString, VolumeString][];
  asks: [PriceString, VolumeString][];
}

/**
 * Конфигурация WebSocket подключения
 */
export interface WebSocketConfig {
  url: string;
  symbol: TradingSymbol;
  updateSpeed?: '100ms' | '1000ms';
}

/**
 * Статус WebSocket подключения
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Событие WebSocket
 */
export interface WebSocketEvent {
  type: 'open' | 'message' | 'error' | 'close';
  data?: any;
  timestamp: Timestamp;
}
