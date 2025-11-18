/**
 * Типы для графиков
 */

export interface EnabledIndicators {
  bid: { [key: string]: boolean };
  ask: { [key: string]: boolean };
}

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface IndicatorData {
  depth: string;
  type: 'bid' | 'ask';
  data: ChartDataPoint[];
}
