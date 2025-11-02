/**
 * Конфигурация WebSocket
 */

export const WEBSOCKET_CONFIG = {
  /**
   * Автоматическое переподключение при разрыве
   */
  autoReconnect: true,

  /**
   * Максимальное количество попыток переподключения
   */
  maxReconnectAttempts: 5,

  /**
   * Задержка между попытками переподключения (мс)
   */
  reconnectDelay: 1000,

  /**
   * Интервал ping (мс)
   */
  pingInterval: 30000,

  /**
   * Timeout для pong ответа (мс)
   */
  pongTimeout: 5000,

  /**
   * Буферизация сообщений при разрыве соединения
   */
  bufferMessages: true,

  /**
   * Максимальный размер буфера сообщений
   */
  maxBufferSize: 1000,
} as const;

export default WEBSOCKET_CONFIG;
