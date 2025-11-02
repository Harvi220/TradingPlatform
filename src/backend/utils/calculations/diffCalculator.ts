/**
 * Утилиты для расчета DIFF индикатора (разница между bid и ask)
 */

import { DepthLevel } from '../../../shared/constants/depths';
import { DiffIndicator } from '../../types/indicators.types';
import { DepthVolumes } from '../../types/orderBook.types';

/**
 * Рассчитать DIFF для заданной глубины
 * DIFF = BID - ASK
 */
export function calculateDiff(depthVolumes: DepthVolumes): DiffIndicator {
  const diff = depthVolumes.bidVolume - depthVolumes.askVolume;
  const totalVolume = depthVolumes.bidVolume + depthVolumes.askVolume;

  // Рассчитываем процентное соотношение diff
  // Если totalVolume = 0, то percentage = 0
  const percentage = totalVolume > 0 ? (diff / totalVolume) * 100 : 0;

  return {
    depth: depthVolumes.depth as DepthLevel,
    diff,
    bidVolume: depthVolumes.bidVolume,
    askVolume: depthVolumes.askVolume,
    percentage,
    timestamp: Date.now(),
  };
}

/**
 * Рассчитать DIFF для всех глубин
 */
export function calculateAllDiffs(depthVolumesList: DepthVolumes[]): DiffIndicator[] {
  return depthVolumesList.map(dv => calculateDiff(dv));
}

/**
 * Проверить, является ли рынок бычьим (bid > ask)
 */
export function isBullish(diff: DiffIndicator): boolean {
  return diff.diff > 0;
}

/**
 * Проверить, является ли рынок медвежьим (ask > bid)
 */
export function isBearish(diff: DiffIndicator): boolean {
  return diff.diff < 0;
}

/**
 * Проверить, является ли рынок нейтральным (bid ≈ ask)
 * @param threshold - порог в процентах (по умолчанию 1%)
 */
export function isNeutral(diff: DiffIndicator, threshold: number = 1): boolean {
  return Math.abs(diff.percentage) < threshold;
}

/**
 * Получить силу тренда на основе DIFF
 * Возвращает значение от -100 (сильно медвежий) до 100 (сильно бычий)
 */
export function getTrendStrength(diff: DiffIndicator): number {
  return diff.percentage;
}

/**
 * Рассчитать среднее значение DIFF по всем глубинам
 */
export function calculateAverageDiff(diffs: DiffIndicator[]): number {
  if (diffs.length === 0) return 0;
  const totalDiff = diffs.reduce((sum, d) => sum + d.diff, 0);
  return totalDiff / diffs.length;
}

/**
 * Найти глубину с максимальным положительным DIFF
 */
export function findMaxPositiveDiff(diffs: DiffIndicator[]): DiffIndicator | null {
  const positiveDiffs = diffs.filter(d => d.diff > 0);
  if (positiveDiffs.length === 0) return null;
  return positiveDiffs.reduce((max, current) =>
    current.diff > max.diff ? current : max
  );
}

/**
 * Найти глубину с максимальным отрицательным DIFF
 */
export function findMaxNegativeDiff(diffs: DiffIndicator[]): DiffIndicator | null {
  const negativeDiffs = diffs.filter(d => d.diff < 0);
  if (negativeDiffs.length === 0) return null;
  return negativeDiffs.reduce((min, current) =>
    current.diff < min.diff ? current : min
  );
}

/**
 * Конвертировать DIFF в текстовое описание рынка
 */
export function getDiffDescription(diff: DiffIndicator): string {
  if (isNeutral(diff)) {
    return 'Нейтральный';
  }

  const strength = Math.abs(diff.percentage);
  const direction = diff.diff > 0 ? 'Бычий' : 'Медвежий';

  if (strength < 5) {
    return `Слабо ${direction.toLowerCase()}`;
  } else if (strength < 15) {
    return direction;
  } else {
    return `Сильно ${direction.toLowerCase()}`;
  }
}
