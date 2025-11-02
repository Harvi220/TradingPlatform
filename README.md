# Trading Platform - Binance Order Book Analyzer

Платформа для мониторинга и анализа стакана ордеров Binance в реальном времени с расчетом объемов на разных глубинах и DIFF индикаторов.

## Возможности

- Мониторинг SPOT и FUTURES рынков Binance в реальном времени
- Расчет объемов на глубинах: 1.5%, 3%, 5%, 8%, 15%, 30%
- Индикатор DIFF (разница между bid и ask) для каждой глубины
- Визуализация данных в таблицах
- Обновление данных каждую секунду через WebSocket API
- REST API для получения данных

## Технологии

- **Next.js 16** - React framework
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация
- **WebSocket (ws)** - подключение к Binance
- **Binance API** - источник данных

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Приложение доступно на http://localhost:3000
```

## Структура

```
src/
├── backend/      # Backend логика (WebSocket, расчеты)
├── frontend/     # Frontend (UI, компоненты)
└── shared/       # Общие типы и константы
```

## API Endpoints

- `GET /api/binance/spot?symbol=BTCUSDT` - SPOT данные
- `GET /api/binance/futures?symbol=BTCUSDT` - FUTURES данные
- `GET /api/binance/depth?depth=5&type=all` - объемы на глубине
- `GET /api/health` - health check

## Страницы

- `/` - главная страница
- `/dashboard` - дашборд с таблицами данных

## Документация

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - полное описание проекта
- [GETTING_STARTED.md](GETTING_STARTED.md) - инструкции по запуску

## Статус

Version: 0.1.0 (MVP)
Status: Ready for testing

## Автор

Trading Platform Development Team
