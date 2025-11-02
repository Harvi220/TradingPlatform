/**
 * Типы для индикаторов (DIFF, TOTAL и др.)
 */

import { DepthLevel } from '../../shared/constants/depths';
import { Timestamp } from '../../shared/types/common.types';

/**
 * DIFF индикатор (разница между bid и ask)
 */
export interface DiffIndicator {
  depth: DepthLevel;
  diff: number;             // bid - ask
  bidVolume: number;
  askVolume: number;
  percentage: number;       // (diff / (bid + ask)) * 100
  timestamp: Timestamp;
}

/**
 * Все DIFF индикаторы для разных глубин
 */
export interface DiffIndicators {
  spot?: Record<DepthLevel, DiffIndicator>;
  futures?: Record<DepthLevel, DiffIndicator>;
  timestamp: Timestamp;
}

/**
 * TOTAL индикатор (агрегация по всем парам)
 */
export interface TotalIndicator {
  type: 'TOTAL' | 'TOTAL1' | 'TOTAL2' | 'TOTAL3' | 'OTHERS';
  depth: DepthLevel;
  bidVolume: number;
  askVolume: number;
  diff: number;
  excludedSymbols: string[];  // Какие символы исключены
  timestamp: Timestamp;
}

/**
 * Конфигурация для расчета TOTAL
 */
export interface TotalConfig {
  TOTAL: string[];        // Все пары
  TOTAL1: string[];       // Исключает BTC
  TOTAL2: string[];       // Исключает BTC и ETH
  TOTAL3: string[];       // Исключает BTC, ETH и стейблкоины
  OTHERS: string[];       // TOTAL1 минус топ-10 альткоинов
}
