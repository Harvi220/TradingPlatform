# ⚡ Quick Commands Reference

Быстрая справка по командам для Trading Platform

---

## 🚀 Локальная разработка

```bash
# Запуск всего
npm install
docker-compose up -d db redis
npx prisma migrate dev
npx prisma generate
npm run dev

# Запуск коллектора
curl -X POST http://localhost:3000/api/collector
```

---

## 🔧 Production (Docker)

```bash
# Запуск
docker-compose -f docker-compose.prod.yml up -d --build

# Остановка
docker-compose -f docker-compose.prod.yml down

# Логи
docker-compose -f docker-compose.prod.yml logs -f app

# Перезапуск одного сервиса
docker-compose -f docker-compose.prod.yml restart app

# Обновление после git pull
docker-compose -f docker-compose.prod.yml up -d --build --no-deps app
```

---

## 📊 База данных

```bash
# Подключиться к БД
docker-compose exec db psql -U postgres -d tradingdb

# Бэкап
docker-compose exec -T db pg_dump -U postgres tradingdb > backup.sql

# Восстановление
cat backup.sql | docker-compose exec -T db psql -U postgres -d tradingdb

# Статистика TimescaleDB
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT * FROM get_snapshot_stats();"

# Проверить количество записей
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT COUNT(*) FROM snapshots;"
```

---

## 🔍 Мониторинг

```bash
# Статус коллектора
curl http://localhost:3000/api/collector

# Получить данные
curl "http://localhost:3000/api/snapshots?symbol=BTCUSDT&depth=5&type=bid"

# Проверить Redis
docker-compose exec redis redis-cli PING
docker-compose exec redis redis-cli INFO stats

# Использование диска
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT pg_size_pretty(pg_database_size('tradingdb'));"
```

---

## 🎛️ Управление коллектором

```bash
# Запустить
curl -X POST http://localhost:3000/api/collector

# Остановить
curl -X DELETE http://localhost:3000/api/collector

# Добавить символы
curl -X POST http://localhost:3000/api/collector/symbols \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["DOGEUSDT", "XRPUSDT"]}'

# Удалить символы
curl -X DELETE http://localhost:3000/api/collector/symbols \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["DOGEUSDT"]}'
```

---

## 🧹 Очистка

```bash
# Удалить все volumes (ОПАСНО - удалит все данные!)
docker-compose down -v

# Очистить логи Docker
docker system prune -a

# Очистить старые snapshots (в psql)
DELETE FROM snapshots WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## 🔄 Обновление

```bash
# Локальная разработка
git pull
npm install
npx prisma migrate dev
npm run dev

# Production
git pull
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

---

## 📝 Prisma

```bash
# Создать миграцию
npx prisma migrate dev --name название_миграции

# Применить миграции (production)
npx prisma migrate deploy

# Генерация клиента
npx prisma generate

# Prisma Studio (GUI для БД)
npx prisma studio

# Сбросить БД (ОПАСНО!)
npx prisma migrate reset
```

---

## 🐛 Debug

```bash
# Логи приложения (последние 100 строк)
docker-compose logs --tail=100 app

# Логи в реальном времени
docker-compose logs -f app

# Войти в контейнер
docker-compose exec app sh

# Проверить переменные окружения
docker-compose exec app env

# Проверить сеть
docker network inspect trading-platform_trading-network
```

---

## 💾 SQL запросы (полезные)

```sql
-- Количество snapshots по символам
SELECT symbol, marketType, COUNT(*)
FROM snapshots
GROUP BY symbol, marketType
ORDER BY COUNT(*) DESC;

-- Последние 10 snapshots
SELECT * FROM snapshots
ORDER BY timestamp DESC
LIMIT 10;

-- Статистика по compression
SELECT * FROM get_compression_stats();

-- Покрытие данных
SELECT * FROM get_data_coverage();

-- Размер таблиц
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Количество chunks TimescaleDB
SELECT hypertable_name, num_chunks
FROM timescaledb_information.hypertables;
```

---

## 🔐 Безопасность

```bash
# Сменить пароль PostgreSQL
docker-compose exec db psql -U postgres -c "ALTER USER postgres PASSWORD 'новый_пароль';"

# Проверить открытые порты
sudo netstat -tulpn | grep LISTEN

# Статус Firewall
sudo ufw status
```

---

## 📦 Бэкап и восстановление

```bash
# Полный бэкап (БД + Redis + конфиг)
mkdir -p backups/$(date +%Y%m%d)
docker-compose exec -T db pg_dump -U postgres tradingdb | gzip > backups/$(date +%Y%m%d)/db.sql.gz
docker-compose exec -T redis redis-cli SAVE
docker cp trading-platform-redis:/data/dump.rdb backups/$(date +%Y%m%d)/redis.rdb
cp .env backups/$(date +%Y%m%d)/env.backup

# Восстановление
gunzip < backups/20250117/db.sql.gz | docker-compose exec -T db psql -U postgres -d tradingdb
docker cp backups/20250117/redis.rdb trading-platform-redis:/data/dump.rdb
docker-compose restart redis
```

---

## 🎯 Одной командой

```bash
# Полный рестарт с очисткой
docker-compose down && docker-compose up -d && sleep 30 && curl -X POST http://localhost:3000/api/collector

# Проверить что всё работает
docker-compose ps && curl http://localhost:3000/api/collector && docker-compose exec db psql -U postgres -d tradingdb -c "SELECT COUNT(*) FROM snapshots;"

# Бэкап прямо сейчас
docker-compose exec -T db pg_dump -U postgres tradingdb | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz && echo "Backup created"
```

---

## 📞 Health Checks

```bash
# Проверить все сервисы
docker-compose ps

# Проверить приложение
curl http://localhost:3000/api/health

# Проверить БД
docker-compose exec db pg_isready -U postgres

# Проверить Redis
docker-compose exec redis redis-cli PING

# Всё сразу
echo "App:" && curl -s http://localhost:3000/api/health && \
echo "\nDB:" && docker-compose exec db pg_isready -U postgres && \
echo "Redis:" && docker-compose exec redis redis-cli PING
```

---

## 🚨 Emergency

```bash
# Остановить всё немедленно
docker-compose down

# Удалить всё и начать заново (ОПАСНО!)
docker-compose down -v
rm -rf node_modules prisma/migrations
npm install
npx prisma migrate dev
npm run dev

# Остановить только коллектор
curl -X DELETE http://localhost:3000/api/collector

# Экстренный бэкап
docker-compose exec -T db pg_dump -U postgres tradingdb > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

**Сохраните этот файл для быстрого доступа к командам!**
