# Trading Platform - Полная документация проекта
## Real-time платформа для анализа BID/ASK объемов на криптовалютных рынках

**Версия:** 2.0
**Дата:** 2025-11-17
**Автор:** Claude Code
**Статус:** ✅ В разработке

---

# 📋 СОДЕРЖАНИЕ

## ЧАСТЬ I: ТЕХНИЧЕСКОЕ ЗАДАНИЕ

1. [Обзор архитектуры и потоков данных](#обзор-архитектуры) ⭐ НОВОЕ
2. [Цели и задачи проекта](#цели-и-задачи) ⭐ НОВОЕ
3. [Функциональные требования](#функциональные-требования) ⭐ НОВОЕ
4. [Нефункциональные требования](#нефункциональные-требования) ⭐ НОВОЕ
5. [Технический стек](#технический-стек) ⭐ НОВОЕ
6. [Структура проекта и модули](#структура-проекта) ⭐ НОВОЕ
7. [Пользовательские сценарии (User Stories)](#user-stories) ⭐ НОВОЕ
8. [Roadmap развития](#roadmap) ⭐ НОВОЕ

## ЧАСТЬ II: РЕАЛИЗАЦИЯ БД

9. [Краткая сводка (Executive Summary)](#executive-summary)
10. [Введение и текущее состояние](#введение)
11. [Архитектура решения](#архитектура)
12. [Модуль сбора данных с Binance](#модуль-сбора-данных)
13. [Схема базы данных](#схема-бд)
14. [Быстрый старт (Quick Start)](#быстрый-старт)
15. [Детальный план реализации](#план-реализации)
16. [Примеры кода](#примеры-кода)
17. [API endpoints](#api-endpoints)
18. [Производительность и оптимизация](#производительность)
19. [Мониторинг и troubleshooting](#мониторинг)
20. [FAQ](#faq)

---

<a name="обзор-архитектуры"></a>
# 1. ОБЗОР АРХИТЕКТУРЫ И ПОТОКОВ ДАННЫХ

## 1.1 Общая схема системы

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        BINANCE API (Источник данных)                      │
│  ┌────────────────────────────┐   ┌────────────────────────────┐         │
│  │  WebSocket API             │   │  REST API                  │         │
│  │  wss://stream.binance.com  │   │  https://api.binance.com   │         │
│  │  (Real-time updates)       │   │  (Snapshots)               │         │
│  └────────────┬───────────────┘   └───────────┬────────────────┘         │
└───────────────┼──────────────────────────────┼───────────────────────────┘
                │                               │
                │ Depth Updates                 │ Initial Snapshot
                │ (1/sec)                       │ (On connect)
                ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES (Node.js/Next.js)                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  1. BinanceWebSocketService                                        │  │
│  │     - Управление WebSocket подключением                            │  │
│  │     - Автоматические переподключения                               │  │
│  │     - Обработка Depth Updates                                      │  │
│  └──────────────────┬─────────────────────────────────────────────────┘  │
│                     │ Передает Depth Updates                             │
│                     ▼                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  2. OrderBookService                                               │  │
│  │     - Загружает initial snapshot через REST API                    │  │
│  │     - Поддерживает актуальный Order Book в памяти                  │  │
│  │     - Применяет WebSocket updates инкрементально                   │  │
│  │     - Обнаруживает пропуски (gaps) и перезагружает snapshot        │  │
│  └──────────────────┬─────────────────────────────────────────────────┘  │
│                     │ Предоставляет Order Book                           │
│                     ▼                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  3. Depth Calculator                                               │  │
│  │     - Рассчитывает объемы BID/ASK на заданных глубинах             │  │
│  │     - Глубины: 1.5%, 3%, 5%, 8%, 15%, 30%                          │  │
│  │     - Вычисляет стоимость в USD                                    │  │
│  └──────────────────┬─────────────────────────────────────────────────┘  │
│                     │ Depth Volumes                                       │
│                     ▼                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  4. SnapshotService                                                │  │
│  │     - Батчинг: собирает snapshots в буфер (до 50 шт)               │  │
│  │     - Периодическая запись в БД (каждые 60 сек)                    │  │
│  │     - Асинхронная запись в Redis (не блокирует ответ)              │  │
│  └──────┬───────────────────────────────────────────────┬─────────────┘  │
└─────────┼───────────────────────────────────────────────┼────────────────┘
          │                                               │
          │ Batch INSERT                                  │ Async Cache
          ▼                                               ▼
┌──────────────────────────┐               ┌─────────────────────────────┐
│  PostgreSQL + TimescaleDB│               │  Redis Cache                │
│  (Persistent Storage)    │               │  (Hot Data - 2 hours)       │
│  - Hypertables           │               │  - Sorted Sets по времени   │
│  - Compression (90%)     │               │  - TTL: 2 часа              │
│  - Retention (60 дней)   │               │  - Hit Rate: ~80-90%        │
│  - Continuous Aggregates │               └─────────────────────────────┘
└──────────────────────────┘
          │
          │ Read Queries
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS (Next.js API Routes)                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/binance/spot?symbol=BTCUSDT                             │  │
│  │  GET /api/binance/futures?symbol=BTCUSDT                          │  │
│  │  GET /api/binance/depth?symbol=BTCUSDT&depth=5&type=all           │  │
│  │  GET /api/chart-data?symbol=BTCUSDT&depth=5&type=bid              │  │
│  │  POST /api/snapshots (сохранение)                                 │  │
│  │  GET /api/snapshots (чтение истории)                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ JSON Response
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Next.js)                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  - TradingView Lightweight Charts                                 │  │
│  │  - Real-time графики объемов BID/ASK                              │  │
│  │  - Order Book таблица                                             │  │
│  │  - Индикаторы DIFF                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Где какие данные получаются и для чего

### 📥 ИСТОЧНИКИ ДАННЫХ

#### 1.2.1 Binance WebSocket API

**Что получаем:**
- **Depth Updates** (обновления стакана ордеров)
- **Частота:** 1 раз в секунду (настроено через `UPDATE_SPEED.SLOW`)
- **Формат:** Инкрементальные изменения (добавления/удаления/обновления ордеров)

**Пример данных:**
```json
{
  "e": "depthUpdate",
  "E": 1700000000000,
  "s": "BTCUSDT",
  "U": 123456789,
  "u": 123456790,
  "b": [
    ["65000.00", "1.5"],      // [price, quantity]
    ["64999.50", "0.0"]       // quantity=0 означает удаление
  ],
  "a": [
    ["65100.00", "2.3"]
  ]
}
```

**Для чего:**
- Поддержание актуального состояния Order Book в реальном времени
- Минимальный объем передаваемых данных (только изменения)
- Низкая задержка (latency < 100ms)

**Файл:** `src/backend/services/binance/WebSocketService.ts`

**Endpoint:**
- **SPOT:** `wss://stream.binance.com:9443/ws/btcusdt@depth@1000ms`
- **FUTURES:** `wss://fstream.binance.com/ws/btcusdt@depth@1000ms`

---

#### 1.2.2 Binance REST API

**Что получаем:**
- **Initial Snapshot** (начальное состояние Order Book)
- **Частота:** 1 раз при запуске + по требованию при обнаружении gaps
- **Формат:** Полный список до 1000 лучших BID и ASK ордеров

**Пример данных:**
```json
{
  "lastUpdateId": 123456789,
  "bids": [
    ["65000.00", "1.5"],
    ["64999.50", "0.8"],
    // ... до 1000 ордеров
  ],
  "asks": [
    ["65100.00", "2.3"],
    ["65100.50", "1.2"],
    // ... до 1000 ордеров
  ]
}
```

**Для чего:**
- Получение полного состояния Order Book при старте приложения
- Восстановление после обнаружения пропущенных WebSocket updates
- Синхронизация с Binance через `lastUpdateId`

**Файл:** `src/backend/services/binance/OrderBookService.ts` (метод `loadInitialSnapshot`)

**Endpoint:**
- **SPOT:** `https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=1000`
- **FUTURES:** `https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000`

---

### 🔄 ОБРАБОТКА ДАННЫХ

#### 1.2.3 OrderBookService - Поддержание актуального стакана

**Что делает:**
1. **Загрузка Initial Snapshot:**
   - При старте загружает snapshot через REST API
   - Сохраняет `lastUpdateId` для синхронизации

2. **Буферизация WebSocket Updates:**
   - Пока snapshot загружается, WebSocket updates сохраняются в буфер
   - Предотвращает потерю данных

3. **Применение Updates:**
   - После загрузки snapshot применяет все буферизированные updates
   - Далее updates применяются в реальном времени

4. **Обнаружение Gaps (пропусков):**
   - Проверяет последовательность `update.U` и `lastUpdateId`
   - При обнаружении gap автоматически перезагружает snapshot
   - Использует rate limiting и exponential backoff

**Файл:** `src/backend/services/binance/OrderBookService.ts`

**Ключевые методы:**
```typescript
async start()              // Запуск: WebSocket + Snapshot + Buffered Updates
loadInitialSnapshot()      // Загрузка snapshot через REST
handleDepthUpdate(update)  // Обработка WebSocket update
applyUpdate(update)        // Применение update к Order Book
reloadSnapshot()           // Перезагрузка при gaps
```

**Внутреннее представление Order Book:**
```typescript
interface OrderBook {
  symbol: string;           // "BTCUSDT"
  marketType: MarketType;   // "SPOT" | "FUTURES"
  bids: Order[];            // Отсортированы по убыванию цены
  asks: Order[];            // Отсортированы по возрастанию цены
  timestamp: number;
  lastUpdateId?: number;    // Для синхронизации
}

interface Order {
  price: number;
  volume: number;
}
```

---

#### 1.2.4 Depth Calculator - Расчет объемов на глубинах

**Что делает:**
- Рассчитывает суммарные объемы BID и ASK на заданных глубинах от лучшей цены
- Глубины: **1.5%, 3%, 5%, 8%, 15%, 30%**

**Алгоритм:**
```typescript
// Пример для глубины 5%:
const bestBid = 65000 USDT;
const bestAsk = 65100 USDT;

// Диапазон для BID:
const bidRange = {
  from: 65000 * (1 - 0.05) = 61750 USDT,  // -5% от bestBid
  to: 65000 USDT
}

// Диапазон для ASK:
const askRange = {
  from: 65100 USDT,
  to: 65100 * (1 + 0.05) = 68355 USDT     // +5% от bestAsk
}

// Суммируем объемы в диапазонах
bidVolume = sum(orders where price >= 61750 AND price <= 65000)
askVolume = sum(orders where price >= 65100 AND price <= 68355)

// Стоимость в USD
bidValueUsd = sum(price * quantity) для всех BID ордеров в диапазоне
askValueUsd = sum(price * quantity) для всех ASK ордеров в диапазоне
```

**Файл:** `src/backend/utils/calculations/depthCalculator.ts`

**Результат:**
```typescript
interface DepthVolumes {
  depth: number;          // 1.5, 3, 5, 8, 15, 30
  bidVolume: number;      // Объем BTC
  askVolume: number;      // Объем BTC
  totalBidValue: number;  // Стоимость в USD
  totalAskValue: number;  // Стоимость в USD
  currentPrice: number;   // Mid price
  timestamp: number;
}
```

**Пример данных:**
```json
{
  "depth": 5,
  "bidVolume": 123.45,
  "askVolume": 156.78,
  "totalBidValue": 8123456.78,
  "totalAskValue": 10234567.89,
  "currentPrice": 65050,
  "timestamp": 1700000000000
}
```

---

#### 1.2.5 DIFF Calculator - Расчет индикаторов

**Что делает:**
- Рассчитывает разницу между BID и ASK объемами
- Вычисляет процентное соотношение

**Алгоритм:**
```typescript
diff = bidVolume - askVolume
percentage = (diff / (bidVolume + askVolume)) * 100

// Интерпретация:
// percentage > 0  → Больше покупателей (BID преобладает)
// percentage < 0  → Больше продавцов (ASK преобладает)
// percentage ≈ 0  → Баланс
```

**Файл:** `src/backend/utils/calculations/diffCalculator.ts`

**Результат:**
```typescript
interface DiffIndicator {
  depth: number;
  diff: number;        // bidVolume - askVolume
  percentage: number;  // % соотношение
}
```

---

### 💾 СОХРАНЕНИЕ ДАННЫХ

#### 1.2.6 SnapshotService - Батчинг и сохранение

**Что делает:**
1. **Батчинг (накопление):**
   - Собирает snapshots в буфер (до 50 шт)
   - Периодический flush каждые 60 секунд
   - Минимизирует нагрузку на БД

2. **Асинхронная запись в Redis:**
   - Не блокирует API response
   - Sorted Sets с TTL 2 часа
   - Быстрый доступ к свежим данным

3. **Batch INSERT в PostgreSQL:**
   - Эффективная запись множества записей за 1 транзакцию
   - TimescaleDB автоматически партиционирует по дням

**Файл:** `src/backend/services/snapshot.service.ts`

**Ключевые методы:**
```typescript
async write(snapshot)      // Добавить в буфер + Redis
private flush()            // Записать буфер в PostgreSQL
async read(query)          // Читать с кэшированием
```

**Частота сохранения:**
```
1 символ × 2 рынка (SPOT + FUTURES) × 6 глубин × 1/минуту = 12 записей/мин
10 символов = 120 записей/мин
100 символов = 1200 записей/мин

Batch flush: каждые ~4 минуты (50 snapshots) или по таймауту 60 сек
```

**Формат snapshot в БД:**
```typescript
{
  timestamp: Date,          // Округлено до минуты
  symbol: "BTCUSDT",
  marketType: "SPOT",
  depth: 5,
  bidVolume: 123.45,
  askVolume: 156.78,
  bidVolumeUsd: 8123456.78,
  askVolumeUsd: 10234567.89
}
```

---

### 📊 API ENDPOINTS

#### 1.2.7 GET /api/binance/spot

**Что возвращает:**
- Текущее состояние Order Book для SPOT рынка
- Depth Volumes для всех 6 глубин
- DIFF индикаторы
- WebSocket статус

**Файл:** `src/app/api/binance/spot/route.ts`

**Поток обработки:**
```
1. Получить или создать OrderBookService для символа
2. Если новый → запустить WebSocket + загрузить snapshot
3. Получить текущий Order Book
4. Рассчитать Depth Volumes (6 глубин)
5. Рассчитать DIFF индикаторы
6. АСИНХРОННО: сохранить snapshots через POST /api/snapshots
7. Вернуть response (не ждем сохранения)
```

**Response:**
```json
{
  "type": "SPOT",
  "symbol": "BTCUSDT",
  "timestamp": 1700000000000,
  "midPrice": 65050,
  "spread": 100,
  "bestBid": { "price": 65000, "volume": 1.5 },
  "bestAsk": { "price": 65100, "volume": 2.3 },
  "bids": [...],  // Топ 20
  "asks": [...],  // Топ 20
  "depthVolumes": [
    { "depth": 1.5, "bidVolume": 45.2, ... },
    { "depth": 3, "bidVolume": 89.7, ... },
    { "depth": 5, "bidVolume": 123.45, ... },
    // ... остальные глубины
  ],
  "diffs": [
    { "depth": 1.5, "diff": -5.2, "percentage": -2.5 },
    // ... остальные глубины
  ],
  "wsStatus": "connected"
}
```

---

#### 1.2.8 GET /api/binance/futures

**Аналогично /api/binance/spot, но для FUTURES рынка**

**Файл:** `src/app/api/binance/futures/route.ts`

---

#### 1.2.9 GET /api/binance/depth

**Что возвращает:**
- Агрегированные данные для конкретной глубины
- Данные для SPOT и/или FUTURES

**Файл:** `src/app/api/binance/depth/route.ts`

**Query params:**
```
depth=5          // Глубина (1.5, 3, 5, 8, 15, 30)
type=all         // spot | futures | all
symbol=BTCUSDT   // Символ
```

**Response:**
```json
{
  "depth": 5,
  "symbol": "BTCUSDT",
  "timestamp": 1700000000000,
  "spot": {
    "bid": 123.45,
    "ask": 156.78,
    "diff": -33.33,
    "percentage": -12.5,
    "totalBidValue": 8123456.78,
    "totalAskValue": 10234567.89
  },
  "futures": { ... }
}
```

---

#### 1.2.10 POST /api/snapshots

**Что делает:**
- Сохраняет массив snapshots в БД через SnapshotService
- Вызывается асинхронно из /api/binance/spot и /api/binance/futures

**Файл:** `src/app/api/snapshots/route.ts`

**Request body:**
```json
[
  {
    "timestamp": 1700000000000,
    "symbol": "BTCUSDT",
    "marketType": "SPOT",
    "depth": 1.5,
    "bidVolume": 45.2,
    "askVolume": 52.3,
    "bidVolumeUsd": 2950000,
    "askVolumeUsd": 3400000
  },
  // ... еще 5 snapshots для других глубин
]
```

**Response:**
```json
{
  "success": true,
  "message": "Saved 6 snapshots",
  "timestamp": 1700000000000
}
```

---

#### 1.2.11 GET /api/chart-data

**Что возвращает:**
- Исторические данные для построения графиков
- Формат Lightweight Charts: `{ time, value }[]`

**Файл:** `src/app/api/chart-data/route.ts`

**Query params:**
```
symbol=BTCUSDT       // Символ
marketType=SPOT      // SPOT | FUTURES
depth=5              // Глубина
type=bid             // bid | ask | null (среднее)
from=1700000000000   // Unix timestamp (optional)
to=1700003600000     // Unix timestamp (optional)
```

**Поток обработки:**
```
1. Парсим параметры
2. Читаем из БД через SnapshotService.read()
   - Сначала проверяется Redis cache
   - Если cache miss → читаем из PostgreSQL
3. Трансформируем в формат Lightweight Charts
4. Возвращаем response
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "marketType": "SPOT",
  "depth": 5,
  "type": "bid",
  "data": [
    { "time": 1700000000, "value": 8123456.78 },
    { "time": 1700000060, "value": 8125678.90 },
    { "time": 1700000120, "value": 8120123.45 },
    // ... до 3600 точек (1 час с минутной гранулярностью)
  ],
  "count": 60,
  "timestamp": 1700003600000
}
```

---

### 🗄️ ХРАНЕНИЕ ДАННЫХ

#### 1.2.12 PostgreSQL + TimescaleDB

**Что хранится:**
- Таблица `snapshots`: минутные snapshots BID/ASK объемов
- Таблица `snapshots_agg_1h`: часовые агрегаты (автоматические)
- Таблица `snapshots_agg_1d`: дневные агрегаты (автоматические)

**Оптимизации:**
- **Hypertables:** Автоматическое партиционирование по дням
- **Compression:** 90% экономия места после 14 дней
- **Retention:** Автоматическое удаление данных старше 60 дней
- **Continuous Aggregates:** Автоматическое вычисление агрегатов

**Размер данных (10 символов, 1 год):**
- Без compression: ~6.5 GB
- С compression: **~650 MB**

---

#### 1.2.13 Redis Cache

**Что хранится:**
- **Sorted Sets:** Последние 2 часа данных для каждого (symbol, marketType, depth)
- **Query Cache:** Результаты частых запросов
- **TTL:** 2 часа

**Структура ключей:**
```
snapshot:BTCUSDT:SPOT:5:recent          → Sorted Set по времени
query:BTCUSDT:SPOT:5:bid:from:to:limit  → Кэш результата запроса
```

**Производительность:**
- Cache hit: **< 50ms**
- Cache miss: **< 300ms** (чтение из PostgreSQL)

---

## 1.3 Итоговый поток данных (End-to-End)

### Real-time обновление графиков:

```
1. BINANCE WebSocket → Depth Update (каждую секунду)
   ↓
2. BinanceWebSocketService → Получает update
   ↓
3. OrderBookService → Обновляет Order Book в памяти
   ↓
4. Frontend → Опрашивает GET /api/binance/spot каждые N секунд
   ↓
5. API → Рассчитывает Depth Volumes в реальном времени
   ↓
6. API → Асинхронно сохраняет snapshot (POST /api/snapshots)
   ↓
7. SnapshotService → Батчинг + запись в Redis + периодический flush в PostgreSQL
   ↓
8. Frontend → Получает свежие данные и обновляет график
```

### Загрузка исторических данных:

```
1. Frontend → GET /api/chart-data?symbol=BTCUSDT&depth=5&type=bid
   ↓
2. SnapshotService.read() → Проверяет Redis cache
   ↓
   ├─ Cache HIT → Возвращает данные (< 50ms)
   │
   └─ Cache MISS → Читает из PostgreSQL
      ↓
      PostgreSQL → Возвращает snapshots
      ↓
      Redis ← Кэширует результат (TTL 2 часа)
      ↓
3. API → Трансформирует в формат Lightweight Charts
   ↓
4. Frontend → Отрисовывает график
```

---

<a name="цели-и-задачи"></a>
# 2. ЦЕЛИ И ЗАДАЧИ ПРОЕКТА

## 2.1 Описание проекта

**Trading Platform** — это аналитическая платформа для мониторинга и анализа объемов BID/ASK ордеров на криптовалютных рынках Binance в режиме реального времени.

### Основная концепция

Платформа собирает данные стакана ордеров (Order Book) с Binance и рассчитывает агрегированные объемы на различных ценовых глубинах, позволяя трейдерам и аналитикам:

- 📊 Видеть реальное распределение ликвидности на рынке
- 📈 Отслеживать изменения объемов покупок/продаж во времени
- 🔍 Выявлять уровни поддержки и сопротивления на основе реальных объемов
- ⚖️ Анализировать дисбаланс между покупателями и продавцами (BID vs ASK)
- 🎯 Принимать более обоснованные торговые решения

---

## 2.2 Бизнес-цели

### 🎯 Основные цели

1. **Предоставление уникальной аналитики**
   - Визуализация объемов на глубинах, недоступная в стандартных торговых терминалах
   - DIFF-индикаторы для оценки баланса покупателей/продавцов
   - Исторические данные для анализа динамики рынка

2. **Повышение качества торговых решений**
   - Real-time данные с минимальной задержкой (< 1 секунда)
   - Надежное хранение исторических данных
   - Возможность анализа нескольких торговых пар одновременно

3. **Масштабируемость и надежность**
   - Поддержка множества символов (100+)
   - Работа с двумя рынками: SPOT и FUTURES
   - Отказоустойчивость при сбоях Binance API

---

## 2.3 Технические задачи

### ✅ Фаза 1: MVP (Текущая реализация)

- [x] Подключение к Binance WebSocket API
- [x] Поддержание актуального Order Book в памяти
- [x] Расчет объемов на 6 глубинах (1.5%, 3%, 5%, 8%, 15%, 30%)
- [x] Расчет DIFF индикаторов
- [x] REST API для получения данных
- [x] Frontend с графиками TradingView Lightweight Charts
- [x] Поддержка SPOT и FUTURES рынков

### 🔨 Фаза 2: Постоянное хранилище (В разработке)

- [ ] PostgreSQL + TimescaleDB для хранения исторических данных
- [ ] Redis для кэширования hot data
- [ ] Батчинг и оптимизация записи в БД
- [ ] Compression и retention policies
- [ ] Continuous aggregates для долгосрочного анализа

### 🚀 Фаза 3: Расширенная аналитика (Планируется)

- [ ] REST Collector для сбора данных с 100+ символов
- [ ] Агрегированные индикаторы (TOTAL, TOTAL1, TOTAL2, OTHERS)
- [ ] Корреляция между рынками
- [ ] ML-модели для предсказания движения цены
- [ ] Алерты и уведомления

### 📊 Фаза 4: Production-ready (Будущее)

- [ ] Мониторинг и алертинг (Grafana + Prometheus)
- [ ] Автоматические бэкапы
- [ ] Load balancing
- [ ] Rate limiting для API
- [ ] Аутентификация и авторизация
- [ ] WebSocket для real-time обновлений на frontend

---

## 2.4 Ключевые метрики успеха

### Технические метрики

| Метрика | Целевое значение | Текущее |
|---------|------------------|---------|
| WebSocket uptime | > 99.5% | ✅ ~99% |
| API response time | < 100ms | ✅ 50-80ms |
| Data loss при рестарте | 0% | ⚠️ 100% (in-memory) |
| Исторические данные | 90+ дней | ❌ 0 дней |
| Cache hit rate | > 80% | ⏳ Не реализовано |
| Database write latency | < 1 сек | ⏳ Не реализовано |

### Бизнес-метрики

| Метрика | Цель |
|---------|------|
| Количество поддерживаемых символов | 100+ |
| Количество одновременных пользователей | 50+ |
| Задержка обновления графиков | < 2 сек |
| Доступность сервиса | 99.9% |

---

## 2.5 Целевая аудитория

### 👥 Основные пользователи

1. **Криптовалютные трейдеры**
   - Интрадей трейдеры (scalping, day trading)
   - Свинг-трейдеры
   - Алгоритмические трейдеры

2. **Аналитики и исследователи**
   - Анализ рыночной микроструктуры
   - Исследование ликвидности
   - Бэктестинг стратегий

3. **Маркет-мейкеры**
   - Мониторинг глубины рынка
   - Оптимизация размещения ордеров
   - Управление рисками

---

## 2.6 Конкурентные преимущества

### ✨ Уникальные возможности

1. **Глубинный анализ ликвидности**
   - Расчет объемов на 6 различных глубинах
   - Недоступно в стандартных торговых терминалах

2. **DIFF индикаторы**
   - Мгновенная оценка дисбаланса BID/ASK
   - Процентное соотношение покупателей/продавцов

3. **Исторические данные**
   - Долгосрочное хранение (60+ дней)
   - Минутная гранулярность
   - Автоматические агрегаты (часовые, дневные)

4. **Real-time + History**
   - Одновременно актуальные и исторические данные
   - Плавная интеграция WebSocket и REST API

5. **Низкая latency**
   - Прямое подключение к Binance WebSocket
   - Оптимизированная обработка updates
   - Redis кэширование

---

## 2.7 Ограничения и риски

### ⚠️ Технические ограничения

1. **Binance API Limits**
   - WebSocket: макс. 5 подключений с одного IP (решение: REST Collector)
   - REST: 1200 requests/min weight limit
   - Возможные блокировки при превышении лимитов

2. **Задержка данных**
   - WebSocket updates: ~100-300ms от момента сделки
   - Минутная гранулярность сохранения (компромисс производительность/объем)

3. **Потребление ресурсов**
   - Order Book в памяти: ~10-50 MB на символ
   - PostgreSQL storage: ~620 MB/год на 10 символов
   - Redis memory: 256 MB (настраиваемо)

### 🔴 Бизнес-риски

1. **Зависимость от Binance**
   - Изменения в API могут потребовать адаптации
   - Downtime Binance = downtime платформы
   - Необходимость соблюдения ToS Binance

2. **Регуляторные риски**
   - Изменения в законодательстве о криптовалютах
   - Требования к лицензированию

3. **Конкуренция**
   - Появление аналогичных решений
   - Интеграция функционала в существующие терминалы

### ✅ Меры по снижению рисков

1. **Технические меры**
   - Graceful handling Binance API ошибок
   - Automatic reconnection при потере соединения
   - Gap detection и auto-recovery
   - Бэкапы БД

2. **Архитектурные решения**
   - Возможность добавления других бирж (абстракция)
   - Микросервисная архитектура (будущее)
   - Горизонтальное масштабирование

---

<a name="функциональные-требования"></a>
# 3. ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

## 3.1 Основной функционал

### FR-1: Сбор данных с Binance

**Приоритет:** 🔴 Критический

**Описание:**
Система должна подключаться к Binance WebSocket API и получать обновления Order Book в режиме реального времени.

**Требования:**
- Поддержка SPOT рынка (wss://stream.binance.com)
- Поддержка FUTURES рынка (wss://fstream.binance.com)
- Обработка Depth Updates с частотой 1/сек
- Загрузка initial snapshot через REST API при старте
- Автоматическое переподключение при обрыве соединения
- Обнаружение пропущенных updates (gap detection)
- Exponential backoff при повторных подключениях

**Критерии приемки:**
- ✅ WebSocket подключается успешно
- ✅ Обновления обрабатываются в реальном времени
- ✅ При обрыве соединения происходит автоматический reconnect
- ✅ Gap detection работает и перезагружает snapshot

---

### FR-2: Поддержание актуального Order Book

**Приоритет:** 🔴 Критический

**Описание:**
Система должна поддерживать в памяти актуальный стакан ордеров для каждого отслеживаемого символа.

**Требования:**
- In-memory хранение до 10,000 лучших BID и ASK ордеров
- Инкрементальное применение WebSocket updates
- Сортировка BID по убыванию, ASK по возрастанию
- Синхронизация через lastUpdateId
- Буферизация updates до загрузки snapshot

**Критерии приемки:**
- ✅ Order Book отражает актуальное состояние рынка
- ✅ Updates применяются корректно (добавление/удаление/обновление)
- ✅ Отсутствие gaps в данных
- ✅ Валидация Order Book (best bid < best ask)

---

### FR-3: Расчет объемов на глубинах

**Приоритет:** 🔴 Критический

**Описание:**
Система должна рассчитывать суммарные объемы BID и ASK на заданных ценовых глубинах.

**Требования:**
- Поддержка 6 глубин: 1.5%, 3%, 5%, 8%, 15%, 30%
- Расчет от лучшей цены (best bid/ask)
- Вычисление объема в монетах (BTC, ETH и т.д.)
- Вычисление стоимости в USD
- Расчет за < 10ms для всех 6 глубин

**Критерии приемки:**
- ✅ Объемы рассчитываются корректно
- ✅ Диапазоны определяются от best bid/ask (не от mid price!)
- ✅ Производительность < 10ms
- ✅ Точность расчетов (проверка на реальных данных)

---

### FR-4: DIFF индикаторы

**Приоритет:** 🟡 Средний

**Описание:**
Система должна рассчитывать разницу между BID и ASK объемами для оценки баланса рынка.

**Требования:**
- Расчет: diff = bidVolume - askVolume
- Расчет: percentage = (diff / (bidVolume + askVolume)) * 100
- Для всех 6 глубин

**Критерии приемки:**
- ✅ DIFF рассчитывается корректно
- ✅ Положительный % = преобладают покупатели
- ✅ Отрицательный % = преобладают продавцы

---

### FR-5: REST API для данных

**Приоритет:** 🔴 Критический

**Описание:**
Система должна предоставлять REST API для получения текущих и исторических данных.

**Требования:**

**Endpoints:**
- GET /api/binance/spot?symbol=BTCUSDT
- GET /api/binance/futures?symbol=BTCUSDT
- GET /api/binance/depth?depth=5&type=all&symbol=BTCUSDT
- GET /api/chart-data?symbol=BTCUSDT&depth=5&type=bid
- POST /api/snapshots (сохранение)
- GET /api/snapshots (чтение истории)

**Критерии приемки:**
- ✅ Все endpoints возвращают валидный JSON
- ✅ Response time < 100ms для текущих данных
- ✅ Response time < 300ms для исторических данных
- ✅ Корректная обработка ошибок (4xx, 5xx)

---

### FR-6: Хранение исторических данных

**Приоритет:** 🔴 Критический

**Описание:**
Система должна сохранять snapshots BID/ASK объемов для долгосрочного анализа.

**Требования:**
- Сохранение каждую минуту (минутная гранулярность)
- PostgreSQL + TimescaleDB для основного хранения
- Redis для кэширования hot data (2 часа)
- Батчинг: накопление до 50 snapshots перед flush
- Compression после 14 дней
- Retention: 60 дней

**Критерии приемки:**
- ✅ Данные сохраняются каждую минуту
- ✅ Потеря данных при рестарте = 0%
- ✅ Доступна история за 60+ дней
- ✅ Compression работает (90% экономия)

---

### FR-7: Визуализация данных

**Приоритет:** 🔴 Критический

**Описание:**
Система должна предоставлять web-интерфейс для визуализации данных.

**Требования:**
- Графики на базе TradingView Lightweight Charts
- Real-time обновление графиков (polling каждые N секунд)
- Выбор символа, рынка (SPOT/FUTURES), глубины
- Переключение между BID/ASK/Both
- Таблица Order Book (топ 20 BID/ASK)
- Панель DIFF индикаторов

**Критерии приемки:**
- ✅ Графики отображаются корректно
- ✅ Обновления происходят в реальном времени
- ✅ UI responsive и интуитивный
- ✅ Нет задержек при переключении символов

---

### FR-8: Поддержка множества символов

**Приоритет:** 🟡 Средний (Фаза 3)

**Описание:**
Система должна поддерживать мониторинг 100+ торговых пар одновременно.

**Требования:**
- REST Collector вместо WebSocket (обход лимита 5 подключений)
- Опрос каждого символа каждую минуту
- Rate limiting: 300ms между запросами
- Управление списком символов через API

**Критерии приемки:**
- ✅ Поддерживается 100+ символов
- ✅ Не превышаются rate limits Binance
- ✅ Производительность не деградирует

---

### FR-9: Агрегированные индикаторы

**Приоритет:** 🟢 Низкий (Фаза 3)

**Описание:**
Система должна рассчитывать агрегированные индикаторы для групп символов.

**Требования:**
- TOTAL: сумма по всем символам
- TOTAL1: исключая BTC
- TOTAL2: исключая BTC и ETH
- OTHERS: топовые альткоины

**Критерии приемки:**
- ✅ Индикаторы рассчитываются корректно
- ✅ Обновляются в реальном времени
- ✅ Доступны на отдельной странице

---

## 3.2 Нефункциональные требования (детально в разделе 4)

### NFR-1: Производительность
- WebSocket latency < 100ms
- API response time < 100ms
- Database write < 1 сек (батчинг)

### NFR-2: Надежность
- Uptime > 99.5%
- Auto-recovery при сбоях
- Graceful degradation

### NFR-3: Масштабируемость
- Поддержка 100+ символов
- Горизонтальное масштабирование (будущее)

### NFR-4: Безопасность
- Rate limiting
- Input validation
- Защита от injection атак

---

<a name="нефункциональные-требования"></a>
# 4. НЕФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

## 4.1 Производительность

### 4.1.1 Latency

**Требования:**
- WebSocket Depth Update processing: **< 100ms**
- REST API response (текущие данные): **< 100ms** (p95)
- REST API response (исторические данные): **< 300ms** (p95)
- Database write latency (батчинг): **< 1 сек**
- Redis cache read: **< 10ms**
- PostgreSQL query (1 час данных): **< 200ms**

**Измерение:**
- Логирование в console с timestamp
- Prometheus metrics (будущее)
- APM tools (New Relic, DataDog) - опционально

---

### 4.1.2 Throughput

**Требования:**
- WebSocket updates обработка: **1000+ updates/sec**
- API requests: **100+ req/sec**
- Database writes: **120 snapshots/min** (10 символов)
- Redis operations: **10,000+ ops/sec**

**Масштабирование:**
- При увеличении символов до 100: 1200 snapshots/min
- При необходимости: горизонтальное масштабирование API

---

### 4.1.3 Resource Usage

**Пределы:**
- CPU (per symbol): < 5% (4-core machine)
- Memory (per symbol): < 50 MB
- PostgreSQL storage: ~62 MB/год на 1 символ
- Redis memory: 256 MB (настраиваемо)
- Network bandwidth: < 10 Mbps на 10 символов

---

## 4.2 Надежность и отказоустойчивость

### 4.2.1 Availability

**Требования:**
- Target uptime: **99.5%** (downtime < 43 минут/месяц)
- Плановое обслуживание: ночные часы UTC
- Graceful shutdown: flush всех буферов перед остановкой

**Стратегии:**
- Health checks: GET /api/health
- Automatic restart при критических ошибках
- Docker restart policies
- Load balancer health checks (будущее)

---

### 4.2.2 Error Handling

**WebSocket:**
- Автоматический reconnect при обрыве
- Exponential backoff: 1s, 2s, 4s, ... до 30s
- Максимум 5 попыток, затем alert
- Gap detection и auto-recovery

**Database:**
- Retry logic для transient errors (3 попытки)
- Circuit breaker при persistent failures
- Fallback: сохранение в локальный файл (emergency)

**API:**
- Корректные HTTP status codes (4xx, 5xx)
- Детальные error messages в JSON
- Request ID для troubleshooting

---

### 4.2.3 Data Integrity

**Требования:**
- Отсутствие дубликатов snapshots (unique constraint)
- Отсутствие gaps в исторических данных
- Consistency между Redis и PostgreSQL

**Меры:**
- Database constraints и индексы
- Atomic batch inserts
- Validation перед сохранением
- Periodic data integrity checks

---

## 4.3 Масштабируемость

### 4.3.1 Вертикальное масштабирование

**Текущая конфигурация (dev):**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD

**Production конфигурация:**
- CPU: 8 cores
- RAM: 16 GB
- Storage: 500 GB SSD

**Пределы:**
- Максимум символов на 1 инстансе: ~50
- При превышении: горизонтальное масштабирование

---

### 4.3.2 Горизонтальное масштабирование (Фаза 4)

**Архитектура:**
- Несколько инстансов приложения за Load Balancer
- Shared PostgreSQL (возможно read replicas)
- Redis Cluster
- Распределение символов между инстансами

**Стратегии:**
- Stateless API (кроме OrderBookService cache)
- Shared database для consistency
- Pub/Sub через Redis для координации

---

## 4.4 Безопасность

### 4.4.1 Authentication & Authorization (Фаза 4)

**Текущее:** Public API (без auth)

**Будущее:**
- API Keys для доступа
- JWT tokens
- Role-based access control (RBAC)
- Rate limiting per user

---

### 4.4.2 Input Validation

**Требования:**
- Валидация всех query params
- Проверка типов данных
- Санитизация строк (защита от SQL injection)
- Лимиты на размер request body

**Примеры:**
```typescript
// Валидация depth
if (!DEPTH_LEVELS.includes(depth)) {
  return 400 Bad Request
}

// Валидация symbol
if (!/^[A-Z]{6,10}$/.test(symbol)) {
  return 400 Bad Request
}
```

---

### 4.4.3 Rate Limiting

**Требования:**
- API rate limit: **100 req/min** per IP (будущее)
- Burst limit: **10 req/sec**
- Response: HTTP 429 Too Many Requests
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining

---

### 4.4.4 Security Best Practices

**Checklist:**
- ✅ HTTPS для production
- ✅ Environment variables для секретов
- ✅ Регулярные обновления зависимостей
- ✅ SQL injection защита (Prisma)
- ✅ XSS protection (React escape)
- ❌ CORS настройка (todo)
- ❌ CSP headers (todo)

---

## 4.5 Мониторинг и Observability

### 4.5.1 Logging

**Уровни логов:**
- ERROR: критические ошибки
- WARN: предупреждения, recoverable errors
- INFO: важные события (start, stop, reconnect)
- DEBUG: детальная отладочная информация

**Структура:**
```
[Timestamp] [Level] [Component] Message
2025-11-17 10:30:45 INFO [OrderBookService] Connected to BTCUSDT SPOT
2025-11-17 10:30:50 WARN [WebSocketService] Connection lost, reconnecting...
2025-11-17 10:30:55 ERROR [SnapshotService] Failed to flush: DB connection error
```

**Инструменты:**
- Console logs (dev)
- File rotation (production)
- Centralized logging (ELK, Grafana Loki) - будущее

---

### 4.5.2 Metrics

**Ключевые метрики:**
- WebSocket uptime %
- API request count (per endpoint)
- API response time (p50, p95, p99)
- Database write success rate
- Cache hit rate
- Error rate (per component)
- Active symbols count

**Инструменты (Фаза 4):**
- Prometheus
- Grafana dashboards
- AlertManager

---

### 4.5.3 Health Checks

**Endpoint:** GET /api/health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1700000000000,
  "uptime": 3600,
  "components": {
    "database": {
      "status": "healthy",
      "latency": 15
    },
    "redis": {
      "status": "healthy",
      "latency": 2
    },
    "websockets": {
      "active": 10,
      "status": "healthy"
    }
  }
}
```

---

## 4.6 Совместимость

### 4.6.1 Browser Support

**Требования:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Не поддерживается:**
- IE 11 и ниже

---

### 4.6.2 API Versioning

**Стратегия:**
- URL-based versioning: /api/v1/, /api/v2/
- Backwards compatibility в пределах одной версии
- Deprecation period: 6 месяцев

---

## 4.7 Maintainability

### 4.7.1 Code Quality

**Требования:**
- TypeScript strict mode
- ESLint + Prettier
- Code coverage > 70% (будущее)
- Documentation для всех public API

---

### 4.7.2 Deployment

**Требования:**
- Docker containerization
- One-command deployment
- Environment-specific configs
- Rollback capability

---

<a name="технический-стек"></a>
# 5. ТЕХНИЧЕСКИЙ СТЕК

## 5.1 Backend

### Runtime & Framework
- **Node.js** 20.x LTS
- **Next.js** 16.0.1 (App Router)
  - Server-side rendering
  - API Routes
  - Built-in optimization

### Programming Language
- **TypeScript** 5.x
  - Strict mode enabled
  - Type-safe development
  - Better IDE support

### WebSocket
- **ws** 8.18.3
  - Native WebSocket client для Node.js
  - Lightweight и быстрый
  - Автоматический ping/pong

### Database
- **PostgreSQL** 16
  - Relational database
  - ACID compliance
  - Mature и reliable

- **TimescaleDB** (PostgreSQL extension)
  - Time-series optimization
  - Automatic partitioning (hypertables)
  - Compression (90% saving)
  - Continuous aggregates
  - Retention policies

- **Prisma** 5.22.0
  - Type-safe ORM
  - Automatic migrations
  - Schema-first approach
  - Excellent TypeScript integration

### Caching
- **Redis** 7.x
  - In-memory data store
  - Sub-millisecond latency
  - Sorted Sets для time-series
  - Pub/Sub capabilities
  - LRU eviction policy

**Client library:**
- **redis** 4.7.0 (Node.js client)

---

## 5.2 Frontend

### Framework
- **React** 19.x
  - Component-based architecture
  - Virtual DOM
  - Hooks API

- **Next.js** 16.0.1
  - Server Components
  - Client Components
  - Automatic code splitting

### Charting Library
- **Lightweight Charts** 5.0.9 (TradingView)
  - High-performance canvas rendering
  - Real-time updates
  - Customizable
  - Lightweight (~100KB gzipped)

### Styling
- **Tailwind CSS** 3.4.1
  - Utility-first CSS
  - Responsive design
  - JIT compiler
  - Dark mode support

### State Management
- **React Hooks** (useState, useEffect)
- **Context API** (для глобального состояния)
- Без Redux/MobX (KISS principle)

---

## 5.3 Development Tools

### Package Manager
- **npm** (comes with Node.js)

### Linting & Formatting
- **ESLint** (Next.js built-in)
- **Prettier** (optional)
- **TypeScript Compiler**

### Testing (Планируется)
- **Jest** - unit testing
- **React Testing Library** - component testing
- **Supertest** - API testing

---

## 5.4 Infrastructure

### Containerization
- **Docker** 24.x
- **Docker Compose** 2.x
  - Multi-container setup
  - Development environment
  - Production deployment

### Reverse Proxy (Production)
- **Nginx** или **Traefik**
  - HTTPS termination
  - Load balancing
  - Rate limiting

### Monitoring (Фаза 4)
- **Prometheus** - metrics collection
- **Grafana** - visualization
- **AlertManager** - alerting

### Logging (Фаза 4)
- **Winston** или **Pino** - structured logging
- **Grafana Loki** - log aggregation
- **ELK Stack** - альтернатива

---

## 5.5 External APIs

### Binance API
- **WebSocket API**
  - SPOT: wss://stream.binance.com
  - FUTURES: wss://fstream.binance.com

- **REST API**
  - SPOT: https://api.binance.com/api/v3
  - FUTURES: https://fapi.binance.com/fapi/v1

**Rate Limits:**
- WebSocket: 5 connections per IP
- REST: 1200 weight/minute

---

## 5.6 Версии зависимостей

```json
{
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "lightweight-charts": "^5.0.9",
    "next": "16.0.1",
    "redis": "^4.7.0",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "ws": "^8.18.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/ws": "^8.18.1",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

---

<a name="структура-проекта"></a>
# 6. СТРУКТУРА ПРОЕКТА И МОДУЛИ

## 6.1 Общая структура директорий

```
TradingPlatform/
│
├── docs/                          # Документация
│   └── DOCUMENTATION.md           # Техническое задание
│
├── src/                           # Исходный код
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API Routes
│   │   ├── charts/                # Страницы
│   │   ├── dashboard/
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   │
│   ├── backend/                   # Backend logic
│   │   ├── config/                # Конфигурация
│   │   ├── database/              # Database clients
│   │   ├── repositories/          # Data access layer
│   │   ├── services/              # Business logic
│   │   ├── types/                 # Backend типы
│   │   └── utils/                 # Утилиты
│   │
│   ├── components/                # React компоненты
│   │   ├── charts/                # Графики
│   │   ├── layout/                # Layout компоненты
│   │   └── orderbook/             # Order Book таблицы
│   │
│   └── shared/                    # Общий код
│       ├── constants/             # Константы
│       └── types/                 # Общие типы
│
├── prisma/                        # Prisma ORM
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
│
├── scripts/                       # Скрипты
│   └── init-timescaledb.sql       # TimescaleDB setup
│
├── public/                        # Static files
│
├── docker-compose.yml             # Docker configuration
├── Dockerfile                     # Docker image
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js             # Tailwind config
├── next.config.js                 # Next.js config
└── .env                           # Environment variables
```

---

## 6.2 Детальная структура модулей

### 6.2.1 API Routes (`src/app/api/`)

```
src/app/api/
│
├── binance/
│   ├── spot/
│   │   └── route.ts               # GET /api/binance/spot
│   ├── futures/
│   │   └── route.ts               # GET /api/binance/futures
│   └── depth/
│       └── route.ts               # GET /api/binance/depth
│
├── chart-data/
│   └── route.ts                   # GET /api/chart-data
│
├── snapshots/
│   └── route.ts                   # GET, POST /api/snapshots
│
├── collector/
│   ├── route.ts                   # GET, POST, DELETE /api/collector
│   └── symbols/
│       └── route.ts               # POST, DELETE /api/collector/symbols
│
└── health/
    └── route.ts                   # GET /api/health
```

**Описание endpoints:**

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/binance/spot` | GET | Текущие данные SPOT рынка |
| `/api/binance/futures` | GET | Текущие данные FUTURES рынка |
| `/api/binance/depth` | GET | Агрегированные данные по глубине |
| `/api/chart-data` | GET | Исторические данные для графиков |
| `/api/snapshots` | POST | Сохранить snapshots в БД |
| `/api/snapshots` | GET | Получить исторические snapshots |
| `/api/collector` | GET | Статус REST collector |
| `/api/collector` | POST | Запустить collector |
| `/api/collector` | DELETE | Остановить collector |
| `/api/collector/symbols` | POST | Добавить символы |
| `/api/collector/symbols` | DELETE | Удалить символы |
| `/api/health` | GET | Health check |

---

### 6.2.2 Backend Services (`src/backend/services/`)

```
src/backend/services/
│
├── binance/
│   ├── WebSocketService.ts       # WebSocket подключение к Binance
│   ├── OrderBookService.ts       # Управление Order Book
│   └── BinanceRestCollector.ts   # REST collector для 100+ символов
│
└── snapshot.service.ts            # Батчинг и сохранение snapshots
```

**Описание сервисов:**

#### WebSocketService
- **Ответственность:** Управление WebSocket подключением
- **Функции:**
  - connect() - подключение к Binance
  - disconnect() - отключение
  - reconnect() - переподключение
  - handleMessage() - обработка Depth Updates
  - handleError() - обработка ошибок

#### OrderBookService
- **Ответственность:** Поддержание актуального Order Book
- **Функции:**
  - start() - запуск (WebSocket + REST snapshot)
  - stop() - остановка
  - getOrderBook() - получить текущий Order Book
  - loadInitialSnapshot() - загрузка snapshot через REST
  - applyUpdate() - применение WebSocket update
  - reloadSnapshot() - перезагрузка при gaps

#### SnapshotService
- **Ответственность:** Сохранение и чтение snapshots
- **Функции:**
  - write() - добавить snapshot в буфер
  - flush() - записать буфер в PostgreSQL
  - read() - прочитать с кэшированием
  - shutdown() - graceful shutdown

#### BinanceRestCollector (Фаза 3)
- **Ответственность:** Сбор данных с 100+ символов через REST API
- **Функции:**
  - start() - запуск периодического сбора
  - stop() - остановка
  - collectAllSnapshots() - один цикл сбора
  - fetchOrderBook() - получение order book через REST
  - addSymbols() - добавить символы
  - removeSymbols() - удалить символы

---

### 6.2.3 Backend Utilities (`src/backend/utils/`)

```
src/backend/utils/
│
├── calculations/
│   ├── depthCalculator.ts         # Расчет объемов на глубинах
│   └── diffCalculator.ts          # Расчет DIFF индикаторов
│
├── validators/
│   └── orderBookValidator.ts      # Валидация Order Book
│
└── helpers/
    └── priceHelper.ts             # Помощники для работы с ценами
```

**Описание утилит:**

#### depthCalculator.ts
```typescript
calculateDepthVolumes(orderBook, depth)     // Расчет для одной глубины
calculateAllDepthVolumes(orderBook, depths) // Расчет для всех глубин
calculateAverageVolume(depthVolumes)        // Средний объем
findMaxBidDepth(depthVolumes)               // Максимальный BID
findMaxAskDepth(depthVolumes)               // Максимальный ASK
```

#### diffCalculator.ts
```typescript
calculateDiff(depthVolumes)                 // Расчет DIFF для одной глубины
calculateAllDiffs(depthVolumes)             // Расчет для всех глубин
```

#### orderBookValidator.ts
```typescript
validateOrderBook(orderBook)                // Валидация Order Book
isValidDepthUpdate(message)                 // Валидация Depth Update
```

#### priceHelper.ts
```typescript
parsePrice(priceString)                     // Парсинг цены
parseVolume(volumeString)                   // Парсинг объема
calculatePriceRange(price, depth, side)     // Расчет диапазона цен
calculateMidPrice(bid, ask)                 // Расчет mid price
isPriceInRange(price, range)                // Проверка принадлежности диапазону
calculateOrderValue(price, volume)          // Расчет стоимости ордера
```

---

### 6.2.4 Database Layer (`src/backend/database/` и `src/backend/repositories/`)

```
src/backend/database/
├── prisma.client.ts               # Prisma Client singleton
└── redis.client.ts                # Redis Client singleton

src/backend/repositories/
└── snapshot.repository.ts         # Data Access Layer для snapshots
```

**Описание:**

#### prisma.client.ts
```typescript
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});
```

#### redis.client.ts
```typescript
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

#### snapshot.repository.ts
```typescript
createMany(snapshots)               // Batch INSERT snapshots
findMany(query)                     // Читать snapshots с фильтрами
getStats(symbol, marketType)        // Статистика snapshots
```

---

### 6.2.5 Frontend Components (`src/components/`)

```
src/components/
│
├── charts/
│   ├── LightweightChart.tsx       # TradingView график
│   └── IndicatorsPanel.tsx        # Панель индикаторов
│
├── layout/
│   └── Navigation.tsx             # Навигация
│
└── orderbook/
    ├── OrderBookTable.tsx         # Таблица WebSocket Order Book
    └── OrderBookRestTable.tsx     # Таблица REST Order Book
```

**Описание компонентов:**

#### LightweightChart.tsx
- **Props:** symbol, marketType, depth, type (bid/ask)
- **State:** chartData, loading, error
- **Hooks:**
  - useEffect() - polling GET /api/chart-data
  - useRef() - TradingView chart instance
- **Функционал:**
  - Отрисовка линейного графика
  - Real-time обновления (polling)
  - Responsive resize

#### IndicatorsPanel.tsx
- **Props:** symbol, marketType
- **State:** indicators (DIFF для всех глубин)
- **Функционал:**
  - Отображение DIFF индикаторов
  - Цветовая индикация (зеленый/красный)

#### OrderBookTable.tsx
- **Props:** symbol, marketType
- **State:** orderBook, wsStatus
- **Функционал:**
  - Отображение топ 20 BID/ASK
  - Цветовая схема (зеленый/красный)
  - Real-time обновления

---

### 6.2.6 Configuration (`src/backend/config/`)

```
src/backend/config/
├── binance.config.ts              # Binance API конфигурация
└── websocket.config.ts            # WebSocket конфигурация (если есть)
```

**binance.config.ts:**
```typescript
export const BINANCE_WS_URLS = {
  SPOT: 'wss://stream.binance.com:9443/ws',
  FUTURES: 'wss://fstream.binance.com/ws'
};

export const BINANCE_REST_URLS = {
  SPOT: 'https://api.binance.com/api/v3',
  FUTURES: 'https://fapi.binance.com/fapi/v1'
};

export const UPDATE_SPEED = {
  FAST: '100ms',
  SLOW: '1000ms'
};

export const RECONNECT_CONFIG = {
  maxAttempts: 5,
  delay: 1000,
  maxDelay: 30000,
  factor: 2
};
```

---

### 6.2.7 Shared Types (`src/shared/types/`)

```
src/shared/types/
├── common.types.ts                # Общие типы
└── api.types.ts                   # API типы
```

**common.types.ts:**
```typescript
export type MarketType = 'SPOT' | 'FUTURES';
export type TradingSymbol = string;
export type PriceString = string;
export type VolumeString = string;
export type Timestamp = number;
```

**api.types.ts:**
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
```

---

### 6.2.8 Database Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum MarketType {
  SPOT
  FUTURES
}

model Snapshot {
  id            String      @id @default(cuid())
  timestamp     DateTime    @db.Timestamptz(3)
  symbol        String      @db.VarChar(20)
  marketType    MarketType
  depth         Float       @db.Real
  bidVolume     Float       @db.Real
  askVolume     Float       @db.Real
  bidVolumeUsd  Float       @db.Real
  askVolumeUsd  Float       @db.Real
  createdAt     DateTime    @default(now())

  @@unique([symbol, marketType, depth, timestamp])
  @@index([timestamp(sort: Desc)])
  @@index([symbol, marketType, depth, timestamp(sort: Desc)])
  @@map("snapshots")
}
```

---

## 6.3 Взаимодействие модулей

### Диаграмма зависимостей

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                     │
│  /api/binance/spot, /api/binance/futures, /api/chart-data  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   OrderBookService       │      │   SnapshotService        │
│   (Business Logic)       │      │   (Business Logic)       │
└──────────┬───────────────┘      └──────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│  WebSocketService        │      │  SnapshotRepository      │
│  (External API)          │      │  (Data Access)           │
└──────────────────────────┘      └──────────┬───────────────┘
                                              │
                                              ▼
                          ┌───────────────────────────────────┐
                          │  Prisma Client / Redis Client    │
                          │  (Database Clients)              │
                          └───────────────────────────────────┘
                                              │
                                              ▼
                          ┌───────────────────────────────────┐
                          │  PostgreSQL + TimescaleDB        │
                          │  Redis                           │
                          └───────────────────────────────────┘
```

---

## 6.4 Модульность и переиспользуемость

### Принципы проектирования

1. **Separation of Concerns**
   - API Routes - только роутинг
   - Services - бизнес-логика
   - Repositories - работа с БД
   - Utilities - переиспользуемые функции

2. **Dependency Injection**
   - Services получают зависимости через конструктор
   - Легко тестировать с mock-объектами

3. **Single Responsibility**
   - Каждый модуль делает одну вещь хорошо
   - WebSocketService - только WebSocket
   - OrderBookService - только Order Book

4. **DRY (Don't Repeat Yourself)**
   - Общие утилиты в `utils/`
   - Общие типы в `shared/types/`
   - Общие константы в `shared/constants/`

---

<a name="user-stories"></a>
# 7. ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ (USER STORIES)

## 7.1 Для трейдера (основной пользователь)

### US-1: Просмотр текущих объемов

**Как** трейдер
**Я хочу** видеть текущие объемы BID/ASK на разных глубинах для BTCUSDT
**Чтобы** оценить ликвидность рынка

**Критерии приемки:**
- Открываю страницу /charts
- Выбираю BTCUSDT, SPOT, глубину 5%
- Вижу график BID объемов в реальном времени
- График обновляется каждые несколько секунд
- Могу переключиться на ASK или Both

### US-2: Сравнение SPOT и FUTURES

**Как** трейдер
**Я хочу** сравнить объемы на SPOT и FUTURES рынках
**Чтобы** найти расхождения и торговые возможности

**Критерии приемки:**
- Вызываю GET /api/binance/depth?symbol=BTCUSDT&depth=5&type=all
- Получаю данные для SPOT и FUTURES
- Вижу разницу в процентах между рынками

### US-3: Анализ исторических данных

**Как** трейдер
**Я хочу** просмотреть исторические данные за последний час
**Чтобы** увидеть тренд изменения объемов

**Критерии приемки:**
- График показывает последний час данных
- Минутная гранулярность (60 точек)
- Могу прокручивать назад во времени

### US-4: DIFF индикаторы

**Как** трейдер
**Я хочу** видеть баланс между покупателями и продавцами
**Чтобы** определить направление рынка

**Критерии приемки:**
- Вижу панель DIFF индикаторов для всех 6 глубин
- Положительный % → зеленый цвет → покупатели
- Отрицательный % → красный цвет → продавцы

---

## 7.2 Для аналитика

### US-5: Экспорт данных

**Как** аналитик
**Я хочу** экспортировать исторические данные в CSV
**Чтобы** провести анализ в Excel/Python

**Критерии приемки:**
- Кнопка "Export CSV" на странице графика
- CSV содержит: timestamp, bidVolume, askVolume
- Скачивание происходит мгновенно

### US-6: API доступ

**Как** алгоритмический трейдер
**Я хочу** получать данные через API для моего бота
**Чтобы** автоматизировать торговые решения

**Критерии приемки:**
- Документированный REST API
- Примеры запросов в документации
- Response time < 100ms

---

## 7.3 Для администратора

### US-7: Мониторинг системы

**Как** администратор
**Я хочу** видеть статус всех компонентов
**Чтобы** быстро выявлять проблемы

**Критерии приемки:**
- GET /api/health показывает статус всех компонентов
- Зеленый/красный индикатор для каждого сервиса
- Время последнего обновления

### US-8: Управление символами

**Как** администратор
**Я хочу** добавлять/удалять отслеживаемые символы
**Чтобы** адаптировать платформу под нужды пользователей

**Критерии приемки:**
- POST /api/collector/symbols с массивом символов
- Символы сразу начинают отслеживаться
- DELETE /api/collector/symbols останавливает отслеживание

---

<a name="roadmap"></a>
# 8. ROADMAP РАЗВИТИЯ

## 8.1 Q1 2025 (Текущий квартал)

### ✅ Фаза 1: MVP (Завершено)
- [x] WebSocket подключение к Binance
- [x] In-memory Order Book
- [x] Расчет объемов на глубинах
- [x] REST API endpoints
- [x] Frontend с графиками
- [x] DIFF индикаторы

### 🔨 Фаза 2: Постоянное хранилище (В работе)
**Сроки:** Ноябрь - Декабрь 2025

**Задачи:**
- [ ] PostgreSQL + TimescaleDB setup
- [ ] Prisma schema и миграции
- [ ] Redis integration
- [ ] SnapshotService с батчингом
- [ ] Compression policies
- [ ] Retention policies
- [ ] Continuous aggregates (1h, 1d)

**Deliverables:**
- Исторические данные за 60+ дней
- Потеря данных = 0%
- Cache hit rate > 80%

---

## 8.2 Q2 2025

### 🚀 Фаза 3: Масштабирование
**Сроки:** Январь - Март 2025

**Задачи:**
- [ ] BinanceRestCollector реализация
- [ ] Поддержка 100+ символов
- [ ] Управление символами через API
- [ ] Оптимизация rate limiting
- [ ] Мониторинг производительности

**Deliverables:**
- 100+ символов одновременно
- REST Collector работает стабильно
- Нет превышения Binance rate limits

---

### 📊 Фаза 4: Расширенная аналитика
**Сроки:** Апрель - Июнь 2025

**Задачи:**
- [ ] Агрегированные индикаторы (TOTAL, TOTAL1, TOTAL2)
- [ ] Корреляционный анализ между символами
- [ ] Heatmap визуализация
- [ ] Сравнительные графики
- [ ] Экспорт в CSV/JSON

**Deliverables:**
- TOTAL индикаторы на отдельной странице
- Корреляционная матрица
- Экспорт данных

---

## 8.3 Q3 2025

### 🔒 Фаза 5: Production Ready
**Сроки:** Июль - Сентябрь 2025

**Задачи:**
- [ ] Authentication & Authorization
- [ ] API Keys управление
- [ ] Rate limiting per user
- [ ] CORS configuration
- [ ] HTTPS setup
- [ ] Бэкапы и disaster recovery
- [ ] Мониторинг (Grafana + Prometheus)
- [ ] Алертинг (AlertManager)

**Deliverables:**
- Production-ready deployment
- Uptime > 99.9%
- Comprehensive monitoring

---

## 8.4 Q4 2025 и далее

### 🤖 Фаза 6: Machine Learning
**Сроки:** Октябрь 2025 - Декабрь 2025

**Задачи:**
- [ ] ML модели для предсказания движения цены
- [ ] Обучение на исторических данных
- [ ] Real-time inference
- [ ] A/B тестирование моделей

**Deliverables:**
- ML индикатор на графике
- Точность предсказаний > 60%

---

### 🌐 Фаза 7: Multi-Exchange
**Сроки:** 2026

**Задачи:**
- [ ] Поддержка других бирж (Bybit, OKX, etc.)
- [ ] Унифицированный API
- [ ] Арбитражные возможности
- [ ] Cross-exchange анализ

---

### 📱 Фаза 8: Mobile App
**Сроки:** 2026

**Задачи:**
- [ ] React Native приложение
- [ ] Push уведомления
- [ ] Оффлайн режим
- [ ] Watchlists

---

## 8.5 Приоритизация фич

### Must Have (P0)
- ✅ WebSocket подключение
- ✅ Order Book management
- ✅ Depth calculations
- ✅ REST API
- ✅ Графики
- 🔨 PostgreSQL + TimescaleDB
- 🔨 Redis caching

### Should Have (P1)
- 🚀 REST Collector (100+ символов)
- 🚀 Агрегированные индикаторы
- 🔒 Authentication

### Could Have (P2)
- 🤖 ML модели
- 📊 Корреляционный анализ
- 🌐 Multi-exchange

### Won't Have Now (P3)
- 📱 Mobile app (далекое будущее)
- Desktop app

---

## 8.6 Метрики успеха по фазам

| Фаза | KPI | Target |
|------|-----|--------|
| Фаза 1 (MVP) | WebSocket uptime | > 95% ✅ |
| Фаза 2 (DB) | Data loss | 0% |
| Фаза 2 (DB) | Storage efficiency | 90% compression |
| Фаза 3 (Scale) | Symbols supported | 100+ |
| Фаза 4 (Analytics) | TOTAL indicators accuracy | High correlation |
| Фаза 5 (Prod) | System uptime | 99.9% |
| Фаза 6 (ML) | Prediction accuracy | > 60% |

---

<a name="executive-summary"></a>
# 9. КРАТКАЯ СВОДКА (Executive Summary)

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
