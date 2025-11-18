/**
 * Интервалы обновления данных
 */

/** Интервал обновления WebSocket данных (мс) */
export const WS_REFRESH_INTERVAL = 300;

/** Интервал обновления REST API данных (мс) */
export const REST_REFRESH_INTERVAL = 60000; // 1 минута

/** Интервал опроса для сбора данных (мс) */
export const DATA_COLLECTION_INTERVAL = 1000; // 1 секунда

/** Интервал обновления графиков (мс) */
export const CHART_UPDATE_INTERVAL = 1000;

/** Интервал обновления счетчика (мс) */
export const COUNTDOWN_INTERVAL = 1000;

/** Задержка инициализации графика (мс) */
export const CHART_INIT_DELAY = 50;

/** Задержка перед первой загрузкой данных графика (мс) */
export const CHART_DATA_LOAD_DELAY = 100;
