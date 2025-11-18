/**
 * Цветовые схемы для графиков и индикаторов
 */

/** Цвета для индикаторов BID/ASK на разных глубинах */
export const INDICATOR_COLORS = {
  bid: {
    "1.5": "#90EE90",
    "3": "#00C853",
    "5": "#00897B",
    "8": "#00ACC1",
    "15": "#1976D2",
    "30": "#0D47A1",
  },
  ask: {
    "1.5": "#FFCDD2",
    "3": "#EF5350",
    "5": "#D32F2F",
    "8": "#FF6F00",
    "15": "#F57C00",
    "30": "#E65100",
  },
} as const;

/** Цвета для статусов WebSocket */
export const WS_STATUS_COLORS = {
  connected: {
    bg: "bg-green-500",
    text: "text-green-700",
  },
  connecting: {
    bg: "bg-yellow-500",
    text: "text-yellow-700",
  },
  disconnected: {
    bg: "bg-gray-500",
    text: "text-gray-700",
  },
  error: {
    bg: "bg-red-500",
    text: "text-red-700",
  },
} as const;

/** Текстовые описания статусов */
export const WS_STATUS_TEXT = {
  connected: "Подключено",
  connecting: "Подключение...",
  disconnected: "Отключено",
  error: "Ошибка",
} as const;

export type WSStatus = keyof typeof WS_STATUS_COLORS;
