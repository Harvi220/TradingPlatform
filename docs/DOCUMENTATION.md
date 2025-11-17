# Trading Platform - Полная документация по реализации БД
## База данных для хранения BID/ASK данных

**Версия:** 1.1
**Дата:** 2025-11-16
**Автор:** Claude Code
**Статус:** ✅ Готово к реализации

---

# 📋 СОДЕРЖАНИЕ

1. [Краткая сводка (Executive Summary)](#executive-summary)
2. [Введение и текущее состояние](#введение)
3. [Архитектура решения](#архитектура)
4. [Модуль сбора данных с Binance](#модуль-сбора-данных) ⭐ НОВОЕ
5. [Схема базы данных](#схема-бд)
6. [Быстрый старт (Quick Start)](#быстрый-старт)
7. [Детальный план реализации](#план-реализации)
8. [Примеры кода](#примеры-кода)
9. [API endpoints](#api-endpoints)
10. [Производительность и оптимизация](#производительность)
11. [Мониторинг и troubleshooting](#мониторинг)
12. [FAQ](#faq)

---

<a name="executive-summary"></a>
# 1. КРАТКАЯ СВОДКА (Executive Summary)

## 📊 Суть проекта в 30 секунд

Необходимо заменить временное in-memory хранилище BID/ASK данных на **постоянную базу данных** (PostgreSQL + TimescaleDB + Redis) для обеспечения надежности, масштабируемости и возможности анализа исторических данных.

## 🎯 Проблема

**Текущая ситуация:**
- Все данные хранятся в памяти приложения
- При перезапуске сервера **все данные теряются** (потеря 100%)
- Доступна история только за **последний час**
- Невозможно проводить долгосрочный анализ
- Невозможно масштабирование на несколько инстансов

## ✅ Решение

```
PostgreSQL 16 + TimescaleDB
     (Основное хранилище)
           +
       Redis 7
     (Кэширование)
           +
      Prisma ORM
  (Type-safe доступ)
```

**Частота сохранения:** 1 раз в **МИНУТУ** (12 snapshots/мин для 1 символа)

## 📈 Результаты

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| Потеря данных при рестарте | 100% | 0% | ✅ 100% |
| История данных | 1 час | Неограниченно | ✅ ∞ |
| Размер (10 символов, 1 год) | N/A | ~620 MB | ✅ Компактно |
| Производительность записи | - | 12/мин | ✅ Низкая нагрузка |
| Скорость чтения | < 10ms | < 50ms (cache) | ✅ Отлично |

## 💰 Стоимость

**Трудозатраты:** 18-24 часа (3-5 дней, 1 backend dev)

**Инфраструктура (production):**
- PostgreSQL + Redis: ~$75-150/мес
- Backup storage: ~$5-10/мес
- **Итого:** ~$80-160/мес

## ⏱️ Сроки

- **Оптимистичный:** 3 дня
- **Реалистичный:** 1 неделя
- **С резервом:** 2 недели

---

<a name="введение"></a>
# 2. ВВЕДЕНИЕ И ТЕКУЩЕЕ СОСТОЯНИЕ

## 2.1 Контекст

Trading Platform - это real-time приложение для отслеживания BID/ASK объемов на криптовалютных рынках Binance (SPOT и FUTURES). Приложение получает данные через WebSocket и строит графики с использованием TradingView Lightweight Charts.

## 2.2 Текущая архитектура

```
Binance WebSocket
       ↓
OrderBookService (in-memory)
       ↓
Map<string, Snapshot[]>  ⚠️ ПРОБЛЕМА
  - TTL: 1 час
  - Max: 3600 записей
  - В памяти процесса
```

### Текущая структура данных

```typescript
interface Snapshot {
  timestamp: number;          // Unix timestamp (ms)
  symbol: string;             // "BTCUSDT"
  marketType: 'SPOT' | 'FUTURES';
  depth: number;              // 1.5, 3, 5, 8, 15, 30
  bidVolume: number;          // Объем BID
  askVolume: number;          // Объем ASK
  bidVolumeUsd: number;       // Объем BID в USD
  askVolumeUsd: number;       // Объем ASK в USD
}
```

### Хранилище

```typescript
const snapshotsStore = new Map<string, Snapshot[]>();
// Ключ: "BTCUSDT:SPOT:5"
// Значение: массив snapshots
```

## 2.3 Ограничения и проблемы

| Проблема | Влияние | Критичность |
|----------|---------|-------------|
| Потеря данных при рестарте | Нет истории | 🔴 Высокая |
| Только 1 час истории | Нет долгосрочного анализа | 🔴 Высокая |
| Нет бэкапов | Риск потери данных | 🔴 Высокая |
| Невозможность масштабирования | Один инстанс | 🟡 Средняя |
| Нет аналитики | Нет insights | 🟡 Средняя |

---

<a name="архитектура"></a>
# 3. АРХИТЕКТУРА РЕШЕНИЯ

## 3.1 Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  BINANCE WEBSOCKET API                  │
│        wss://stream.binance.com (SPOT)                  │
│        wss://fstream.binance.com (FUTURES)              │
└────────────────────┬────────────────────────────────────┘
                     │ Depth Updates (1/sec)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              OrderBookService (in-memory)               │
│  - Поддерживает актуальный order book                  │
│  - Рассчитывает объемы на глубинах                     │
└────────────────────┬────────────────────────────────────┘
                     │ Каждую МИНУТУ
                     ▼
┌─────────────────────────────────────────────────────────┐
│         SnapshotService (NEW - батчинг)                 │
│  - Накапливает snapshots (batch 50)                     │
│  - Пишет в Redis асинхронно                            │
│  - Flush в PostgreSQL каждые 60 сек                    │
└─────────┬─────────────────────┬─────────────────────────┘
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌────────────────────────────────┐
│  Redis Cache     │   │  PostgreSQL + TimescaleDB      │
│  (Hot data)      │   │  (Persistent storage)          │
│  - TTL: 2 hours  │   │  - Hypertables                 │
│  - Sorted sets   │   │  - Continuous aggregates       │
└──────────────────┘   │  - Compression (90% savings)   │
                       │  - Retention policies           │
                       └────────────────────────────────┘
```

## 3.2 Поток данных - ЗАПИСЬ

```
1. Binance WebSocket
   │ Update каждую секунду
   ▼
2. OrderBookService
   │ Обновляет in-memory order book
   │ Рассчитывает объемы
   ▼
3. Таймер (каждую МИНУТУ)
   │ Создает snapshots для всех глубин
   ▼
4. SnapshotService.write()
   │ Добавляет в batch buffer
   │ Async → Redis (не блокирует)
   │
   │ Если buffer >= 50 ИЛИ прошло 60 сек:
   ▼
5. SnapshotService.flush()
   │ Batch INSERT в PostgreSQL
   ▼
6. TimescaleDB
   │ Вставка в hypertable
   │ Background: compression, aggregation
```

**Частота:**
- 2 рынка × 6 глубин × 1/мин = **12 записей/минуту** (1 символ)
- Batch flush: каждые ~4 минуты или по таймауту 60 сек

## 3.3 Поток данных - ЧТЕНИЕ

```
1. Frontend: GET /api/chart-data?symbol=BTCUSDT&depth=5&type=bid
   ▼
2. SnapshotService.read()
   │
   ├─ Проверка Redis cache
   │  └─ Cache HIT → return (< 50ms)
   │
   └─ Cache MISS
      │
      ▼
3. SnapshotRepository.findMany()
   │ Prisma query к PostgreSQL
   ▼
4. TimescaleDB
   │ Использует индексы
   │ Сканирует только нужные chunks
   │ Возвращает данные
   ▼
5. Кэширование результата (Redis, TTL 1 мин)
   ▼
6. Возврат данных → Frontend
```

**Производительность:**
- Cache hit (< 2 часа): **< 50ms**
- Cache miss (1 час данных): **< 300ms**
- Исторические данные (агрегаты): **< 500ms**

## 3.4 Выбор технологий

### PostgreSQL + TimescaleDB

**Почему:**
- ✅ Специализация на time-series данных
- ✅ Автоматическое партиционирование (chunks по дням)
- ✅ Compression (экономия 90% места)
- ✅ Continuous aggregates (автоматические агрегаты)
- ✅ SQL совместимость
- ✅ Battle-tested (Uber, Cisco используют)

**Альтернативы (отклонены):**
- ❌ InfluxDB - нет SQL, сложнее интеграция
- ❌ MongoDB - менее эффективна для time-series
- ❌ Cassandra - overkill для нашего масштаба

### Redis

**Почему:**
- ✅ Минимальная latency (< 1ms)
- ✅ Sorted sets для time-series
- ✅ Простая интеграция
- ✅ Pub/Sub для будущего масштабирования

### Prisma ORM

**Почему:**
- ✅ Type-safety с TypeScript
- ✅ Автоматические миграции
- ✅ Отличный DX
- ✅ Active community

---

<a name="модуль-сбора-данных"></a>
# 4. МОДУЛЬ СБОРА ДАННЫХ С BINANCE

## 4.1 Проблема с WebSocket подходом

### Ограничения Binance WebSocket API

**Лимиты Binance:**
```
❌ Максимум 5 WebSocket подключений с одного IP
❌ Максимум 1024 streams на одно WebSocket
```

**Проблема масштабирования:**
```
1 символ = 1 WebSocket подключение
5 символов = 5 WebSocket ✅ OK
10 символов = 10 WebSocket ❌ ПРЕВЫШЕН ЛИМИТ
100 символов = 100 WebSocket ❌❌❌ НЕВОЗМОЖНО
```

### Почему REST API лучше для нашей задачи

| Критерий | WebSocket | REST API |
|----------|-----------|----------|
| **Лимит подключений** | 5 WebSocket | ✅ Нет лимита |
| **Масштабируемость** | ❌ До 5 символов | ✅ 100+ символов |
| **Для минутной гранулярности** | ❌ Избыточно | ✅ Идеально |
| **Сложность** | 🟡 Средняя | ✅ Простая |
| **Надежность** | 🟡 Reconnect logic | ✅ Проще обработка ошибок |

**Вывод:** Для сохранения данных **каждую минуту** REST API оптимален!

---

## 4.2 Архитектура модуля сбора данных

### Общая схема

```
┌─────────────────────────────────────────────────────────┐
│              Binance REST API                           │
│  https://api.binance.com/api/v3/depth (SPOT)           │
│  https://fapi.binance.com/fapi/v1/depth (FUTURES)      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP GET каждую минуту
                     │ Rate limit aware
                     ▼
┌─────────────────────────────────────────────────────────┐
│           BinanceRestCollector (Главный модуль)         │
│                                                         │
│  Компоненты:                                            │
│  ├─ SymbolManager - управление списком символов        │
│  ├─ RateLimiter - контроль rate limits                 │
│  ├─ OrderBookFetcher - получение order book            │
│  ├─ DepthCalculator - расчет объемов на глубинах       │
│  └─ SnapshotWriter - сохранение в БД                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Каждую минуту
                     ▼
           ┌──────────────────────┐
           │  SnapshotService     │
           │  (батчинг + кэш)     │
           └──────────┬───────────┘
                      │
                      ▼
              PostgreSQL + Redis
```

### Поток данных

```
1. ТАЙМЕР (каждую минуту)
   │
   ▼
2. BinanceRestCollector.collectAllSnapshots()
   │
   ├─ Для каждого символа в списке:
   │  │
   │  ├─ Для SPOT рынка:
   │  │  ├─ Fetch order book (REST API)
   │  │  ├─ Расчет объемов на глубинах
   │  │  └─ Сохранение snapshots
   │  │
   │  ├─ Для FUTURES рынка:
   │  │  ├─ Fetch order book (REST API)
   │  │  ├─ Расчет объемов на глубинах
   │  │  └─ Сохранение snapshots
   │  │
   │  └─ Задержка 300ms (rate limit)
   │
   ▼
3. SnapshotService (батчинг)
   │
   ▼
4. PostgreSQL (сохранение)
```

---

## 4.3 Компоненты модуля

### 4.3.1 BinanceRestCollector (Главный класс)

**Файл:** `src/backend/services/binance/BinanceRestCollector.ts`

**Ответственность:**
- Управление циклом сбора данных
- Координация всех компонентов
- Обработка ошибок
- Логирование

**Основные методы:**
```typescript
class BinanceRestCollector {
  start(): void                      // Запуск сбора
  stop(): void                       // Остановка
  collectAllSnapshots(): Promise<void>  // Один цикл сбора
  fetchOrderBook(): Promise<OrderBook>  // Получение order book
  calculateDepthVolumes(): DepthVolumes // Расчет объемов
  saveSnapshots(): Promise<void>        // Сохранение в БД
}
```

### 4.3.2 Rate Limiter

**Binance REST API лимиты:**
```
✅ Weight limit: 1200 requests/minute
✅ Depth endpoint weight: 5-50 (зависит от limit)
```

**Стратегия:**
```typescript
// Для 100 символов × 2 рынка = 200 запросов/мин
// Задержка между запросами: 300ms
// Время на все: 200 × 0.3s = 60 секунд
// ✅ Идеально укладываемся в минуту!

const REQUEST_DELAY_MS = 300; // 300ms между запросами

await fetch(url);
await sleep(REQUEST_DELAY_MS); // Задержка
```

**Расчет weight:**
```
Один запрос:
  limit=1000 → weight ≈ 10

100 символов × 2 рынка = 200 запросов
Weight: 200 × 10 = 2000

❌ Превышает 1200!

Решение: использовать limit=500 (weight ≈ 5)
200 × 5 = 1000 weight ✅ OK
```

### 4.3.3 Order Book Fetcher

**Endpoints:**
```typescript
// SPOT
const SPOT_API = 'https://api.binance.com/api/v3/depth';
const url = `${SPOT_API}?symbol=${symbol}&limit=500`;

// FUTURES
const FUTURES_API = 'https://fapi.binance.com/fapi/v1/depth';
const url = `${FUTURES_API}?symbol=${symbol}&limit=500`;
```

**Response формат:**
```typescript
interface BinanceDepthResponse {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][];
}

// Пример:
{
  "lastUpdateId": 1234567890,
  "bids": [
    ["65432.10", "0.5"],
    ["65431.50", "1.2"],
    ...
  ],
  "asks": [
    ["65433.20", "0.8"],
    ["65434.00", "2.1"],
    ...
  ]
}
```

### 4.3.4 Depth Calculator

**Алгоритм расчета объемов:**

```typescript
// 1. Определяем лучшие цены
const bestBid = bids[0].price;  // Самая высокая цена покупки
const bestAsk = asks[0].price;  // Самая низкая цена продажи

// 2. Для каждой глубины (1.5%, 3%, 5%, 8%, 15%, 30%)
const depths = [1.5, 3, 5, 8, 15, 30];

for (const depthPercent of depths) {
  // 3. Рассчитываем пороги
  const bidThreshold = bestBid * (1 - depthPercent / 100);
  const askThreshold = bestAsk * (1 + depthPercent / 100);

  // 4. Суммируем объемы BID
  let bidVolume = 0;
  let bidValueUsd = 0;

  for (const bid of bids) {
    if (bid.price >= bidThreshold) {
      bidVolume += bid.quantity;
      bidValueUsd += bid.price * bid.quantity;
    } else break; // Bids отсортированы по убыванию
  }

  // 5. Суммируем объемы ASK
  let askVolume = 0;
  let askValueUsd = 0;

  for (const ask of asks) {
    if (ask.price <= askThreshold) {
      askVolume += ask.quantity;
      askValueUsd += ask.price * ask.quantity;
    } else break; // Asks отсортированы по возрастанию
  }

  // 6. Сохраняем результат
  result[depthPercent] = {
    bidVolume,
    askVolume,
    bidValueUsd,
    askValueUsd
  };
}
```

**Пример расчета:**
```
Символ: BTCUSDT
Best Bid: 65000 USDT
Best Ask: 65100 USDT

Для глубины 5%:
  BID threshold: 65000 * (1 - 0.05) = 61750 USDT
  ASK threshold: 65100 * (1 + 0.05) = 68355 USDT

  BID volume: сумма всех ордеров от 65000 до 61750
  ASK volume: сумма всех ордеров от 65100 до 68355
```

---

## 4.4 Полная реализация модуля

### Основной файл: BinanceRestCollector.ts

```typescript
// src/backend/services/binance/BinanceRestCollector.ts

import { snapshotService } from '../snapshot/SnapshotService';

interface BinanceDepthResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface OrderBook {
  bids: Array<{ price: number; quantity: number }>;
  asks: Array<{ price: number; quantity: number }>;
}

interface DepthVolumes {
  [depth: number]: {
    bidVolume: number;
    askVolume: number;
    bidValueUsd: number;
    askValueUsd: number;
  };
}

export class BinanceRestCollector {
  // API endpoints
  private readonly SPOT_API = 'https://api.binance.com/api/v3/depth';
  private readonly FUTURES_API = 'https://fapi.binance.com/fapi/v1/depth';

  // Rate limiting
  private readonly REQUEST_DELAY_MS = 300; // 300ms между запросами
  private readonly LIMIT = 500; // Ограничение order book (weight ≈ 5)

  // Depths to calculate
  private readonly DEPTHS = [1.5, 3, 5, 8, 15, 30];

  // Symbols to track
  private symbols: string[];

  // Interval ID
  private intervalId: NodeJS.Timeout | null = null;

  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastCollectionTime: null as Date | null,
  };

  constructor(symbols: string[]) {
    this.symbols = symbols;
  }

  /**
   * Fetch order book from Binance API
   */
  async fetchOrderBook(
    symbol: string,
    marketType: 'SPOT' | 'FUTURES'
  ): Promise<BinanceDepthResponse> {
    const url = marketType === 'SPOT'
      ? `${this.SPOT_API}?symbol=${symbol}&limit=${this.LIMIT}`
      : `${this.FUTURES_API}?symbol=${symbol}&limit=${this.LIMIT}`;

    this.stats.totalRequests++;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      this.stats.failedRequests++;
      throw new Error(
        `Binance API error: ${response.status} ${response.statusText}`
      );
    }

    this.stats.successfulRequests++;
    return await response.json();
  }

  /**
   * Parse Binance response to OrderBook format
   */
  parseOrderBook(data: BinanceDepthResponse): OrderBook {
    return {
      bids: data.bids.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
      asks: data.asks.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
    };
  }

  /**
   * Calculate volumes at different depth levels
   */
  calculateDepthVolumes(orderBook: OrderBook): DepthVolumes {
    const bestBid = orderBook.bids[0]?.price;
    const bestAsk = orderBook.asks[0]?.price;

    if (!bestBid || !bestAsk) {
      throw new Error('Empty order book');
    }

    const result: DepthVolumes = {};

    for (const depthPercent of this.DEPTHS) {
      const bidThreshold = bestBid * (1 - depthPercent / 100);
      const askThreshold = bestAsk * (1 + depthPercent / 100);

      // Calculate BID volume
      let bidVolume = 0;
      let bidValueUsd = 0;

      for (const bid of orderBook.bids) {
        if (bid.price >= bidThreshold) {
          bidVolume += bid.quantity;
          bidValueUsd += bid.price * bid.quantity;
        } else {
          break; // Bids are sorted descending
        }
      }

      // Calculate ASK volume
      let askVolume = 0;
      let askValueUsd = 0;

      for (const ask of orderBook.asks) {
        if (ask.price <= askThreshold) {
          askVolume += ask.quantity;
          askValueUsd += ask.price * ask.quantity;
        } else {
          break; // Asks are sorted ascending
        }
      }

      result[depthPercent] = {
        bidVolume,
        askVolume,
        bidValueUsd,
        askValueUsd,
      };
    }

    return result;
  }

  /**
   * Collect snapshots for one symbol
   */
  async collectSymbol(symbol: string, marketType: 'SPOT' | 'FUTURES') {
    try {
      // 1. Fetch order book
      const data = await this.fetchOrderBook(symbol, marketType);

      // 2. Parse to OrderBook format
      const orderBook = this.parseOrderBook(data);

      // 3. Calculate volumes at all depths
      const depthVolumes = this.calculateDepthVolumes(orderBook);

      // 4. Save snapshots to database
      const timestamp = new Date();

      for (const depth of this.DEPTHS) {
        const volumes = depthVolumes[depth];

        await snapshotService.write({
          timestamp,
          symbol,
          marketType,
          depth,
          bidVolume: volumes.bidVolume,
          askVolume: volumes.askVolume,
          bidVolumeUsd: volumes.bidValueUsd,
          askVolumeUsd: volumes.askValueUsd,
        });
      }

      console.log(`[Collector] ✓ ${symbol} ${marketType}`);

    } catch (error) {
      console.error(`[Collector] ✗ ${symbol} ${marketType}:`, error);
      // Continue with next symbol (не прерываем весь цикл)
    }
  }

  /**
   * Collect snapshots for all symbols
   */
  async collectAllSnapshots() {
    const startTime = Date.now();
    console.log(`[Collector] Starting collection for ${this.symbols.length} symbols...`);

    for (const symbol of this.symbols) {
      // Collect SPOT
      await this.collectSymbol(symbol, 'SPOT');
      await this.sleep(this.REQUEST_DELAY_MS);

      // Collect FUTURES
      await this.collectSymbol(symbol, 'FUTURES');
      await this.sleep(this.REQUEST_DELAY_MS);
    }

    const duration = Date.now() - startTime;
    this.stats.lastCollectionTime = new Date();

    console.log(`[Collector] Collection completed in ${duration}ms`);
    console.log(`[Collector] Stats:`, {
      total: this.stats.totalRequests,
      success: this.stats.successfulRequests,
      failed: this.stats.failedRequests,
    });
  }

  /**
   * Start periodic collection
   */
  start() {
    if (this.intervalId) {
      console.log('[Collector] Already running');
      return;
    }

    console.log('[Collector] Starting periodic collection...');
    console.log(`[Collector] Symbols: ${this.symbols.length}`);
    console.log(`[Collector] Interval: 60 seconds`);

    // Run immediately
    this.collectAllSnapshots();

    // Then every minute
    this.intervalId = setInterval(() => {
      this.collectAllSnapshots();
    }, 60000);
  }

  /**
   * Stop periodic collection
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Collector] Stopped');
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Add symbols to collection
   */
  addSymbols(symbols: string[]) {
    this.symbols = [...new Set([...this.symbols, ...symbols])];
    console.log(`[Collector] Symbols updated: ${this.symbols.length} total`);
  }

  /**
   * Remove symbols from collection
   */
  removeSymbols(symbols: string[]) {
    this.symbols = this.symbols.filter(s => !symbols.includes(s));
    console.log(`[Collector] Symbols updated: ${this.symbols.length} total`);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const binanceCollector = new BinanceRestCollector([
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  // ... добавьте нужные символы
]);
```

---

## 4.5 API для управления коллектором

### Создание endpoints

**Файл:** `src/app/api/collector/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { binanceCollector } from '@/backend/services/binance/BinanceRestCollector';

// GET - получить статус
export async function GET() {
  const stats = binanceCollector.getStats();

  return NextResponse.json({
    success: true,
    stats,
  });
}

// POST - запустить коллектор
export async function POST() {
  binanceCollector.start();

  return NextResponse.json({
    success: true,
    message: 'Collector started',
  });
}

// DELETE - остановить коллектор
export async function DELETE() {
  binanceCollector.stop();

  return NextResponse.json({
    success: true,
    message: 'Collector stopped',
  });
}
```

**Файл:** `src/app/api/collector/symbols/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { binanceCollector } from '@/backend/services/binance/BinanceRestCollector';

// POST - добавить символы
export async function POST(request: NextRequest) {
  const { symbols } = await request.json();

  if (!Array.isArray(symbols)) {
    return NextResponse.json(
      { error: 'symbols must be an array' },
      { status: 400 }
    );
  }

  binanceCollector.addSymbols(symbols);

  return NextResponse.json({
    success: true,
    message: `Added ${symbols.length} symbols`,
  });
}

// DELETE - удалить символы
export async function DELETE(request: NextRequest) {
  const { symbols } = await request.json();

  if (!Array.isArray(symbols)) {
    return NextResponse.json(
      { error: 'symbols must be an array' },
      { status: 400 }
    );
  }

  binanceCollector.removeSymbols(symbols);

  return NextResponse.json({
    success: true,
    message: `Removed ${symbols.length} symbols`,
  });
}
```

---

## 4.6 Конфигурация и настройки

### Файл конфигурации

**Файл:** `src/backend/config/binance.config.ts`

```typescript
export const BINANCE_CONFIG = {
  // API endpoints
  SPOT_API: 'https://api.binance.com/api/v3/depth',
  FUTURES_API: 'https://fapi.binance.com/fapi/v1/depth',

  // Rate limiting
  REQUEST_DELAY_MS: 300,    // Задержка между запросами
  LIMIT: 500,               // Ограничение order book (weight ≈ 5)
  MAX_WEIGHT_PER_MINUTE: 1200, // Binance лимит

  // Collection settings
  COLLECTION_INTERVAL_MS: 60000, // 1 минута

  // Depth levels
  DEPTHS: [1.5, 3, 5, 8, 15, 30],

  // Symbols to track
  DEFAULT_SYMBOLS: [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'ADAUSDT',
  ],

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;
```

### Использование конфига

```typescript
import { BINANCE_CONFIG } from '@/backend/config/binance.config';

export const binanceCollector = new BinanceRestCollector(
  BINANCE_CONFIG.DEFAULT_SYMBOLS
);
```

---

## 4.7 Автоматический запуск

### При старте приложения

**Файл:** `src/app/layout.tsx` или отдельный init скрипт

```typescript
// src/backend/init/startCollector.ts

import { binanceCollector } from '@/backend/services/binance/BinanceRestCollector';

export function startDataCollection() {
  // Запускаем только на сервере
  if (typeof window === 'undefined') {
    console.log('[Init] Starting Binance data collector...');
    binanceCollector.start();
  }
}

// Автозапуск при импорте модуля
if (process.env.NODE_ENV === 'production') {
  startDataCollection();
}
```

**Импорт в главном файле:**
```typescript
// src/app/layout.tsx
import '@/backend/init/startCollector'; // Запустит коллектор
```

### С использованием API endpoint

```bash
# Запуск через API
curl -X POST http://localhost:3000/api/collector

# Проверка статуса
curl http://localhost:3000/api/collector

# Остановка
curl -X DELETE http://localhost:3000/api/collector
```

---

## 4.8 Мониторинг и логирование

### Расширенное логирование

```typescript
class BinanceRestCollector {
  // ... existing code ...

  private logCollectionSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      symbols: this.symbols.length,
      requests: {
        total: this.stats.totalRequests,
        successful: this.stats.successfulRequests,
        failed: this.stats.failedRequests,
        successRate: (
          (this.stats.successfulRequests / this.stats.totalRequests) * 100
        ).toFixed(2) + '%',
      },
      lastCollection: this.stats.lastCollectionTime,
    };

    console.log('[Collector] Summary:', JSON.stringify(summary, null, 2));
  }
}
```

### Сохранение метрик в БД

```typescript
// После каждого цикла сбора
await prisma.systemMetric.createMany({
  data: [
    {
      metricName: 'collector_requests_total',
      metricValue: this.stats.totalRequests,
    },
    {
      metricName: 'collector_requests_success',
      metricValue: this.stats.successfulRequests,
    },
    {
      metricName: 'collector_requests_failed',
      metricValue: this.stats.failedRequests,
    },
  ],
});
```

---

## 4.9 Обработка ошибок и retry logic

### Retry при ошибках

```typescript
async fetchOrderBookWithRetry(
  symbol: string,
  marketType: 'SPOT' | 'FUTURES',
  maxRetries = 3
): Promise<BinanceDepthResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.fetchOrderBook(symbol, marketType);
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[Collector] Retry ${attempt}/${maxRetries} for ${symbol} ${marketType}:`,
        error
      );

      if (attempt < maxRetries) {
        await this.sleep(1000 * attempt); // Exponential backoff
      }
    }
  }

  throw lastError;
}
```

### Обработка rate limit errors

```typescript
async fetchOrderBook(/* ... */): Promise<BinanceDepthResponse> {
  const response = await fetch(url);

  // Binance rate limit: HTTP 429
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

    console.warn(`[Collector] Rate limited, waiting ${delay}ms...`);
    await this.sleep(delay);

    // Retry после задержки
    return this.fetchOrderBook(symbol, marketType);
  }

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  return await response.json();
}
```

---

## 4.10 Резюме модуля

### Ключевые особенности

✅ **Масштабируемость:** Поддержка 100+ символов без лимитов WebSocket
✅ **Надежность:** Retry logic, обработка ошибок, логирование
✅ **Производительность:** Rate limit aware, оптимальные задержки
✅ **Гибкость:** Легко добавлять/удалять символы через API
✅ **Мониторинг:** Детальная статистика и логирование

### Технические характеристики

```
Символы: 100+
Частота: 1 раз в минуту
Запросов: 200/минуту (100 символов × 2 рынка)
Weight: ~1000 (в пределах лимита 1200)
Время цикла: ~60 секунд
Задержка между запросами: 300ms
```

### Файлы модуля

```
src/backend/
├── services/binance/
│   └── BinanceRestCollector.ts       (Главный класс)
├── config/
│   └── binance.config.ts             (Конфигурация)
└── init/
    └── startCollector.ts             (Автозапуск)

src/app/api/
└── collector/
    ├── route.ts                      (Управление)
    └── symbols/route.ts              (Управление символами)
```

---

<a name="схема-бд"></a>
# 5. СХЕМА БАЗЫ ДАННЫХ

## 5.1 Обзор таблиц

```
📊 snapshots           - Основная таблица (12 записей/мин)
📊 snapshots_agg_1h    - Часовые агрегаты
📊 snapshots_agg_1d    - Дневные агрегаты
📝 websocket_events    - Логи WebSocket
📈 system_metrics      - Системные метрики
```

## 4.2 Таблица `snapshots` (Main)

### Назначение
Хранит объемы BID/ASK каждую минуту для каждой комбинации (symbol, marketType, depth).

### Структура

```prisma
model Snapshot {
  id            String   @id @default(cuid())
  timestamp     DateTime @db.Timestamptz(3)  // Округлено до минуты
  symbol        String   @db.VarChar(20)      // "BTCUSDT"
  marketType    MarketType                    // SPOT | FUTURES
  depth         Float    @db.Real             // 1.5, 3, 5, 8, 15, 30

  bidVolume     Float    @db.Real             // Объем BID
  askVolume     Float    @db.Real             // Объем ASK
  bidVolumeUsd  Float    @db.Real             // Объем BID в USD
  askVolumeUsd  Float    @db.Real             // Объем ASK в USD

  createdAt     DateTime @default(now())

  @@unique([symbol, marketType, depth, timestamp])
  @@index([timestamp(sort: Desc)])
  @@index([symbol, marketType, depth, timestamp(sort: Desc)])
  @@map("snapshots")
}
```

### Пример данных

| timestamp | symbol | marketType | depth | bidVolumeUsd | askVolumeUsd |
|-----------|--------|------------|-------|--------------|--------------|
| 2025-11-16 14:30:00 | BTCUSDT | SPOT | 5 | 8,123,456 | 9,234,567 |
| 2025-11-16 14:30:00 | BTCUSDT | SPOT | 3 | 5,867,234 | 10,345,678 |
| 2025-11-16 14:31:00 | BTCUSDT | SPOT | 5 | 8,125,678 | 9,236,789 |

### Частота и объем

**Для 1 символа:**
- Минута: 12 записей (2 рынка × 6 глубин)
- Час: 720 записей
- День: 17,280 записей
- Месяц: 518,400 записей
- Год: 6,220,800 записей

**Размер (1 символ, 1 год):**
- Без compression: ~621 MB
- С compression: ~62 MB (90% экономия)

**Для 10 символов:**
- Год с compression: ~620 MB

### TimescaleDB оптимизации

```sql
-- Конвертируем в hypertable (партиционирование по дням)
SELECT create_hypertable('snapshots', 'timestamp',
  chunk_time_interval => INTERVAL '1 day');

-- Compression после 14 дней (экономия 90%)
ALTER TABLE snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol, marketType, depth'
);
SELECT add_compression_policy('snapshots', INTERVAL '14 days');

-- Retention: удаление старше 60 дней
SELECT add_retention_policy('snapshots', INTERVAL '60 days');
```

## 4.3 Таблица `snapshots_agg_1h` (Hourly Aggregates)

### Назначение
Предрасчитанные агрегаты за каждый час. Автоматически обновляются TimescaleDB.

### Структура

```prisma
model SnapshotAgg1h {
  id      String   @id @default(cuid())
  bucket  DateTime @db.Timestamptz(3)  // Начало часа
  symbol  String
  marketType MarketType
  depth   Float

  avgBidVolume    Float  // Среднее за час
  avgAskVolume    Float
  maxBidVolume    Float  // Максимум за час
  maxAskVolume    Float
  minBidVolume    Float  // Минимум за час
  minAskVolume    Float
  avgBidVolumeUsd Float
  avgAskVolumeUsd Float

  count Int  // Количество snapshots (обычно 60)

  @@unique([symbol, marketType, depth, bucket])
  @@map("snapshots_agg_1h")
}
```

### Как создается (TimescaleDB)

```sql
CREATE MATERIALIZED VIEW snapshots_agg_1h_view
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  symbol, "marketType", depth,
  AVG("bidVolume") AS "avgBidVolume",
  MAX("bidVolume") AS "maxBidVolume",
  MIN("bidVolume") AS "minBidVolume",
  -- и т.д.
  COUNT(*) AS count
FROM snapshots
GROUP BY bucket, symbol, "marketType", depth;

-- Автообновление каждый час
SELECT add_continuous_aggregate_policy(
  'snapshots_agg_1h_view',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

### Использование

```sql
-- График за неделю (168 точек вместо 10,080)
SELECT bucket, avgBidVolumeUsd, avgAskVolumeUsd
FROM snapshots_agg_1h_view
WHERE symbol = 'BTCUSDT'
  AND "marketType" = 'SPOT'
  AND depth = 5
  AND bucket >= NOW() - INTERVAL '7 days'
ORDER BY bucket ASC;
```

## 4.4 Таблица `snapshots_agg_1d` (Daily Aggregates)

### Назначение
Агрегаты за день. Для долгосрочных графиков (месяц, год).

### Структура
Аналогична `snapshots_agg_1h`, но `bucket` - начало дня, `count` обычно 1440.

### Использование

```sql
-- График за год (365 точек)
SELECT bucket, avgBidVolumeUsd, avgAskVolumeUsd
FROM snapshots_agg_1d_view
WHERE symbol = 'BTCUSDT'
  AND depth = 5
  AND bucket >= NOW() - INTERVAL '1 year'
ORDER BY bucket ASC;
```

## 4.5 Таблица `websocket_events` (Logs)

### Назначение
Логирование событий WebSocket (подключения, ошибки, reconnects).

### Структура

```prisma
model WebSocketEvent {
  id         String   @id @default(cuid())
  timestamp  DateTime @default(now())
  symbol     String
  marketType MarketType
  eventType  WebSocketEventType  // CONNECTED, ERROR, etc.
  message    String?
  metadata   Json?    // Доп. данные в JSON

  @@map("websocket_events")
}

enum WebSocketEventType {
  CONNECTED
  DISCONNECTED
  ERROR
  RECONNECTING
  SNAPSHOT_LOADED
  GAP_DETECTED
  UPDATE_FAILED
}
```

### Использование

```typescript
// Логирование события
await prisma.webSocketEvent.create({
  data: {
    symbol: 'BTCUSDT',
    marketType: 'SPOT',
    eventType: 'ERROR',
    message: 'Connection timeout',
    metadata: { attempt: 3, delay: 5000 }
  }
});
```

## 4.6 Таблица `system_metrics`

### Назначение
Системные метрики для мониторинга (CPU, память, cache hit rate и т.д.).

### Структура

```prisma
model SystemMetric {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  metricName  String   // "cpu_usage", "cache_hit_rate"
  metricValue Float    // Числовое значение
  metadata    Json?

  @@map("system_metrics")
}
```

## 4.7 Связи между таблицами

**Прямых Foreign Keys НЕТ.**

Связь через общие поля:
- `symbol`
- `marketType`
- `timestamp`

Агрегатные таблицы создаются автоматически TimescaleDB из `snapshots`.

## 4.8 Размер данных (итого)

**10 символов, 1 год:**

| Таблица | Размер |
|---------|--------|
| snapshots (60 дней, compressed) | ~200 MB |
| snapshots_agg_1h (бессрочно) | ~300 MB |
| snapshots_agg_1d (бессрочно) | ~50 MB |
| websocket_events (14 дней) | ~10 MB |
| system_metrics (60 дней) | ~50 MB |
| **ИТОГО** | **~610 MB** |

---

<a name="быстрый-старт"></a>
# 6. БЫСТРЫЙ СТАРТ (Quick Start)

## 5.1 Предварительные требования

- ✅ Docker и Docker Compose
- ✅ Node.js 20+
- ✅ 10 GB свободного места
- ✅ PostgreSQL порт 5432 свободен
- ✅ Redis порт 6379 свободен

## 5.2 Пошаговая установка

### Шаг 1: Установка зависимостей

```bash
# Prisma
npm install @prisma/client
npm install -D prisma

# Redis
npm install ioredis
npm install -D @types/ioredis

# Утилиты
npm install zod date-fns
```

### Шаг 2: Инициализация Prisma

```bash
# Инициализировать Prisma
npx prisma init --datasource-provider postgresql

# Скопировать готовую схему
cp docs/prisma-schema.prisma prisma/schema.prisma
```

### Шаг 3: Настройка .env

Создайте `.env` файл:

```env
DATABASE_URL="postgresql://postgres:your_strong_password@localhost:5432/tradingdb?schema=public"
REDIS_URL="redis://localhost:6379"
BINANCE_SPOT_WS_URL=wss://stream.binance.com:9443/ws
BINANCE_FUTURES_WS_URL=wss://fstream.binance.com/ws
NODE_ENV=development
PORT=3000
```

### Шаг 4: Обновление docker-compose.yml

```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16  # ← Изменить
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-your_strong_password}
      POSTGRES_DB: tradingdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-timescaledb.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
```

### Шаг 5: Запуск БД

```bash
# Запустить PostgreSQL и Redis
docker-compose up -d db redis

# Проверить статус
docker-compose ps

# Просмотреть логи
docker-compose logs -f db
```

### Шаг 6: Применение миграций

```bash
# Создать миграцию
npx prisma migrate dev --name init_snapshots

# Сгенерировать Prisma Client
npx prisma generate

# Открыть Prisma Studio (опционально)
npx prisma studio
```

### Шаг 7: Настройка TimescaleDB

```bash
# Если БД в Docker
docker-compose exec db psql -U postgres -d tradingdb -f /docker-entrypoint-initdb.d/init.sql

# Или напрямую
psql -U postgres -d tradingdb -f scripts/init-timescaledb.sql
```

Проверка:

```sql
-- Подключитесь к БД
psql -U postgres -d tradingdb

-- Проверьте hypertables
SELECT * FROM timescaledb_information.hypertables;

-- Проверьте continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;
```

### Шаг 8: Запуск приложения

```bash
npm run dev
```

Откройте браузер: `http://localhost:3000/charts`

## 5.3 Проверка работы

### Проверка записи данных

```bash
# Открыть Prisma Studio
npx prisma studio

# Перейти в таблицу Snapshot
# Должны появиться записи каждую минуту
```

### Проверка в PostgreSQL

```sql
-- Количество записей
SELECT COUNT(*) FROM snapshots;

-- Последние записи
SELECT * FROM snapshots ORDER BY timestamp DESC LIMIT 10;

-- Статистика
SELECT * FROM get_snapshot_stats();
```

### Проверка Redis

```bash
# Подключиться к Redis
docker-compose exec redis redis-cli

# Посмотреть ключи
KEYS *

# Проверить sorted set
ZRANGE snapshot:BTCUSDT:SPOT:5:recent 0 -1
```

---

<a name="план-реализации"></a>
# 7. ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

## 6.1 Этапы (3-5 дней)

### День 1: Инфраструктура

**Утро (2-3 часа):**
- [ ] Установить зависимости
- [ ] Обновить docker-compose.yml
- [ ] Создать .env
- [ ] Запустить PostgreSQL и Redis
- [ ] Применить Prisma миграции
- [ ] Выполнить TimescaleDB setup

**Вечер (3-4 часа):**
- [ ] Создать `src/backend/database/prisma.client.ts`
- [ ] Создать `src/backend/database/redis.client.ts`
- [ ] Создать `src/backend/services/snapshot/SnapshotRepository.ts`

### День 2: Сервисы и интеграция

**Утро (3-4 часа):**
- [ ] Создать `src/backend/services/snapshot/SnapshotService.ts`
- [ ] Написать unit-тесты

**Вечер (2-3 часа):**
- [ ] Интегрировать с `/api/binance/spot/route.ts`
- [ ] Интегрировать с `/api/binance/futures/route.ts`
- [ ] Обновить `/api/chart-data/route.ts`
- [ ] Удалить старый `/api/snapshots/route.ts`

### День 3: Тестирование

**Утро (2-3 часа):**
- [ ] Запустить приложение
- [ ] Проверить запись данных
- [ ] Проверить чтение данных
- [ ] Проверить графики

**Вечер (2 часа):**
- [ ] Load testing
- [ ] Оптимизация индексов
- [ ] Настройка PostgreSQL параметров

### День 4-5: Production ready (опционально)

- [ ] Обновить Dockerfile
- [ ] Настроить бэкапы
- [ ] Настроить мониторинг (Grafana)
- [ ] Деплой в staging
- [ ] Деплой в production

## 6.2 Checklist готовности

**Инфраструктура:**
- [ ] PostgreSQL запущен и доступен
- [ ] Redis запущен и доступен
- [ ] TimescaleDB extension установлен
- [ ] Hypertables созданы
- [ ] Continuous aggregates созданы

**Код:**
- [ ] Prisma Client работает
- [ ] Redis Client подключается
- [ ] SnapshotService создан
- [ ] API routes обновлены
- [ ] Frontend polling обновлен (60 сек)

**Тесты:**
- [ ] Данные записываются каждую минуту
- [ ] Данные читаются из БД
- [ ] Графики отображаются
- [ ] Cache работает (Redis)

**Production:**
- [ ] Dockerfile обновлен
- [ ] Environment variables настроены
- [ ] Бэкапы настроены
- [ ] Мониторинг настроен

---

<a name="примеры-кода"></a>
# 8. ПРИМЕРЫ КОДА

## 7.1 Prisma Client

**Файл:** `src/backend/database/prisma.client.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## 7.2 Redis Client

**Файл:** `src/backend/database/redis.client.ts`

```typescript
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  lazyConnect: true,
});

redis.on('error', (err) => console.error('[Redis] Error:', err));
redis.on('connect', () => console.log('[Redis] Connected'));

process.on('beforeExit', async () => {
  await redis.quit();
});

export default redis;
```

## 7.3 Snapshot Repository

**Файл:** `src/backend/services/snapshot/SnapshotRepository.ts`

```typescript
import { prisma } from '@/backend/database/prisma.client';
import { MarketType } from '@prisma/client';

export interface SnapshotInput {
  timestamp: Date;
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
  bidVolume: number;
  askVolume: number;
  bidVolumeUsd: number;
  askVolumeUsd: number;
}

export interface SnapshotQuery {
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
  type?: 'bid' | 'ask';
  from?: Date;
  to?: Date;
  limit?: number;
}

export class SnapshotRepository {
  async createMany(snapshots: SnapshotInput[]): Promise<number> {
    const result = await prisma.snapshot.createMany({
      data: snapshots.map(s => ({
        ...s,
        marketType: s.marketType as MarketType,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findMany(query: SnapshotQuery) {
    const { symbol, marketType, depth, type, from, to, limit = 3600 } = query;

    return await prisma.snapshot.findMany({
      where: {
        symbol,
        marketType: marketType as MarketType,
        depth,
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: {
        timestamp: true,
        bidVolume: type === 'bid' || !type,
        askVolume: type === 'ask' || !type,
        bidVolumeUsd: type === 'bid' || !type,
        askVolumeUsd: type === 'ask' || !type,
      },
    });
  }

  async getStats(symbol: string, marketType: 'SPOT' | 'FUTURES') {
    const stats = await prisma.snapshot.aggregate({
      where: { symbol, marketType: marketType as MarketType },
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    return {
      totalSnapshots: stats._count,
      oldestSnapshot: stats._min.timestamp,
      newestSnapshot: stats._max.timestamp,
    };
  }
}

export const snapshotRepository = new SnapshotRepository();
```

## 7.4 Snapshot Service

**Файл:** `src/backend/services/snapshot/SnapshotService.ts`

```typescript
import { snapshotRepository, SnapshotInput, SnapshotQuery } from './SnapshotRepository';
import redis from '@/backend/database/redis.client';

export class SnapshotService {
  private batchBuffer: SnapshotInput[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 60000; // 60 секунд
  private readonly CACHE_TTL_SECONDS = 7200; // 2 часа

  async write(snapshot: SnapshotInput): Promise<void> {
    this.batchBuffer.push(snapshot);
    await this.writeToCacheAsync(snapshot);

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      await this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.BATCH_INTERVAL_MS);
    }
  }

  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchBuffer.length === 0) return;

    const snapshots = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      const count = await snapshotRepository.createMany(snapshots);
      console.log(`[SnapshotService] Flushed ${count} snapshots to DB`);
    } catch (error) {
      console.error('[SnapshotService] Error flushing:', error);
    }
  }

  private async writeToCacheAsync(snapshot: SnapshotInput): Promise<void> {
    try {
      const key = `snapshot:${snapshot.symbol}:${snapshot.marketType}:${snapshot.depth}:recent`;

      await redis.zadd(key, snapshot.timestamp.getTime(), JSON.stringify(snapshot));

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      await redis.zremrangebyscore(key, 0, twoHoursAgo);
      await redis.expire(key, this.CACHE_TTL_SECONDS);
    } catch (error) {
      console.warn('[SnapshotService] Redis write failed:', error);
    }
  }

  async read(query: SnapshotQuery): Promise<any[]> {
    const cached = await this.readFromCache(query);
    if (cached) {
      console.log('[SnapshotService] Cache hit');
      return cached;
    }

    console.log('[SnapshotService] Cache miss, reading from DB');
    const snapshots = await snapshotRepository.findMany(query);
    await this.writeQueryResultToCache(query, snapshots);
    return snapshots;
  }

  private async readFromCache(query: SnapshotQuery): Promise<any[] | null> {
    try {
      const now = Date.now();
      const from = query.from?.getTime() || (now - 2 * 60 * 60 * 1000);
      const to = query.to?.getTime() || now;

      if (from >= now - 2 * 60 * 60 * 1000) {
        const key = `snapshot:${query.symbol}:${query.marketType}:${query.depth}:recent`;
        const data = await redis.zrangebyscore(key, from, to);

        if (data && data.length > 0) {
          return data.map(item => JSON.parse(item));
        }
      }

      const queryKey = this.getQueryCacheKey(query);
      const cached = await redis.get(queryKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[SnapshotService] Redis read error:', error);
      return null;
    }
  }

  private async writeQueryResultToCache(query: SnapshotQuery, data: any[]): Promise<void> {
    try {
      const key = this.getQueryCacheKey(query);
      await redis.setex(key, this.CACHE_TTL_SECONDS, JSON.stringify(data));
    } catch (error) {
      console.warn('[SnapshotService] Cache write error:', error);
    }
  }

  private getQueryCacheKey(query: SnapshotQuery): string {
    const { symbol, marketType, depth, type, from, to, limit } = query;
    return `query:${symbol}:${marketType}:${depth}:${type || 'all'}:${from?.getTime() || 'noFrom'}:${to?.getTime() || 'noTo'}:${limit || 3600}`;
  }

  async shutdown(): Promise<void> {
    console.log('[SnapshotService] Shutting down...');
    await this.flush();
  }
}

export const snapshotService = new SnapshotService();

process.on('beforeExit', async () => {
  await snapshotService.shutdown();
});
```

## 7.5 Интеграция с API

### Обновление /api/binance/spot/route.ts

```typescript
import { snapshotService } from '@/backend/services/snapshot/SnapshotService';

export async function GET(request: NextRequest) {
  // ... существующий код ...

  // После расчета depthVolumes, добавить:
  const saveSnapshots = async () => {
    try {
      const timestamp = new Date();
      const depths = [1.5, 3, 5, 8, 15, 30];

      for (const depth of depths) {
        const volumes = depthVolumes[depth];
        if (!volumes) continue;

        await snapshotService.write({
          timestamp,
          symbol,
          marketType: 'SPOT',
          depth,
          bidVolume: volumes.bidVolume,
          askVolume: volumes.askVolume,
          bidVolumeUsd: volumes.bidValueUsd,
          askVolumeUsd: volumes.askValueUsd,
        });
      }
    } catch (error) {
      console.error('[API] Error saving snapshots:', error);
    }
  };

  saveSnapshots(); // Async, не блокирует

  // ... return response ...
}
```

### Обновление /api/chart-data/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { snapshotService } from '@/backend/services/snapshot/SnapshotService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const marketType = searchParams.get('marketType')?.toUpperCase() as 'SPOT' | 'FUTURES';
    const depthStr = searchParams.get('depth');
    const type = searchParams.get('type') as 'bid' | 'ask' | undefined;

    if (!symbol || !marketType || !depthStr) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const depth = parseFloat(depthStr);
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 60 * 1000); // Последний час

    const snapshots = await snapshotService.read({
      symbol, marketType, depth, type, from, to, limit: 3600
    });

    const chartData = snapshots.map((s: any) => {
      const value = type === 'bid' ? s.bidVolumeUsd
        : type === 'ask' ? s.askVolumeUsd
        : (s.bidVolumeUsd + s.askVolumeUsd) / 2;

      return {
        time: Math.floor(new Date(s.timestamp).getTime() / 1000),
        value,
      };
    });

    return NextResponse.json({
      success: true,
      data: chartData,
      count: chartData.length,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Обновление Frontend (LightweightChart.tsx)

```typescript
// Изменить интервал опроса с 1000 на 60000
useEffect(() => {
  const pollDataCollection = async () => {
    // ... код опроса ...
  };

  pollDataCollection();
  const intervalId = setInterval(pollDataCollection, 60000); // Было: 1000

  return () => clearInterval(intervalId);
}, [symbol, marketType]);
```

---

<a name="api-endpoints"></a>
# 9. API ENDPOINTS

## 8.1 Существующие endpoints (обновлены)

### GET /api/binance/spot
Запускает сбор данных для SPOT рынка и сохраняет snapshots.

**Query params:**
- `symbol` (string, required): "BTCUSDT"

**Response:**
```json
{
  "success": true,
  "topOrderBook": { "bids": [...], "asks": [...] },
  "depthVolumes": {
    "1.5": { "bidVolume": 123, ... },
    "3": { ... }
  },
  "wsStatus": "connected"
}
```

**Изменения:**
- Теперь сохраняет snapshots каждую минуту в БД
- Асинхронно (не блокирует ответ)

### GET /api/chart-data
Получение данных для графиков из БД.

**Query params:**
- `symbol` (string, required)
- `marketType` (string, required): "SPOT" | "FUTURES"
- `depth` (number, required): 1.5, 3, 5, 8, 15, 30
- `type` (string, optional): "bid" | "ask"
- `from` (ISO8601, optional): По умолчанию now - 1 hour
- `to` (ISO8601, optional): По умолчанию now

**Response:**
```json
{
  "success": true,
  "data": [
    { "time": 1700000000, "value": 8123456.78 },
    { "time": 1700000060, "value": 8125678.90 }
  ],
  "count": 60
}
```

**Изменения:**
- Читает из PostgreSQL (было: in-memory Map)
- Использует Redis кэш
- Поддерживает диапазоны дат

## 8.2 Новые endpoints (рекомендуемые)

### GET /api/analytics/history
Получение исторических данных с агрегацией.

**Query params:**
- `symbol` (string, required)
- `marketType` (string, required)
- `depth` (number, required)
- `from` (ISO8601, required)
- `to` (ISO8601, required)
- `interval` (string, optional): "1h" | "1d", default "1h"

**Response:**
```json
{
  "success": true,
  "interval": "1h",
  "data": [
    {
      "bucket": "2025-11-16T14:00:00Z",
      "avgBidVolume": 125.67,
      "maxBidVolume": 135.89,
      "count": 60
    }
  ]
}
```

**Реализация:**
```typescript
export async function GET(request: NextRequest) {
  const interval = searchParams.get('interval') || '1h';

  if (interval === '1h') {
    const data = await prisma.$queryRaw`
      SELECT bucket, avgBidVolumeUsd, avgAskVolumeUsd
      FROM snapshots_agg_1h_view
      WHERE symbol = ${symbol}
        AND "marketType" = ${marketType}::"market_type"
        AND depth = ${depth}
        AND bucket >= ${from}::timestamptz
        AND bucket <= ${to}::timestamptz
      ORDER BY bucket ASC
    `;
    return NextResponse.json({ success: true, interval, data });
  }

  // Аналогично для 1d
}
```

### GET /api/analytics/stats
Статистика по символу.

**Query params:**
- `symbol` (string, required)
- `marketType` (string, required)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSnapshots": 1036800,
    "oldestSnapshot": "2025-10-16T00:00:00Z",
    "newestSnapshot": "2025-11-16T14:30:00Z",
    "dataAvailableDays": 31
  }
}
```

---

<a name="производительность"></a>
# 10. ПРОИЗВОДИТЕЛЬНОСТЬ И ОПТИМИЗАЦИЯ

## 9.1 Частота записи

**1 символ:**
- 12 записей/минуту (2 рынка × 6 глубин)
- 720 записей/час
- 17,280 записей/день

**10 символов:**
- 120 записей/минуту
- 7,200 записей/час
- 172,800 записей/день

**Нагрузка на БД:**
- Batch flush: каждые ~4 минуты (batch 50) или по таймауту 60 сек
- **~0.2 writes/sec** в среднем (очень низкая нагрузка)

## 9.2 PostgreSQL настройки

**postgresql.conf:**
```conf
# Память
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query planner (для SSD)
random_page_cost = 1.1
effective_io_concurrency = 200

# TimescaleDB
timescaledb.max_background_workers = 8
```

## 9.3 Redis настройки

```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save ""  # Отключить persistence (cache-only)
```

## 9.4 Индексы

Все необходимые индексы уже в Prisma schema:

```prisma
@@index([timestamp(sort: Desc)])
@@index([symbol, marketType, depth, timestamp(sort: Desc)])
@@unique([symbol, marketType, depth, timestamp])
```

TimescaleDB автоматически оптимизирует их для time-series.

## 9.5 Cache стратегия

**Уровень 1: Redis (Hot data)**
- Sorted sets для последних 2 часов
- TTL: 2 часа
- Hit rate: ~80-90% для real-time дашбордов
- Latency: < 5ms

**Уровень 2: PostgreSQL**
- TimescaleDB chunk pruning (сканирует только нужные chunks)
- Compression для старых данных
- Latency: < 300ms для 1 часа

## 9.6 Compression экономия

**Без compression:**
- 1 snapshot = ~105 bytes
- 10 символов, 1 год = ~6.5 GB

**С TimescaleDB compression:**
- Compression ratio: ~10:1 (90% экономия)
- 10 символов, 1 год = **~650 MB**

---

<a name="мониторинг"></a>
# 11. МОНИТОРИНГ И TROUBLESHOOTING

## 10.1 Мониторинг метрик

### PostgreSQL

```sql
-- Статистика snapshots
SELECT * FROM get_snapshot_stats();

-- Покрытие данных
SELECT * FROM get_data_coverage();

-- Compression статистика
SELECT * FROM get_compression_stats();

-- Размер таблиц
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Активные подключения
SELECT count(*) FROM pg_stat_activity;
```

### Redis

```bash
# Подключиться
docker-compose exec redis redis-cli

# Info
INFO stats
INFO memory

# Ключи
KEYS *

# Размер sorted set
ZCARD snapshot:BTCUSDT:SPOT:5:recent
```

### Application

Логи для мониторинга:
```
[SnapshotService] Flushed N snapshots to DB
[SnapshotService] Cache hit
[SnapshotService] Cache miss, reading from DB
[Redis] Connected
[Prisma] Query: SELECT ...
```

## 10.2 Troubleshooting

### Проблема: Prisma не может подключиться

**Решение:**
```bash
# Проверить PostgreSQL
docker-compose ps db

# Проверить DATABASE_URL
cat .env | grep DATABASE_URL

# Тест подключения
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT version();"
```

### Проблема: TimescaleDB extension не установлен

**Решение:**
```sql
-- Подключиться
docker-compose exec db psql -U postgres -d tradingdb

-- Проверить extensions
\dx

-- Если нет timescaledb
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

### Проблема: Данные не записываются

**Чеклист:**
1. Проверить логи приложения
2. Проверить что WebSocket подключен
3. Проверить что таймер работает (каждую минуту)
4. Проверить логи `[SnapshotService] Flushed N snapshots`
5. Проверить в Prisma Studio

### Проблема: Slow queries

**Диагностика:**
```sql
-- Долгие запросы
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- Неиспользуемые индексы
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public';
```

**Решение:**
- Добавить недостающие индексы
- Использовать `EXPLAIN ANALYZE` для запросов
- Проверить что TimescaleDB compression работает

### Проблема: Disk space заполняется

**Решение:**
```sql
-- Проверить retention policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- Вручную удалить старые данные
SELECT drop_chunks('snapshots', INTERVAL '90 days');

-- Проверить compression
SELECT * FROM get_compression_stats();
```

## 10.3 Бэкапы

### Автоматический бэкап (рекомендуется)

```bash
# Добавить в crontab
0 2 * * * /usr/bin/docker-compose exec -T db pg_dump -U postgres tradingdb | gzip > /backups/tradingdb-$(date +\%Y\%m\%d).sql.gz

# Удаление старых бэкапов (> 30 дней)
0 3 * * * find /backups -name "tradingdb-*.sql.gz" -mtime +30 -delete
```

### Ручной бэкап

```bash
# Полный бэкап
docker-compose exec db pg_dump -U postgres tradingdb > backup.sql

# С компрессией
docker-compose exec db pg_dump -U postgres tradingdb | gzip > backup.sql.gz

# Только схема
docker-compose exec db pg_dump -U postgres --schema-only tradingdb > schema.sql
```

### Восстановление

```bash
# Из файла
docker-compose exec -T db psql -U postgres tradingdb < backup.sql

# Из gz
gunzip < backup.sql.gz | docker-compose exec -T db psql -U postgres tradingdb
```

---

<a name="faq"></a>
# 12. FAQ (Часто задаваемые вопросы)

## Q: Почему 1 минута, а не 1 секунда?

**A:** Экономия 98% данных при достаточной детализации для анализа. Для real-time мониторинга используйте WebSocket напрямую, БД нужна для исторического анализа.

## Q: Что если нужна большая детализация?

**A:** Можно сохранять MAX/MIN значения за минуту или уменьшить интервал до 10-30 секунд. Но помните о нагрузке на БД.

## Q: Сколько стоит хранение для 100 символов?

**A:** ~6.2 GB/год с compression. На S3: ~$0.15/мес, на DigitalOcean Spaces: ~$1/мес.

## Q: Можно ли использовать другую БД вместо PostgreSQL?

**A:** Да, но потеряете TimescaleDB преимущества (compression, continuous aggregates). MongoDB можно, но менее эффективна для time-series.

## Q: Как масштабировать на несколько инстансов приложения?

**A:**
1. Shared PostgreSQL (все инстансы пишут в одну БД)
2. Redis Cluster для кэша
3. Опционально: Kafka для event streaming

## Q: Нужен ли Redis обязательно?

**A:** Нет, но очень рекомендуется. Без Redis queries будут медленнее (300ms вместо 50ms).

## Q: Как часто обновляются continuous aggregates?

**A:**
- Hourly: каждый час
- Daily: каждый день
- Можно вручную: `SELECT refresh_all_continuous_aggregates();`

## Q: Что делать если PostgreSQL упал?

**A:**
1. Приложение продолжит работать (данные в памяти)
2. Запись будет буферизироваться в SnapshotService
3. После восстановления БД данные запишутся
4. Если долгий downtime - батч может переполниться (увеличить BATCH_SIZE)

## Q: Можно ли читать данные во время compression?

**A:** Да, TimescaleDB позволяет прозрачное чтение compressed данных.

## Q: Как удалить все данные и начать заново?

**A:**
```sql
TRUNCATE snapshots CASCADE;
```

## Q: Prisma миграции конфликтуют с TimescaleDB?

**A:** Нет, но TimescaleDB setup нужно делать ПОСЛЕ Prisma миграций. Порядок:
1. `npx prisma migrate dev`
2. `psql ... -f init-timescaledb.sql`

---

# 13. ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

## Документация

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TimescaleDB Docs](https://docs.timescale.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Redis Docs](https://redis.io/docs/)

## Файлы проекта

- `docs/prisma-schema.prisma` - Готовая схема БД
- `scripts/init-timescaledb.sql` - SQL setup скрипт

## Лучшие практики

- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/schema-management/best-practices/)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Redis Patterns](https://redis.io/docs/manual/patterns/)

---

# 14. CHANGELOG

## [1.1.0] - 2025-11-16

### Изменено
- Частота сохранения: 1 секунда → 1 МИНУТА
- Retention: 30 дней → 60 дней
- Compression: 7 дней → 14 дней
- Удалена таблица `snapshots_agg_1m`
- Добавлена таблица `snapshots_agg_1d`

### Результат
- 98.4% экономия данных
- Размер для 10 символов: 37 GB → 620 MB/год

## [1.0.0] - 2025-11-16
- Первая версия документации

---

**Конец документации**

**Версия:** 1.1
**Дата:** 2025-11-16
**Автор:** Claude Code
**Статус:** ✅ Ready for Implementation

Для начала работы откройте раздел [5. Быстрый старт](#быстрый-старт)
