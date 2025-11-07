/**
 * Сервис для подключения к Binance WebSocket API
 */

import WebSocket from 'ws';
import { MarketType, TradingSymbol } from '../../../shared/types/common.types';
import { BinanceDepthUpdate, WebSocketStatus } from '../../types/binance.types';
import { BINANCE_WS_URLS, UPDATE_SPEED, RECONNECT_CONFIG } from '../../config/binance.config';
import { isValidDepthUpdate } from '../../utils/validators/orderBookValidator';

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private symbol: TradingSymbol,
    private marketType: MarketType,
    private onMessage: (data: BinanceDepthUpdate) => void,
    private onError?: (error: Error) => void,
    private onStatusChange?: (status: WebSocketStatus) => void
  ) {}

  /**
   * Подключиться к WebSocket
   */
  public connect(): void {
    if (this.ws && this.status === 'connected') {
      console.log(`Already connected to ${this.symbol}`);
      return;
    }

    this.setStatus('connecting');

    const wsUrl = this.buildWebSocketUrl();
    console.log(`Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data) => this.handleMessage(data));
      this.ws.on('error', (error) => this.handleError(error));
      this.ws.on('close', () => this.handleClose());

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Отключиться от WebSocket
   */
  public disconnect(): void {
    console.log(`Disconnecting from ${this.symbol}...`);

    this.clearReconnectTimeout();
    this.clearPingInterval();

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Переподключиться
   */
  public reconnect(): void {
    console.log(`Reconnecting to ${this.symbol}...`);
    this.disconnect();
    this.connect();
  }

  /**
   * Получить текущий статус
   */
  public getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Построить URL для WebSocket
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.marketType === 'SPOT'
      ? BINANCE_WS_URLS.SPOT
      : BINANCE_WS_URLS.FUTURES;

    // ИСПРАВЛЕНИЕ: Используем медленную скорость (1 раз в секунду вместо 10)
    const stream = `${this.symbol.toLowerCase()}@depth@${UPDATE_SPEED.SLOW}`;

    return `${baseUrl}/${stream}`;
  }

  /**
   * Обработка открытия соединения
   */
  private handleOpen(): void {
    console.log(`Connected to ${this.symbol} ${this.marketType}`);
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.startPingInterval();
  }

  /**
   * Обработка входящих сообщений
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      if (isValidDepthUpdate(message)) {
        this.onMessage(message);
      } else {
        console.warn('Invalid depth update format:', message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Обработка ошибок
   */
  private handleError(error: Error): void {
    console.error(`WebSocket error for ${this.symbol}:`, error.message);
    this.setStatus('error');

    if (this.onError) {
      this.onError(error);
    }

    // Попытка переподключения при ошибке
    this.scheduleReconnect();
  }

  /**
   * Обработка закрытия соединения
   */
  private handleClose(): void {
    console.log(`WebSocket closed for ${this.symbol}`);
    this.setStatus('disconnected');
    this.clearPingInterval();

    // Автоматическое переподключение
    this.scheduleReconnect();
  }

  /**
   * Запланировать переподключение
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
      console.error(`Max reconnect attempts reached for ${this.symbol}`);
      return;
    }

    this.clearReconnectTimeout();

    // Экспоненциальный backoff
    const delay = Math.min(
      RECONNECT_CONFIG.delay * Math.pow(RECONNECT_CONFIG.factor, this.reconnectAttempts),
      RECONNECT_CONFIG.maxDelay
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${RECONNECT_CONFIG.maxAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Запустить интервал ping
   */
  private startPingInterval(): void {
    this.clearPingInterval();

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping каждые 30 секунд
  }

  /**
   * Очистить timeout переподключения
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Очистить интервал ping
   */
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Установить статус и уведомить подписчиков
   */
  private setStatus(status: WebSocketStatus): void {
    this.status = status;

    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
}
