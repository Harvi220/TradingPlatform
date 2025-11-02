/**
 * Конфигурация для подключения к Binance API
 */

import { TradingSymbol } from '../../shared/types/common.types';

/**
 * WebSocket URLs для Binance
 */
export const BINANCE_WS_URLS = {
  SPOT: process.env.BINANCE_SPOT_WS_URL || 'wss://stream.binance.com:9443/ws',
  FUTURES: process.env.BINANCE_FUTURES_WS_URL || 'wss://fstream.binance.com/ws',
} as const;

/**
 * REST API URLs для Binance
 */
export const BINANCE_REST_URLS = {
  SPOT: 'https://api.binance.com/api/v3',
  FUTURES: 'https://fapi.binance.com/fapi/v1',
} as const;

/**
 * Скорость обновления WebSocket данных
 */
export const UPDATE_SPEED = {
  FAST: '100ms',      // 10 обновлений в секунду
  SLOW: '1000ms',     // 1 обновление в секунду
} as const;

/**
 * Основные торговые пары для мониторинга
 */
export const DEFAULT_SYMBOLS: TradingSymbol[] = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'MATICUSDT',
];

/**
 * Символы для TOTAL индикаторов
 */
export const TOTAL_SYMBOLS = {
  // TOTAL - все пары
  TOTAL: DEFAULT_SYMBOLS,

  // TOTAL1 - исключает BTC
  TOTAL1: DEFAULT_SYMBOLS.filter(s => !s.startsWith('BTC')),

  // TOTAL2 - исключает BTC и ETH
  TOTAL2: DEFAULT_SYMBOLS.filter(s => !s.startsWith('BTC') && !s.startsWith('ETH')),

  // TOTAL3 - исключает BTC, ETH и стейблкоины
  TOTAL3: DEFAULT_SYMBOLS.filter(
    s => !s.startsWith('BTC') &&
         !s.startsWith('ETH') &&
         !s.includes('USDT') &&
         !s.includes('USDC') &&
         !s.includes('BUSD')
  ),

  // OTHERS - TOTAL1 минус топ-10 альткоинов (без BTC)
  OTHERS: DEFAULT_SYMBOLS.filter(
    s => !s.startsWith('BTC') &&
         !['ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT'].includes(s)
  ),
} as const;

/**
 * Лимиты для order book depth
 */
export const DEPTH_LIMITS = {
  SPOT: [5, 10, 20, 50, 100, 500, 1000, 5000],
  FUTURES: [5, 10, 20, 50, 100, 500, 1000],
} as const;

/**
 * Настройки переподключения WebSocket
 */
export const RECONNECT_CONFIG = {
  maxAttempts: 5,
  delay: 1000,        // Начальная задержка в мс
  maxDelay: 30000,    // Максимальная задержка в мс
  factor: 2,          // Множитель задержки (экспоненциальный backoff)
} as const;

/**
 * Timeout для WebSocket операций
 */
export const WEBSOCKET_TIMEOUT = {
  connection: 10000,  // 10 секунд на подключение
  ping: 30000,        // 30 секунд ping interval
  pong: 5000,         // 5 секунд ожидание pong
} as const;
