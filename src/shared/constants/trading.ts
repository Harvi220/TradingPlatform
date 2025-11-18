/**
 * Торговые константы для Trading Platform
 */

/** Доступные торговые пары */
export const TRADING_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
] as const;

/** Глубины рынка в процентах */
export const MARKET_DEPTHS = [1.5, 3, 5, 8, 15, 30] as const;

/** Расширенные глубины для REST API */
export const EXTENDED_MARKET_DEPTHS = [1.5, 3, 5, 8, 10, 15, 20, 30] as const;

/** Quote валюты для определения базовой валюты */
export const QUOTE_CURRENCIES = [
  'USDT',
  'USDC',
  'BUSD',
  'USD',
  'BTC',
  'ETH',
  'BNB',
] as const;

/** Типы рынков */
export const MARKET_TYPES = {
  SPOT: 'spot',
  FUTURES: 'futures',
} as const;

export type MarketType = typeof MARKET_TYPES[keyof typeof MARKET_TYPES];
export type TradingSymbol = typeof TRADING_SYMBOLS[number];
