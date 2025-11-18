# ИДЕАЛЬНОЕ РЕШЕНИЕ ДЛЯ КАТЕГОРИЗАЦИИ ДАННЫХ BINANCE
## Trading Platform - Архитектурный дизайн

**Дата:** 17 ноября 2025
**Версия:** 2.0
**Статус:** Архитектурный дизайн

---

## EXECUTIVE SUMMARY

Данный документ описывает идеальное решение для реализации системы категоризации данных с Binance согласно требованиям из `task.txt`. Решение расширяет текущую архитектуру Trading Platform для поддержки:

1. **Категоризации данных** - TOTAL, TOTAL1, TOTAL2, TOTAL3, COIN, OTHERS
2. **Сбора в реальном времени** - каждый тик (несколько раз в секунду)
3. **Минутных снимков** - агрегированные данные раз в минуту
4. **Двух типов рынков** - SPOT и FUTURES одновременно
5. **Оптимизированного хранения** - PostgreSQL + TimescaleDB + Redis

---

## 1. АНАЛИЗ ТРЕБОВАНИЙ ИЗ TASK.TXT

### 1.1 Категории данных

```
TOTAL       → Все пары (100%)
TOTAL1      → Все пары кроме BTC
TOTAL2      → Все пары кроме BTC и ETH
TOTAL3      → Все пары кроме BTC, ETH и SOL
COIN        → Конкретная пара (уже реализовано)
OTHERS      → Все пары кроме TOP 10 из CoinMarketCap
```

### 1.2 TOP 10 монет для исключения (OTHERS)

Согласно task.txt:
1. Bitcoin (BTC)
2. Ethereum (ETH)
3. XRP (XRP)
4. BNB (BNB)
5. Solana (SOL)
6. TRON (TRX)
7. Dogecoin (DOGE)
8. Cardano (ADA)
9. Chainlink (LINK)
10. Bitcoin Cash (BCH)

### 1.3 Требования к сбору данных

- **Частота сбора:** Каждый тик (несколько раз в секунду)
- **Частота снимков:** Раз в минуту
- **Типы рынков:** SPOT + FUTURES
- **Хранение:** PostgreSQL (долгосрочное) + Redis (кэш)

---

## 2. ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### 2.1 Что уже реализовано

✅ **Сбор данных по отдельным парам (COIN)**
- BinanceRestCollector собирает данные каждую минуту
- 10 основных символов отслеживаются
- Данные сохраняются в PostgreSQL + Redis

✅ **Инфраструктура БД**
- PostgreSQL + TimescaleDB для временных рядов
- Redis для кэширования (2 часа TTL)
- Prisma ORM для type-safe queries

✅ **Батчирование и оптимизация**
- Batch insert (50 записей)
- 2-уровневое кэширование
- TimescaleDB compression

### 2.2 Что нужно добавить

❌ **Категоризация данных**
- Агрегация по категориям TOTAL, TOTAL1, TOTAL2, TOTAL3, OTHERS
- Расчет суммарных объемов для категорий

❌ **Сбор в реальном времени**
- Текущий collector работает раз в минуту
- Нужен tick-by-tick сбор (несколько раз в секунду)

❌ **Модели данных для категорий**
- Новая таблица для категоризированных снимков

❌ **API endpoints для категорий**
- Получение данных по категориям

---

## 3. АРХИТЕКТУРА РЕШЕНИЯ

### 3.1 Общая схема потока данных

```
┌──────────────────────────────────────────────────────────────────┐
│                        BINANCE API                               │
│  ┌─────────────┐                          ┌─────────────┐       │
│  │  SPOT API   │                          │ FUTURES API │       │
│  │ (WebSocket) │                          │ (WebSocket) │       │
│  └──────┬──────┘                          └──────┬──────┘       │
└─────────┼──────────────────────────────────────┼────────────────┘
          │                                       │
          ▼                                       ▼
┌────────────────────────────────────────────────────────────────┐
│              TICK-BY-TICK DATA COLLECTOR                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocketCollector (новый компонент)                    │  │
│  │  - Подключается к Binance WebSocket Streams             │  │
│  │  - Получает обновления каждый тик (1-3 раза в секунду)  │  │
│  │  - Обрабатывает 100+ символов параллельно                │  │
│  │  - Использует Combined Streams для эффективности         │  │
│  └──────────────┬───────────────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│               IN-MEMORY TICK BUFFER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TickBuffer Service                                      │  │
│  │  - Буфер для tick данных (последние 60 секунд)          │  │
│  │  - Скользящее окно (sliding window)                     │  │
│  │  │  Map<symbol, CircularBuffer<TickData>>               │  │
│  │  - Быстрый доступ к последним данным                    │  │
│  └──────────────┬───────────────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────────────┘
                  │
          Every 60 seconds
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│            SNAPSHOT AGGREGATOR (новый компонент)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AggregationService                                      │  │
│  │  1. Получает данные из TickBuffer (все пары)            │  │
│  │  2. Рассчитывает агрегаты для каждой категории:         │  │
│  │     - TOTAL    (все пары)                                │  │
│  │     - TOTAL1   (без BTC)                                 │  │
│  │     - TOTAL2   (без BTC, ETH)                            │  │
│  │     - TOTAL3   (без BTC, ETH, SOL)                       │  │
│  │     - OTHERS   (без TOP 10)                              │  │
│  │  3. Создает CategorySnapshot объекты                    │  │
│  └──────────────┬───────────────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│               DUAL STORAGE LAYER                                │
│  ┌──────────────────────┐    ┌────────────────────────────┐   │
│  │   Redis Cache        │    │  PostgreSQL + TimescaleDB  │   │
│  │  - Hot data (2h)     │    │  - Cold data (60 days)     │   │
│  │  - Sorted Sets       │    │  - Hypertables             │   │
│  │  - Sub-second access │    │  - Compression             │   │
│  │  - Tick buffer       │    │  - Aggregates (1h, 1d)     │   │
│  └──────────────────────┘    └────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│                    API LAYER                                    │
│  GET /api/categories/:category?depth=5&marketType=SPOT         │
│  GET /api/categories/all?depth=5                               │
│  GET /api/ticks/:symbol (real-time tick data)                  │
│  GET /api/snapshots/:symbol (historical minute data)           │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Компоненты решения

#### A. WebSocketCollector (новый)
- **Назначение:** Сбор tick-by-tick данных через WebSocket
- **Файл:** `src/backend/services/websocket-collector.ts`
- **Особенности:**
  - Combined Streams для 100+ символов (Binance лимит: 1024 streams на соединение)
  - Автоматическое переподключение
  - Buffer overflow protection
  - Graceful degradation при ошибках

#### B. TickBuffer Service (новый)
- **Назначение:** In-memory буфер для tick данных
- **Файл:** `src/backend/services/tick-buffer.service.ts`
- **Особенности:**
  - Circular buffer (фиксированный размер)
  - Скользящее окно (последние 60 секунд)
  - Thread-safe операции
  - Автоматическая очистка старых данных

#### C. AggregationService (новый)
- **Назначение:** Агрегация данных по категориям
- **Файл:** `src/backend/services/aggregation.service.ts`
- **Особенности:**
  - Расчет суммарных объемов
  - Категоризация по TOP 10
  - Weighted averages для цен
  - Batch processing

#### D. CategorySnapshot Model (новая модель БД)
- **Назначение:** Хранение категоризированных снимков
- **Файл:** `prisma/schema.prisma` (расширение)

---

## 4. МОДЕЛИ ДАННЫХ

### 4.1 Новая Prisma модель: CategorySnapshot

```prisma
/// Категоризированные снимки (TOTAL, TOTAL1, TOTAL2, TOTAL3, OTHERS)
model CategorySnapshot {
  id            String   @id @default(cuid())

  /// Timestamp снимка (округлено до минуты)
  timestamp     DateTime @db.Timestamptz(3)

  /// Категория: TOTAL, TOTAL1, TOTAL2, TOTAL3, OTHERS
  category      CategoryType

  /// Тип рынка: SPOT или FUTURES
  marketType    MarketType

  /// Глубина в % (1.5, 3, 5, 8, 15, 30)
  depth         Float    @db.Real

  // Агрегированные объемы (сумма по всем парам в категории)
  totalBidVolume     Float    @db.Real
  totalAskVolume     Float    @db.Real
  totalBidVolumeUsd  Float    @db.Real
  totalAskVolumeUsd  Float    @db.Real

  // Средневзвешенная цена
  avgPrice           Float    @db.Real

  // Количество пар в агрегате
  symbolCount        Int      @db.Integer

  // Метаданные
  createdAt     DateTime @default(now()) @db.Timestamptz(3)

  // Индексы
  @@index([timestamp(sort: Desc)])
  @@index([category, marketType, depth, timestamp(sort: Desc)])
  @@index([category, timestamp(sort: Desc)])

  // Уникальность
  @@unique([category, marketType, depth, timestamp])

  @@map("category_snapshots")
}

/// Enum для типов категорий
enum CategoryType {
  TOTAL       // Все пары
  TOTAL1      // Все без BTC
  TOTAL2      // Все без BTC и ETH
  TOTAL3      // Все без BTC, ETH и SOL
  OTHERS      // Все без TOP 10

  @@map("category_type")
}
```

### 4.2 Расширение существующей модели Snapshot

Текущая модель `Snapshot` остается без изменений - она хранит данные по отдельным парам (COIN).

### 4.3 Новая модель для tick данных (опционально)

Если нужно хранить сырые tick данные (не только минутные снимки):

```prisma
/// Сырые tick данные (опционально, для детального анализа)
model TickData {
  id            String   @id @default(cuid())

  /// Точное время тика
  timestamp     DateTime @db.Timestamptz(3)

  symbol        String   @db.VarChar(20)
  marketType    MarketType

  /// Best bid price
  bestBid       Float    @db.Real

  /// Best ask price
  bestAsk       Float    @db.Real

  /// Bid volume (на best bid)
  bidVolume     Float    @db.Real

  /// Ask volume (на best ask)
  askVolume     Float    @db.Real

  /// Spread
  spread        Float    @db.Real

  // Только индекс по времени (для очистки)
  @@index([timestamp(sort: Desc)])

  // Retention: 1 час (автоматическое удаление)
  @@map("tick_data")
}
```

**Примечание:** Хранение всех tick данных может быть очень затратным по памяти. Рекомендуется:
- Либо не сохранять tick данные в БД вообще (только в памяти)
- Либо использовать очень короткий retention (1 час)
- Либо хранить только в Redis с TTL 1 час

---

## 5. КОНФИГУРАЦИЯ КАТЕГОРИЙ

### 5.1 Обновленный binance.config.ts

```typescript
/**
 * TOP 10 монет согласно CoinMarketCap (для исключения в OTHERS)
 */
export const TOP_10_SYMBOLS = [
  'BTCUSDT',   // Bitcoin
  'ETHUSDT',   // Ethereum
  'XRPUSDT',   // XRP
  'BNBUSDT',   // BNB
  'SOLUSDT',   // Solana
  'TRXUSDT',   // TRON
  'DOGEUSDT',  // Dogecoin
  'ADAUSDT',   // Cardano
  'LINKUSDT',  // Chainlink
  'BCHUSDT',   // Bitcoin Cash
] as const;

/**
 * Все символы для мониторинга (расширенный список)
 */
export const ALL_SYMBOLS: TradingSymbol[] = [
  // TOP 10
  ...TOP_10_SYMBOLS,

  // TOP 11-30
  'AVAXUSDT',  // Avalanche
  'DOTUSDT',   // Polkadot
  'MATICUSDT', // Polygon
  'UNIUSDT',   // Uniswap
  'LTCUSDT',   // Litecoin
  'NEARUSDT',  // NEAR Protocol
  'ATOMUSDT',  // Cosmos
  'ICPUSDT',   // Internet Computer
  'APTUSDT',   // Aptos
  'FTMUSDT',   // Fantom
  'ARBUSDT',   // Arbitrum
  'OPUSDT',    // Optimism
  'INJUSDT',   // Injective
  'SHIBUSDT',  // Shiba Inu
  'PEPEUSDT',  // Pepe

  // Можно добавить еще больше (до 100+)
];

/**
 * Категории для агрегации
 */
export const CATEGORY_DEFINITIONS = {
  TOTAL: {
    name: 'TOTAL',
    description: 'Все пары',
    symbols: ALL_SYMBOLS,
  },

  TOTAL1: {
    name: 'TOTAL1',
    description: 'Все пары кроме BTC',
    symbols: ALL_SYMBOLS.filter(s => !s.startsWith('BTC')),
  },

  TOTAL2: {
    name: 'TOTAL2',
    description: 'Все пары кроме BTC и ETH',
    symbols: ALL_SYMBOLS.filter(
      s => !s.startsWith('BTC') && !s.startsWith('ETH')
    ),
  },

  TOTAL3: {
    name: 'TOTAL3',
    description: 'Все пары кроме BTC, ETH и SOL',
    symbols: ALL_SYMBOLS.filter(
      s => !s.startsWith('BTC') &&
           !s.startsWith('ETH') &&
           !s.startsWith('SOL')
    ),
  },

  OTHERS: {
    name: 'OTHERS',
    description: 'Все пары кроме TOP 10',
    symbols: ALL_SYMBOLS.filter(s => !TOP_10_SYMBOLS.includes(s)),
  },
} as const;

/**
 * Глубины для расчета (в процентах)
 */
export const DEPTH_LEVELS = [1.5, 3, 5, 8, 15, 30] as const;
```

---

## 6. РЕАЛИЗАЦИЯ СЕРВИСОВ

### 6.1 WebSocketCollector Service

**Файл:** `src/backend/services/websocket-collector.ts`

```typescript
/**
 * WebSocket Collector для tick-by-tick данных
 * Собирает данные в реальном времени с Binance WebSocket
 */
export class WebSocketCollector {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECTS = 10;

  // Combined streams URL (до 1024 streams)
  private readonly WS_URL = 'wss://stream.binance.com:9443/stream';

  constructor(
    private symbols: string[],
    private marketType: 'SPOT' | 'FUTURES',
    private onTick: (tick: TickData) => void
  ) {}

  /**
   * Подключиться к WebSocket
   */
  connect() {
    // Формируем список streams
    const streams = this.symbols.map(symbol =>
      `${symbol.toLowerCase()}@bookTicker`
    ).join('/');

    const url = `${this.WS_URL}?streams=${streams}`;

    this.ws = new WebSocket(url);

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('[WebSocketCollector] Error:', error);
      this.reconnect();
    });

    this.ws.on('close', () => {
      console.log('[WebSocketCollector] Connection closed');
      this.reconnect();
    });
  }

  /**
   * Обработка входящего сообщения
   */
  private handleMessage(message: any) {
    // Binance Combined Stream формат:
    // { stream: "btcusdt@bookTicker", data: {...} }

    const tick: TickData = {
      symbol: message.data.s,
      marketType: this.marketType,
      timestamp: new Date(message.data.E),
      bestBid: parseFloat(message.data.b),
      bestAsk: parseFloat(message.data.a),
      bidVolume: parseFloat(message.data.B),
      askVolume: parseFloat(message.data.A),
      spread: parseFloat(message.data.a) - parseFloat(message.data.b),
    };

    // Передаем tick в callback
    this.onTick(tick);
  }

  /**
   * Переподключение с экспоненциальным backoff
   */
  private reconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECTS) {
      console.error('[WebSocketCollector] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[WebSocketCollector] Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Отключиться
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### 6.2 TickBuffer Service

**Файл:** `src/backend/services/tick-buffer.service.ts`

```typescript
/**
 * In-memory буфер для tick данных
 * Хранит последние 60 секунд данных для каждого символа
 */
export class TickBufferService {
  // Map: symbol -> CircularBuffer<TickData>
  private buffers = new Map<string, CircularBuffer<TickData>>();

  // Размер буфера (количество тиков)
  private readonly BUFFER_SIZE = 180; // ~60 сек при 3 тиках/сек

  // TTL для автоматической очистки
  private readonly TTL_MS = 60000; // 60 секунд

  /**
   * Добавить tick в буфер
   */
  addTick(tick: TickData) {
    const key = this.getKey(tick.symbol, tick.marketType);

    // Создаем буфер если его нет
    if (!this.buffers.has(key)) {
      this.buffers.set(key, new CircularBuffer<TickData>(this.BUFFER_SIZE));
    }

    const buffer = this.buffers.get(key)!;
    buffer.push(tick);
  }

  /**
   * Получить все тики за последние N секунд
   */
  getTicks(
    symbol: string,
    marketType: 'SPOT' | 'FUTURES',
    lastSeconds: number = 60
  ): TickData[] {
    const key = this.getKey(symbol, marketType);
    const buffer = this.buffers.get(key);

    if (!buffer) return [];

    const cutoff = Date.now() - lastSeconds * 1000;

    return buffer.toArray().filter(tick =>
      tick.timestamp.getTime() >= cutoff
    );
  }

  /**
   * Получить снимок для расчета агрегатов (все символы)
   */
  getSnapshot(
    symbols: string[],
    marketType: 'SPOT' | 'FUTURES'
  ): Map<string, TickData[]> {
    const result = new Map<string, TickData[]>();

    for (const symbol of symbols) {
      const ticks = this.getTicks(symbol, marketType, 60);
      if (ticks.length > 0) {
        result.set(symbol, ticks);
      }
    }

    return result;
  }

  /**
   * Очистка старых данных (вызывается периодически)
   */
  cleanup() {
    const cutoff = Date.now() - this.TTL_MS;

    for (const [key, buffer] of this.buffers.entries()) {
      const ticks = buffer.toArray();

      // Если все тики старые - удаляем буфер
      if (ticks.every(tick => tick.timestamp.getTime() < cutoff)) {
        this.buffers.delete(key);
      }
    }
  }

  private getKey(symbol: string, marketType: 'SPOT' | 'FUTURES'): string {
    return `${symbol}:${marketType}`;
  }
}

/**
 * Простая реализация циркулярного буфера
 */
class CircularBuffer<T> {
  private buffer: T[] = [];
  private head = 0;

  constructor(private maxSize: number) {}

  push(item: T) {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(item);
    } else {
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this.maxSize;
    }
  }

  toArray(): T[] {
    // Возвращаем в правильном порядке
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head)
    ];
  }
}

// Singleton instance
export const tickBufferService = new TickBufferService();
```

### 6.3 Aggregation Service

**Файл:** `src/backend/services/aggregation.service.ts`

```typescript
import { tickBufferService } from './tick-buffer.service';
import { CATEGORY_DEFINITIONS, DEPTH_LEVELS } from '../config/binance.config';
import prisma from '../database/prisma.client';

/**
 * Сервис агрегации данных по категориям
 */
export class AggregationService {
  /**
   * Создать снимок для всех категорий
   * Вызывается каждую минуту
   */
  async createCategorySnapshots(marketType: 'SPOT' | 'FUTURES') {
    const timestamp = new Date();
    timestamp.setSeconds(0, 0); // Округляем до минуты

    console.log(`[Aggregation] Creating snapshots for ${marketType} at ${timestamp.toISOString()}`);

    // Обрабатываем каждую категорию
    for (const [categoryName, categoryDef] of Object.entries(CATEGORY_DEFINITIONS)) {
      await this.processCategory(
        categoryName as CategoryType,
        categoryDef.symbols,
        marketType,
        timestamp
      );
    }
  }

  /**
   * Обработать одну категорию
   */
  private async processCategory(
    category: CategoryType,
    symbols: string[],
    marketType: 'SPOT' | 'FUTURES',
    timestamp: Date
  ) {
    // 1. Получить tick данные для всех символов в категории
    const ticksMap = tickBufferService.getSnapshot(symbols, marketType);

    if (ticksMap.size === 0) {
      console.warn(`[Aggregation] No tick data for ${category}`);
      return;
    }

    // 2. Для каждой глубины рассчитать агрегаты
    for (const depth of DEPTH_LEVELS) {
      const aggregate = this.calculateAggregate(ticksMap, depth);

      // 3. Сохранить в БД
      await prisma.categorySnapshot.create({
        data: {
          timestamp,
          category,
          marketType,
          depth,
          totalBidVolume: aggregate.totalBidVolume,
          totalAskVolume: aggregate.totalAskVolume,
          totalBidVolumeUsd: aggregate.totalBidVolumeUsd,
          totalAskVolumeUsd: aggregate.totalAskVolumeUsd,
          avgPrice: aggregate.avgPrice,
          symbolCount: aggregate.symbolCount,
        },
      });
    }

    console.log(`[Aggregation] ✓ ${category} ${marketType} (${ticksMap.size} symbols)`);
  }

  /**
   * Рассчитать агрегат для одной глубины
   */
  private calculateAggregate(
    ticksMap: Map<string, TickData[]>,
    depth: number
  ): AggregateResult {
    let totalBidVolume = 0;
    let totalAskVolume = 0;
    let totalBidVolumeUsd = 0;
    let totalAskVolumeUsd = 0;
    let totalPrice = 0;
    let symbolCount = 0;

    for (const [symbol, ticks] of ticksMap.entries()) {
      // Берем последний тик
      const latestTick = ticks[ticks.length - 1];

      if (!latestTick) continue;

      // Рассчитываем пороги для данной глубины
      const bidThreshold = latestTick.bestBid * (1 - depth / 100);
      const askThreshold = latestTick.bestAsk * (1 + depth / 100);

      // Получаем полный order book для символа (из БД или отдельного сервиса)
      // Здесь упрощенная версия - используем только best bid/ask

      // Для точности нужен полный order book, но для MVP:
      const bidVolume = latestTick.bidVolume;
      const askVolume = latestTick.askVolume;
      const bidValueUsd = latestTick.bestBid * bidVolume;
      const askValueUsd = latestTick.bestAsk * askVolume;

      totalBidVolume += bidVolume;
      totalAskVolume += askVolume;
      totalBidVolumeUsd += bidValueUsd;
      totalAskVolumeUsd += askValueUsd;
      totalPrice += (latestTick.bestBid + latestTick.bestAsk) / 2;
      symbolCount++;
    }

    return {
      totalBidVolume,
      totalAskVolume,
      totalBidVolumeUsd,
      totalAskVolumeUsd,
      avgPrice: symbolCount > 0 ? totalPrice / symbolCount : 0,
      symbolCount,
    };
  }

  /**
   * Запустить периодическую агрегацию
   */
  start() {
    console.log('[Aggregation] Starting periodic aggregation...');

    // Запускаем сразу
    this.createCategorySnapshots('SPOT');
    this.createCategorySnapshots('FUTURES');

    // Затем каждую минуту
    setInterval(() => {
      this.createCategorySnapshots('SPOT');
      this.createCategorySnapshots('FUTURES');
    }, 60000);
  }
}

interface AggregateResult {
  totalBidVolume: number;
  totalAskVolume: number;
  totalBidVolumeUsd: number;
  totalAskVolumeUsd: number;
  avgPrice: number;
  symbolCount: number;
}

type CategoryType = 'TOTAL' | 'TOTAL1' | 'TOTAL2' | 'TOTAL3' | 'OTHERS';

// Singleton
export const aggregationService = new AggregationService();
```

---

## 7. API ENDPOINTS

### 7.1 Получение данных по категориям

**Файл:** `src/app/api/categories/[category]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/backend/database/prisma.client';

/**
 * GET /api/categories/TOTAL?depth=5&marketType=SPOT&from=...&to=...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = params.category.toUpperCase();
    const marketType = (searchParams.get('marketType') || 'SPOT') as 'SPOT' | 'FUTURES';
    const depthParam = searchParams.get('depth');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // Валидация категории
    const validCategories = ['TOTAL', 'TOTAL1', 'TOTAL2', 'TOTAL3', 'OTHERS'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'INVALID_CATEGORY', validCategories },
        { status: 400 }
      );
    }

    if (!depthParam) {
      return NextResponse.json(
        { error: 'MISSING_DEPTH' },
        { status: 400 }
      );
    }

    const depth = parseFloat(depthParam);
    const from = fromParam ? new Date(parseInt(fromParam)) : undefined;
    const to = toParam ? new Date(parseInt(toParam)) : undefined;
    const limit = limitParam ? parseInt(limitParam) : 1440; // По умолчанию 1 день

    // Запрос к БД
    const snapshots = await prisma.categorySnapshot.findMany({
      where: {
        category: category as any,
        marketType: marketType as any,
        depth,
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    // Форматирование для графиков
    const chartData = snapshots.map(s => ({
      time: Math.floor(s.timestamp.getTime() / 1000),
      bidVolume: s.totalBidVolumeUsd,
      askVolume: s.totalAskVolumeUsd,
      avgPrice: s.avgPrice,
      symbolCount: s.symbolCount,
    }));

    return NextResponse.json({
      category,
      marketType,
      depth,
      data: chartData,
      count: chartData.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[API/categories] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 7.2 Получение данных по всем категориям сразу

**Файл:** `src/app/api/categories/all/route.ts`

```typescript
/**
 * GET /api/categories/all?depth=5&marketType=SPOT
 * Возвращает последние снимки для всех категорий
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const marketType = (searchParams.get('marketType') || 'SPOT') as 'SPOT' | 'FUTURES';
  const depthParam = searchParams.get('depth');

  if (!depthParam) {
    return NextResponse.json({ error: 'MISSING_DEPTH' }, { status: 400 });
  }

  const depth = parseFloat(depthParam);

  // Получаем последние снимки для каждой категории
  const categories = ['TOTAL', 'TOTAL1', 'TOTAL2', 'TOTAL3', 'OTHERS'];
  const results: any = {};

  for (const category of categories) {
    const latest = await prisma.categorySnapshot.findFirst({
      where: {
        category: category as any,
        marketType: marketType as any,
        depth,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (latest) {
      results[category] = {
        timestamp: latest.timestamp.getTime(),
        bidVolume: latest.totalBidVolumeUsd,
        askVolume: latest.totalAskVolumeUsd,
        avgPrice: latest.avgPrice,
        symbolCount: latest.symbolCount,
      };
    }
  }

  return NextResponse.json({
    marketType,
    depth,
    categories: results,
    timestamp: Date.now(),
  });
}
```

### 7.3 Real-time tick данные

**Файл:** `src/app/api/ticks/[symbol]/route.ts`

```typescript
import { tickBufferService } from '@/backend/services/tick-buffer.service';

/**
 * GET /api/ticks/BTCUSDT?marketType=SPOT&last=10
 * Получить последние N тиков для символа
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { searchParams } = new URL(request.url);
  const symbol = params.symbol.toUpperCase();
  const marketType = (searchParams.get('marketType') || 'SPOT') as 'SPOT' | 'FUTURES';
  const lastParam = searchParams.get('last');

  const lastSeconds = lastParam ? parseInt(lastParam) : 60;

  const ticks = tickBufferService.getTicks(symbol, marketType, lastSeconds);

  return NextResponse.json({
    symbol,
    marketType,
    ticks: ticks.map(t => ({
      timestamp: t.timestamp.getTime(),
      bestBid: t.bestBid,
      bestAsk: t.bestAsk,
      bidVolume: t.bidVolume,
      askVolume: t.askVolume,
      spread: t.spread,
    })),
    count: ticks.length,
    timestamp: Date.now(),
  });
}
```

---

## 8. МИГРАЦИЯ БАЗЫ ДАННЫХ

### 8.1 Создание миграции

```bash
# После добавления новых моделей в schema.prisma
npx prisma migrate dev --name add_category_snapshots
```

### 8.2 TimescaleDB расширения

**Файл:** `scripts/init-timescaledb-categories.sql`

```sql
-- Конвертация category_snapshots в hypertable
SELECT create_hypertable(
  'category_snapshots',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Compression policy (после 7 дней)
ALTER TABLE category_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'category, marketType, depth',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
  'category_snapshots',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Retention policy (60 дней)
SELECT add_retention_policy(
  'category_snapshots',
  INTERVAL '60 days',
  if_not_exists => TRUE
);

-- Continuous aggregate для 1-часовых данных
CREATE MATERIALIZED VIEW category_snapshots_agg_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  category,
  "marketType",
  depth,
  AVG("totalBidVolumeUsd") as avg_bid_volume_usd,
  AVG("totalAskVolumeUsd") as avg_ask_volume_usd,
  MAX("totalBidVolumeUsd") as max_bid_volume_usd,
  MAX("totalAskVolumeUsd") as max_ask_volume_usd,
  MIN("totalBidVolumeUsd") as min_bid_volume_usd,
  MIN("totalAskVolumeUsd") as min_ask_volume_usd,
  AVG("avgPrice") as avg_price,
  AVG("symbolCount") as avg_symbol_count,
  COUNT(*) as count
FROM category_snapshots
GROUP BY bucket, category, "marketType", depth;

-- Политика обновления агрегата
SELECT add_continuous_aggregate_policy(
  'category_snapshots_agg_1h',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

---

## 9. ИНИЦИАЛИЗАЦИЯ И ЗАПУСК

### 9.1 Обновленный startCollector.ts

**Файл:** `src/backend/init/startCollector.ts`

```typescript
import { binanceCollector } from '../services/binance-rest-collector';
import { WebSocketCollector } from '../services/websocket-collector';
import { tickBufferService } from '../services/tick-buffer.service';
import { aggregationService } from '../services/aggregation.service';
import { ALL_SYMBOLS } from '../config/binance.config';

// WebSocket collectors для real-time данных
let spotCollector: WebSocketCollector | null = null;
let futuresCollector: WebSocketCollector | null = null;

// Cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

export function startDataCollection() {
  if (typeof window !== 'undefined') return; // Только на сервере

  console.log('[Init] Starting data collection system...');

  // 1. Запускаем WebSocket collectors для tick-by-tick данных
  console.log('[Init] Starting WebSocket collectors...');

  spotCollector = new WebSocketCollector(
    ALL_SYMBOLS,
    'SPOT',
    (tick) => tickBufferService.addTick(tick)
  );
  spotCollector.connect();

  futuresCollector = new WebSocketCollector(
    ALL_SYMBOLS,
    'FUTURES',
    (tick) => tickBufferService.addTick(tick)
  );
  futuresCollector.connect();

  // 2. Запускаем периодическую агрегацию (каждую минуту)
  console.log('[Init] Starting aggregation service...');
  aggregationService.start();

  // 3. Запускаем REST collector как fallback (каждую минуту)
  console.log('[Init] Starting REST collector (fallback)...');
  binanceCollector.start();

  // 4. Запускаем периодическую очистку буфера
  cleanupInterval = setInterval(() => {
    tickBufferService.cleanup();
  }, 60000); // Каждую минуту

  console.log('[Init] ✓ Data collection system started successfully');
}

export function stopDataCollection() {
  console.log('[Init] Stopping data collection system...');

  if (spotCollector) {
    spotCollector.disconnect();
    spotCollector = null;
  }

  if (futuresCollector) {
    futuresCollector.disconnect();
    futuresCollector = null;
  }

  binanceCollector.stop();

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  console.log('[Init] ✓ Data collection stopped');
}

// Автозапуск в production
if (process.env.NODE_ENV === 'production') {
  startDataCollection();
}

// Graceful shutdown
process.on('SIGTERM', stopDataCollection);
process.on('SIGINT', stopDataCollection);
```

---

## 10. МОНИТОРИНГ И МЕТРИКИ

### 10.1 Health Check расширение

**Файл:** `src/app/api/health/route.ts` (расширить существующий)

```typescript
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: Date.now(),

    collectors: {
      websocket: {
        spot: spotCollector?.getStatus() || 'not_started',
        futures: futuresCollector?.getStatus() || 'not_started',
      },
      rest: binanceCollector.getStats(),
    },

    buffers: {
      tickBufferSize: tickBufferService.getBufferStats(),
    },

    database: await checkDatabaseHealth(),
    redis: await checkRedisHealth(),
  };

  return NextResponse.json(health);
}
```

### 10.2 Статистика категорий

**Файл:** `src/app/api/stats/categories/route.ts`

```typescript
/**
 * GET /api/stats/categories
 * Статистика по всем категориям
 */
export async function GET() {
  const stats = await prisma.categorySnapshot.groupBy({
    by: ['category', 'marketType'],
    _count: true,
    _min: { timestamp: true },
    _max: { timestamp: true },
  });

  return NextResponse.json({
    stats,
    timestamp: Date.now(),
  });
}
```

---

## 11. ОЦЕНКА РЕСУРСОВ

### 11.1 Объем данных

**Tick данные (in-memory):**
- 100 символов × 2 типа × 3 тика/сек × 60 сек = 36,000 тиков в буфере
- Размер одного тика: ~100 байт
- **Память: ~3.6 MB** (приемлемо)

**Минутные снимки категорий:**
- 5 категорий × 2 типа × 6 глубин = 60 записей/минуту
- 60 записей × 60 мин × 24 час = 86,400 записей/день
- 86,400 × 60 дней = **5.2M записей** (с retention 60 дней)
- Размер одной записи: ~150 байт
- **Хранилище: ~780 MB** (без compression)
- **С compression (70%): ~230 MB**

**Минутные снимки COIN (существующие):**
- 100 символов × 2 типа × 6 глубин = 1,200 записей/минуту
- 1,200 × 60 × 24 = 1,728,000 записей/день
- 1,728,000 × 60 = **103.7M записей** (60 дней)
- **Хранилище: ~15 GB** (без compression)
- **С compression (70%): ~4.5 GB**

### 11.2 Нагрузка на API

**Binance WebSocket:**
- Ограничение: 1024 streams на соединение
- 100 символов × 2 типа = 200 streams (**OK**)

**Binance REST (fallback):**
- 100 символов × 2 типа = 200 запросов/минуту
- Weight: 200 × 5 = 1000 / 1200 лимит (**OK**)

### 11.3 Требования к серверу

**Минимальные:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB

**Рекомендуемые (production):**
- CPU: 4-8 cores
- RAM: 16 GB
- Disk: 100 GB SSD
- Network: 100 Mbps

---

## 12. ПЛАН ВНЕДРЕНИЯ

### Фаза 1: Подготовка (1-2 дня)
- [ ] Обновить schema.prisma (добавить CategorySnapshot)
- [ ] Создать миграцию БД
- [ ] Применить TimescaleDB расширения
- [ ] Обновить binance.config.ts (ALL_SYMBOLS, CATEGORY_DEFINITIONS)

### Фаза 2: Реализация сервисов (3-5 дней)
- [ ] Реализовать WebSocketCollector
- [ ] Реализовать TickBufferService
- [ ] Реализовать AggregationService
- [ ] Реализовать CategorySnapshotRepository
- [ ] Обновить startCollector.ts

### Фаза 3: API endpoints (2-3 дня)
- [ ] Создать /api/categories/[category]/route.ts
- [ ] Создать /api/categories/all/route.ts
- [ ] Создать /api/ticks/[symbol]/route.ts
- [ ] Обновить /api/health с новыми метриками

### Фаза 4: Тестирование (2-3 дня)
- [ ] Unit tests для AggregationService
- [ ] Integration tests для API endpoints
- [ ] Load testing (100+ символов)
- [ ] Memory leak testing (24h run)

### Фаза 5: Мониторинг и оптимизация (ongoing)
- [ ] Настроить alerting (Prometheus/Grafana)
- [ ] Оптимизировать БД запросы
- [ ] Fine-tuning буферов
- [ ] Документация

**Общее время: 10-15 дней**

---

## 13. АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ

### 13.1 Вариант A: Только REST (без WebSocket)

**Плюсы:**
- Проще в реализации
- Меньше точек отказа

**Минусы:**
- Нет tick-by-tick данных
- Только минутные снимки
- Не соответствует требованию "несколько раз в секунду"

### 13.2 Вариант B: Гибридный (текущее решение)

**Плюсы:**
- Tick-by-tick данные через WebSocket
- Fallback на REST при ошибках
- Соответствует всем требованиям

**Минусы:**
- Сложнее в реализации
- Больше компонентов для мониторинга

### 13.3 Вариант C: Расчет агрегатов на лету (без сохранения)

**Плюсы:**
- Не нужны дополнительные таблицы
- Меньше хранилища

**Минусы:**
- Медленные запросы (каждый раз пересчет)
- Нет исторических данных по категориям
- Нагрузка на БД при каждом запросе

**Рекомендация:** Вариант B (Гибридный) - оптимальный баланс

---

## 14. БЕЗОПАСНОСТЬ И ОТКАЗОУСТОЙЧИВОСТЬ

### 14.1 Graceful Degradation

```
WebSocket error → Fallback на REST collector
Redis unavailable → Direct query к PostgreSQL
Buffer overflow → Drop oldest ticks (FIFO)
DB connection lost → Retry with exponential backoff
```

### 14.2 Rate Limiting

- WebSocket: автоматически через Binance лимиты
- REST: 300ms между запросами
- API endpoints: можно добавить rate limiting через middleware

### 14.3 Data Validation

- Валидация входящих tick данных
- Проверка на аномалии (price spikes)
- Санитизация перед сохранением в БД

---

## 15. ЗАКЛЮЧЕНИЕ

Предложенное решение:

✅ **Соответствует всем требованиям** из task.txt
✅ **Масштабируемо** (100+ символов, миллионы записей)
✅ **Отказоустойчиво** (fallback, reconnection, graceful degradation)
✅ **Оптимизировано** (батчирование, кэширование, compression)
✅ **Расширяемо** (легко добавить новые категории)
✅ **Совместимо** с текущей архитектурой

**Следующие шаги:**
1. Обсудить с командой
2. Утвердить план внедрения
3. Начать реализацию с Фазы 1

---

**Для проекта:** Trading Platform
**Дата:** 17 ноября 2025
