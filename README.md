# Trading Platform - Binance Order Book Analyzer

Платформа для мониторинга и анализа стакана ордеров Binance в реальном времени с расчетом объемов на разных глубинах, DIFF индикаторов и **хранением исторических данных**.

## ✨ Возможности

- 📊 Мониторинг SPOT и FUTURES рынков Binance в реальном времени
- 📈 Расчет объемов на глубинах: 1.5%, 3%, 5%, 8%, 15%, 30%
- 🔄 Индикатор DIFF (разница между bid и ask) для каждой глубины
- 📉 Визуализация данных с помощью TradingView Lightweight Charts
- 💾 **Постоянное хранение данных в PostgreSQL + TimescaleDB**
- ⚡ **Redis кэширование для быстрого доступа**
- 🔄 **REST API для сбора данных (без ограничений WebSocket)**
- 🕐 **Исторические данные за неограниченный период**

## 🛠️ Технологии

### Frontend
- **Next.js 16** - React framework (App Router)
- **TypeScript** - строгая типизация
- **Tailwind CSS** - стилизация
- **TradingView Lightweight Charts** - графики

### Backend
- **Next.js API Routes** - REST API
- **Prisma ORM** - type-safe database access
- **PostgreSQL 16 + TimescaleDB** - time-series данные
- **Redis 7** - кэширование
- **Binance REST API** - источник данных

## 🚀 Быстрый старт (Локальная разработка)

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск PostgreSQL + TimescaleDB + Redis
docker-compose up -d db redis

# 3. Настройка базы данных
npx prisma migrate dev --name init_snapshots
npx prisma generate

# 4. Запуск приложения
npm run dev

# 5. Запуск сбора данных
curl -X POST http://localhost:3000/api/collector

# Приложение доступно на http://localhost:3000
```

**Для деплоя на сервер:** см. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 📁 Структура проекта

```
TradingPlatform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   └── api/                      # API Routes
│   │       ├── collector/            # Управление сбором данных
│   │       └── snapshots/            # Получение исторических данных
│   ├── backend/                      # Backend слой
│   │   ├── database/                 # Prisma & Redis clients
│   │   ├── repositories/             # Data access layer
│   │   └── services/                 # Business logic
│   ├── components/                   # React компоненты
│   └── frontend/                     # Frontend логика
├── prisma/                           # Prisma schema и миграции
├── scripts/                          # Utility scripts
├── docs/                             # Документация
└── docker-compose.yml                # Docker конфигурация
```

## 🔌 API Endpoints

### Сбор данных
- `POST /api/collector` - запустить сбор данных
- `DELETE /api/collector` - остановить сбор
- `GET /api/collector` - получить статистику

### Управление символами
- `POST /api/collector/symbols` - добавить символы
- `DELETE /api/collector/symbols` - удалить символы

### Получение данных
- `GET /api/snapshots?symbol=BTCUSDT&depth=5&type=bid` - BID данные
- `GET /api/snapshots?symbol=BTCUSDT&depth=5&type=ask` - ASK данные
- `GET /api/snapshots?symbol=BTCUSDT&depth=5&from=...&to=...` - исторические данные

### Legacy endpoints (работают)
- `GET /api/binance/spot?symbol=BTCUSDT` - SPOT данные
- `GET /api/binance/futures?symbol=BTCUSDT` - FUTURES данные
- `GET /api/health` - health check

## 📄 Страницы

- `/` - главная страница
- `/dashboard` - дашборд с таблицами и графиками

## 📚 Документация

### Основная документация
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - ✅ ЧТО СДЕЛАНО И КАК ЗАПУСТИТЬ
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 🚀 ДЕПЛОЙ НА СЕРВЕР
- **[QUICK_COMMANDS.md](QUICK_COMMANDS.md)** - ⚡ БЫСТРЫЕ КОМАНДЫ

### Детальная документация
- [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) - Полная документация (~200 страниц)
- [docs/README.md](docs/README.md) - Навигация по документации

### Legacy (если есть)
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - описание проекта
- [GETTING_STARTED.md](GETTING_STARTED.md) - инструкции по запуску

## 📊 Архитектура базы данных

### Таблицы
- `snapshots` - снапшоты объемов (TimescaleDB hypertable)
  - 1 запись в минуту для каждой пары (symbol, marketType, depth)
  - Автоматический compression после 14 дней (90% экономии)
  - Retention policy: 60 дней

- `snapshots_agg_1h` - агрегаты по часам (continuous aggregate)
- `snapshots_agg_1d` - агрегаты по дням (continuous aggregate)
- `websocket_events` - логи WebSocket событий
- `system_metrics` - метрики системы

### Производительность
- **Запись:** < 100ms (батчинг по 50 снапшотов)
- **Чтение (cache):** < 50ms
- **Чтение (БД):** < 300ms
- **Размер (10 символов, 1 год):** ~600 MB

## ⚙️ Конфигурация

### Переменные окружения (.env)

```env
# Application
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradingdb
POSTGRES_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# Binance API
BINANCE_SPOT_WS_URL=wss://stream.binance.com:9443/ws
BINANCE_FUTURES_WS_URL=wss://fstream.binance.com/ws

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

## 🎯 Ключевые особенности реализации

### 1. REST API вместо WebSocket
- Binance ограничивает **5 WebSocket соединений** на IP
- REST API позволяет собирать данные для **100+ символов**
- Rate limiting: 300ms между запросами

### 2. Батчинг записей
- Буферизация до 50 снапшотов
- Flush каждые 60 секунд
- Снижение нагрузки на БД

### 3. 2-х уровневое кэширование
- **Redis** - hot data (последние 2 часа)
- **PostgreSQL** - все данные
- Автоматическая инвалидация

### 4. TimescaleDB фичи
- Hypertables для автопартиционирования
- Continuous aggregates (1h, 1d)
- Compression (90% экономии)
- Retention policies

## 🔍 Быстрые команды

```bash
# Проверить статус
docker-compose ps
curl http://localhost:3000/api/collector

# Посмотреть данные в БД
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT COUNT(*) FROM snapshots;"

# Бэкап БД
docker-compose exec -T db pg_dump -U postgres tradingdb > backup.sql

# Логи
docker-compose logs -f app
```

**Больше команд:** см. [QUICK_COMMANDS.md](QUICK_COMMANDS.md)

## 📈 Статус проекта

**Version:** 1.1.0
**Status:** ✅ **Production Ready**
**Last Update:** 2025-11-17

### Что работает:
- ✅ Сбор данных через REST API
- ✅ Хранение в PostgreSQL + TimescaleDB
- ✅ Redis кэширование
- ✅ API endpoints для получения данных
- ✅ Батчинг и оптимизация
- ✅ Docker конфигурация
- ✅ Автоматические миграции

### TODO (опционально):
- [ ] Grafana дашборд для мониторинга
- [ ] Alerts при ошибках сбора
- [ ] Websocket для real-time обновлений графиков
- [ ] Админ панель для управления

## 👥 Авторы

Trading Platform Development Team

## 📄 Лицензия

Private
