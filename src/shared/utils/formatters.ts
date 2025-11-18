/**
 * Утилиты для форматирования данных
 */

/**
 * Форматирует цену с заданной точностью
 */
export function formatPrice(
  price: number,
  options?: Intl.NumberFormatOptions
): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
    ...options,
  });
}

/**
 * Форматирует объем
 */
export function formatVolume(
  volume: number,
  options?: Intl.NumberFormatOptions
): string {
  return volume.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    ...options,
  });
}

/**
 * Форматирует время в локальное представление
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU');
}

/**
 * Форматирует процент
 */
export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}
