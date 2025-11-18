/**
 * Утилиты для работы с валютами
 */

import { QUOTE_CURRENCIES } from '../constants/trading';

/**
 * Извлекает базовую валюту из торгового символа
 * @example getBaseCurrency('BTCUSDT') => 'BTC'
 */
export function getBaseCurrency(symbol: string): string {
  for (const quote of QUOTE_CURRENCIES) {
    if (symbol.endsWith(quote)) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

/**
 * Форматирует USD значение в читаемый формат (M, K)
 * @example formatUSD(1500000) => '$1.50M'
 */
export function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}
