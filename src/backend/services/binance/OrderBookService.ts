/**
 * Сервис для управления order book (стакана ордеров)
 * Загружает начальный snapshot через REST API и обновляет данные в реальном времени через WebSocket
 */

import { MarketType, TradingSymbol } from '../../../shared/types/common.types';
import { OrderBook, Order } from '../../types/orderBook.types';
import { BinanceDepthUpdate } from '../../types/binance.types';
import { parsePrice, parseVolume } from '../../utils/helpers/priceHelper';
import { validateOrderBook } from '../../utils/validators/orderBookValidator';
import { BinanceWebSocketService } from './WebSocketService';

export class OrderBookService {
  // Текущее состояние стакана ордеров
  private orderBook: OrderBook;

  // WebSocket сервис для получения обновлений в реальном времени
  private wsService: BinanceWebSocketService;

  // Список callback-функций для уведомления об обновлениях
  private updateCallbacks: Array<(orderBook: OrderBook) => void> = [];

  // Буфер для хранения WebSocket updates до загрузки snapshot
  private updateBuffer: BinanceDepthUpdate[] = [];

  // Флаг: загружен ли начальный snapshot
  private isSnapshotLoaded = false;

  // Время последней перезагрузки snapshot (для rate limiting)
  private lastSnapshotReloadTime = 0;

  // Количество попыток перезагрузки (для exponential backoff)
  private snapshotReloadAttempts = 0;

  // Минимальный интервал между перезагрузками snapshot (предотвращает rate limit)
  private readonly MIN_RELOAD_INTERVAL = 5000;

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

    // Создаем WebSocket сервис с callback-функциями
    this.wsService = new BinanceWebSocketService(
      symbol,
      marketType,
      (update) => this.handleDepthUpdate(update),  // Обработка обновлений
      (error) => this.handleError(error),          // Обработка ошибок
      (status) => this.handleStatusChange(status)  // Обработка изменения статуса
    );
  }

  /**
   * Запустить сервис: подключить WebSocket, загрузить snapshot, применить буферизированные updates
   */
  public async start(): Promise<void> {
    console.log(`Starting OrderBookService for ${this.symbol} ${this.marketType}`);

    // 1. Подключаем WebSocket ПЕРВЫМ (updates будут буферизироваться)
    this.wsService.connect();

    // 2. ИСПРАВЛЕНИЕ: Увеличиваем время ожидания для стабильного соединения
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Загружаем начальный snapshot через REST API
    await this.loadInitialSnapshot();

    // 4. ИСПРАВЛЕНИЕ: Небольшая пауза перед применением updates
    await new Promise(resolve => setTimeout(resolve, 100));

    // 5. Отмечаем, что snapshot загружен (теперь updates будут применяться сразу)
    this.isSnapshotLoaded = true;

    // 6. Применяем все буферизированные updates, которые пришли во время загрузки
    this.applyBufferedUpdates();
  }

  /**
   * Загрузить начальный snapshot order book через REST API Binance
   * Возвращает до 1000 лучших bid и ask ордеров
   */
  private async loadInitialSnapshot(): Promise<void> {
    try {
      // Выбираем URL в зависимости от типа рынка
      const baseUrl = this.marketType === 'SPOT'
        ? 'https://api.binance.com/api/v3/depth'
        : 'https://fapi.binance.com/fapi/v1/depth';

      // ИСПРАВЛЕНИЕ: Увеличиваем лимит до 5000 для глубоких расчётов (30%)
      const url = `${baseUrl}?symbol=${this.symbol}&limit=5000`;

      console.log(`Loading initial snapshot for ${this.symbol} from ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load snapshot: ${response.statusText}`);
      }

      const data = await response.json();

      // Парсим bids (ордера на покупку) из формата [price, volume]
      this.orderBook.bids = data.bids.map((bid: [string, string]) => ({
        price: parsePrice(bid[0]),
        volume: parseVolume(bid[1])
      }));

      // Парсим asks (ордера на продажу) из формата [price, volume]
      this.orderBook.asks = data.asks.map((ask: [string, string]) => ({
        price: parsePrice(ask[0]),
        volume: parseVolume(ask[1])
      }));

      // Сохраняем lastUpdateId для синхронизации с WebSocket updates
      this.orderBook.lastUpdateId = data.lastUpdateId;
      this.orderBook.timestamp = Date.now();

      console.log(`Loaded snapshot for ${this.symbol}: ${this.orderBook.bids.length} bids, ${this.orderBook.asks.length} asks`);

    } catch (error) {
      console.error(`Error loading initial snapshot for ${this.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Остановить сервис и отключить WebSocket
   */
  public stop(): void {
    console.log(`Stopping OrderBookService for ${this.symbol} ${this.marketType}`);
    this.wsService.disconnect();
  }

  /**
   * Получить текущее состояние order book (копию, чтобы избежать изменений извне)
   */
  public getOrderBook(): OrderBook {
    return { ...this.orderBook };
  }

  /**
   * Подписаться на обновления: callback будет вызван при каждом изменении order book
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
   * Обработка depth update от Binance WebSocket
   * До загрузки snapshot - буферизирует updates, после - применяет сразу
   */
  private handleDepthUpdate(update: BinanceDepthUpdate): void {
    // Если snapshot еще не загружен, сохраняем updates в буфер
    if (!this.isSnapshotLoaded) {
      this.updateBuffer.push(update);

      // ИСПРАВЛЕНИЕ: Увеличиваем размер буфера для предотвращения потерь
      if (this.updateBuffer.length > 5000) {
        // Удаляем старые updates, но сохраняем последние
        this.updateBuffer = this.updateBuffer.slice(-5000);
      }
      return;
    }

    // Snapshot загружен - применяем update сразу
    this.applyUpdate(update);
  }

  /**
   * Применить WebSocket update к order book
   * Проверяет на пропущенные updates (gap) и валидирует результат
   */
  private applyUpdate(update: BinanceDepthUpdate): void {
    if (this.orderBook.lastUpdateId !== undefined) {
      // Пропускаем старые updates (уже учтены в snapshot)
      if (update.u <= this.orderBook.lastUpdateId) {
        return;
      }

      // ИСПРАВЛЕНИЕ: Проверяем на пропущенные updates (gap)
      // Согласно Binance API: первый update в событии (update.U) должен быть <= lastUpdateId + 1
      // И последний update в событии (update.u) должен быть >= lastUpdateId + 1
      // Это позволяет обрабатывать события, которые перекрывают текущий lastUpdateId

      // Если первый update в событии идёт ПОСЛЕ ожидаемого (пропуск updates)
      if (update.U > this.orderBook.lastUpdateId + 1) {
        const gap = update.U - this.orderBook.lastUpdateId - 1;

        // Игнорируем небольшие gaps (< 10 updates) - они могут быть из-за сетевых задержек
        if (gap >= 10) {
          console.warn(`Gap in updates detected for ${this.symbol}: expected ${this.orderBook.lastUpdateId + 1}, got ${update.U} (gap: ${gap} updates). Attempting to reload snapshot...`);
          // Перезагружаем snapshot при обнаружении gap (с rate limiting)
          this.reloadSnapshot();
          return;
        }
      }
    }

    // Обновляем bids (ордера на покупку)
    this.updateOrders(this.orderBook.bids, update.b, 'bid');

    // Обновляем asks (ордера на продажу)
    this.updateOrders(this.orderBook.asks, update.a, 'ask');

    // Обновляем timestamp и lastUpdateId
    this.orderBook.timestamp = update.E;
    this.orderBook.lastUpdateId = update.u;

    // Валидируем order book (проверяем корректность данных)
    const validation = validateOrderBook(this.orderBook);
    if (!validation.isValid) {
      console.warn(`Order book validation failed for ${this.symbol}:`, validation.errors);
    }

    // Уведомляем всех подписчиков об обновлении
    this.notifyUpdate();
  }

  /**
   * Применить все буферизированные updates после загрузки snapshot
   * Фильтрует только те updates, которые новее snapshot
   */
  private applyBufferedUpdates(): void {
    console.log(`Applying ${this.updateBuffer.length} buffered updates for ${this.symbol}`);

    // ИСПРАВЛЕНИЕ: Фильтруем правильно согласно Binance API документации
    // Update применяется если: update.u >= lastUpdateId + 1 И update.U <= lastUpdateId + 1
    const relevantUpdates = this.updateBuffer.filter(update => {
      const lastId = this.orderBook.lastUpdateId || 0;
      // Update должен перекрывать или быть сразу после lastUpdateId
      return update.U <= lastId + 1 && update.u >= lastId + 1;
    });

    console.log(`Found ${relevantUpdates.length} relevant updates to apply out of ${this.updateBuffer.length} buffered`);

    // Сортируем updates по возрастанию U (первый update ID в событии)
    relevantUpdates.sort((a, b) => a.U - b.U);

    // Применяем updates по порядку
    for (const update of relevantUpdates) {
      this.applyUpdate(update);
    }

    // Очищаем буфер
    this.updateBuffer = [];
  }

  /**
   * Перезагрузить snapshot при обнаружении gap
   * Использует rate limiting (минимум 5 сек между попытками) и exponential backoff
   */
  private async reloadSnapshot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastReload = now - this.lastSnapshotReloadTime;

    // Rate limiting: минимум 5 секунд между перезагрузками
    if (timeSinceLastReload < this.MIN_RELOAD_INTERVAL) {
      console.log(`Skipping snapshot reload for ${this.symbol}: too soon (${timeSinceLastReload}ms < ${this.MIN_RELOAD_INTERVAL}ms)`);
      return;
    }

    // Exponential backoff: задержка удваивается с каждой попыткой (1s, 2s, 4s, 8s, ... до 30s)
    const backoffDelay = Math.min(1000 * Math.pow(2, this.snapshotReloadAttempts), 30000);
    if (this.snapshotReloadAttempts > 0 && timeSinceLastReload < backoffDelay) {
      console.log(`Skipping snapshot reload for ${this.symbol}: backoff delay (${timeSinceLastReload}ms < ${backoffDelay}ms)`);
      return;
    }

    console.log(`Reloading snapshot for ${this.symbol}... (attempt ${this.snapshotReloadAttempts + 1})`);

    // Временно отключаем обработку updates
    this.isSnapshotLoaded = false;
    this.updateBuffer = [];
    this.lastSnapshotReloadTime = now;

    try {
      // ИСПРАВЛЕНИЕ: Очищаем старый order book перед загрузкой нового
      this.orderBook.bids = [];
      this.orderBook.asks = [];

      // Загружаем новый snapshot
      await this.loadInitialSnapshot();
      this.isSnapshotLoaded = true;
      this.snapshotReloadAttempts = 0; // Сбрасываем счетчик при успехе
      console.log(`Snapshot reloaded for ${this.symbol}`);
    } catch (error) {
      console.error(`Failed to reload snapshot for ${this.symbol}:`, error);
      this.snapshotReloadAttempts++; // Увеличиваем счетчик для exponential backoff
      this.isSnapshotLoaded = true;   // Продолжаем работать с текущими данными
    }
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

      // ОТЛАДКА: Логируем удаления (только первые 3 для каждой стороны)
      if (volume === 0 && Math.random() < 0.01) {
        console.log(`[${side.toUpperCase()}] Удаление: цена=${price}, volume_str="${volumeStr}"`);
      }

      // Если volume = 0, удаляем ордер согласно Binance документации
      if (volume === 0) {
        const index = orders.findIndex(o => o.price === price);
        if (index !== -1) {
          orders.splice(index, 1);
        }
      } else {
        // Обновляем или добавляем
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

    // Сортируем ордера
    if (side === 'bid') {
      // Bids: сортируем по убыванию цены
      orders.sort((a, b) => b.price - a.price);
    } else {
      // Asks: сортируем по возрастанию цены
      orders.sort((a, b) => a.price - b.price);
    }

    // ИСПРАВЛЕНИЕ: Ограничиваем размер order book чтобы не переполнить память
    // Оставляем максимум 10000 ордеров с каждой стороны
    if (orders.length > 10000) {
      orders.splice(10000);
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
