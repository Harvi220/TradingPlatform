/**
 * Утилиты для работы со статусами
 */

import { WS_STATUS_COLORS, WS_STATUS_TEXT, WSStatus } from '../constants/chart-colors';

export interface StatusDisplay {
  color: string;
  text: string;
  textColor: string;
}

/**
 * Получает информацию для отображения статуса WebSocket
 */
export function getStatusDisplay(status: string): StatusDisplay {
  const normalizedStatus = status as WSStatus;

  if (normalizedStatus in WS_STATUS_COLORS) {
    return {
      color: WS_STATUS_COLORS[normalizedStatus].bg,
      text: WS_STATUS_TEXT[normalizedStatus],
      textColor: WS_STATUS_COLORS[normalizedStatus].text,
    };
  }

  // Дефолтное значение для неизвестного статуса
  return {
    color: "bg-gray-500",
    text: "Неизвестно",
    textColor: "text-gray-700",
  };
}
