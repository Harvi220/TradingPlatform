/**
 * Сервис для управления и обработки order book данных
 */

import { MarketType, TradingSymbol } from '../../../shared/types/common.types';
import { OrderBook, Order } from '../../types/orderBook.types';
import { BinanceDepthUpdate } from '../../types/binance.types';
import { parsePrice, parseVolume } from '../../utils/helpers/priceHelper';
import { validateOrderBook } from '../../utils/validators/orderBookValidator';
import { BinanceWebSocketService } from './WebSocketService';

export class OrderBookService {
  private orderBook: OrderBook;
  private wsService: BinanceWebSocketService;
  private updateCallbacks: Array<(orderBook: OrderBook) => void> = [];

  constructor(
    private symbol: TradingSymbol,
    private marketType: MarketType
  ) {
    // Инициализируем пустой order book
    this.orderBook = {
      symbol,
      marketType,
      bids: [],
      asks: [],
      timestamp: Date.now(),
    };

    // Создаем WebSocket сервис
    this.wsService = new BinanceWebSocketService(
      symbol,
      marketType,
      (update) => this.handleDepthUpdate(update),
      (error) => this.handleError(error),
      (status) => this.handleStatusChange(status)
    );
  }

  /**
   * Начать получение данных
   */
  public start(): void {
    console.log(`Starting OrderBookService for ${this.symbol} ${this.marketType}`);
    this.wsService.connect();
  }

  /**
   * Остановить получение данных
   */
  public stop(): void {
    console.log(`Stopping OrderBookService for ${this.symbol} ${this.marketType}`);
    this.wsService.disconnect();
  }

  /**
   * Получить текущий order book
   */
  public getOrderBook(): OrderBook {
    return { ...this.orderBook };
  }

  /**
   * Подписаться на обновления order book
   */
  public onUpdate(callback: (orderBook: OrderBook) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Отписаться от обновлений
   */
  public offUpdate(callback: (orderBook: OrderBook) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Обработка depth update от Binance
   */
  private handleDepthUpdate(update: BinanceDepthUpdate): void {
    // Обновляем bids
    this.updateOrders(this.orderBook.bids, update.b, 'bid');

    // Обновляем asks
    this.updateOrders(this.orderBook.asks, update.a, 'ask');

    // Обновляем timestamp
    this.orderBook.timestamp = update.E;
    this.orderBook.lastUpdateId = update.u;

    // Валидация
    const validation = validateOrderBook(this.orderBook);
    if (!validation.isValid) {
      console.warn(`Order book validation failed for ${this.symbol}:`, validation.errors);
    }

    // Уведомляем подписчиков
    this.notifyUpdate();
  }

  /**
   * Обновить список ордеров
   */
  private updateOrders(
    orders: Order[],
    updates: [string, string][],
    side: 'bid' | 'ask'
  ): void {
    for (const [priceStr, volumeStr] of updates) {
      const price = parsePrice(priceStr);
      const volume = parseVolume(volumeStr);

      // Если volume = 0, удаляем ордер
      if (volume === 0) {
        const index = orders.findIndex(o => o.price === price);
        if (index !== -1) {
          orders.splice(index, 1);
        }
      } else {
        // Иначе обновляем или добавляем
        const existingIndex = orders.findIndex(o => o.price === price);

        if (existingIndex !== -1) {
          // Обновляем существующий
          orders[existingIndex].volume = volume;
        } else {
          // Добавляем новый
          orders.push({ price, volume });
        }
      }
    }

    // Сортируем
    if (side === 'bid') {
      // Bids: сортируем по убыванию цены
      orders.sort((a, b) => b.price - a.price);
    } else {
      // Asks: сортируем по возрастанию цены
      orders.sort((a, b) => a.price - b.price);
    }
  }

  /**
   * Уведомить подписчиков об обновлении
   */
  private notifyUpdate(): void {
    const orderBookCopy = this.getOrderBook();
    this.updateCallbacks.forEach(callback => {
      try {
        callback(orderBookCopy);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  /**
   * Обработка ошибок WebSocket
   */
  private handleError(error: Error): void {
    console.error(`Error in OrderBookService for ${this.symbol}:`, error);
  }

  /**
   * Обработка изменения статуса WebSocket
   */
  private handleStatusChange(status: string): void {
    console.log(`WebSocket status changed for ${this.symbol}: ${status}`);
  }

  /**
   * Получить лучший bid
   */
  public getBestBid(): Order | null {
    return this.orderBook.bids[0] || null;
  }

  /**
   * Получить лучший ask
   */
  public getBestAsk(): Order | null {
    return this.orderBook.asks[0] || null;
  }

  /**
   * Получить spread
   */
  public getSpread(): number | null {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();

    if (!bestBid || !bestAsk) {
      return null;
    }

    return bestAsk.price - bestBid.price;
  }

  /**
   * Получить mid price
   */
  public getMidPrice(): number | null {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();

    if (!bestBid || !bestAsk) {
      return null;
    }

    return (bestBid.price + bestAsk.price) / 2;
  }

  /**
   * Получить статус WebSocket соединения
   */
  public getWebSocketStatus(): string {
    return this.wsService.getStatus();
  }
}
