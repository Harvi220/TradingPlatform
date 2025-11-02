/**
 * Общие типы, используемые в проекте
 */

/**
 * Тип рынка
 */
export type MarketType = 'SPOT' | 'FUTURES';

/**
 * Торговая пара (например, BTCUSDT)
 */
export type TradingSymbol = string;

/**
 * Цена в виде строки (как приходит от Binance)
 */
export type PriceString = string;

/**
 * Объем в виде строки (как приходит от Binance)
 */
export type VolumeString = string;

/**
 * Timestamp в миллисекундах
 */
export type Timestamp = number;
