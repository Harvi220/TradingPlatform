/**
 * Константы глубин для расчета объемов ордеров
 * Глубина указывается в процентах от текущей цены
 */

export const DEPTH_LEVELS = [1.5, 3, 5, 8, 15, 30] as const;

export type DepthLevel = typeof DEPTH_LEVELS[number];

/**
 * Проверка, является ли значение валидной глубиной
 */
export function isValidDepth(depth: number): depth is DepthLevel {
  return DEPTH_LEVELS.includes(depth as DepthLevel);
}

/**
 * Получить процент глубины в десятичном формате
 * Например: 5 -> 0.05
 */
export function getDepthDecimal(depth: DepthLevel): number {
  return depth / 100;
}
