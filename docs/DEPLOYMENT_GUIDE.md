# 🚀 Deployment Guide - Trading Platform

**Инструкция по деплою на production сервер**

---

## 📋 Требования к серверу

### Минимальные требования:
- **OS:** Ubuntu 22.04 LTS / Debian 11+ (рекомендуется)
- **RAM:** 4 GB (рекомендуется 8 GB)
- **CPU:** 2 cores (рекомендуется 4 cores)
- **Disk:** 50 GB SSD (для БД на 1 год = ~10-20 GB)
- **Network:** Стабильное подключение к интернету

### Необходимое ПО:
- Docker 24+
- Docker Compose 2.0+
- Git
- (Опционально) Nginx для SSL

---

## 🔧 Вариант 1: Простой деплой (Docker Compose)

### Шаг 1: Подготовка сервера

```bash
# Подключение к серверу
ssh user@your-server-ip

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Установка Git
sudo apt install git -y

# Выход и повторный вход для применения прав Docker
exit
ssh user@your-server-ip
```

### Шаг 2: Клонирование проекта

```bash
# Создать директорию для проекта
mkdir -p ~/apps
cd ~/apps

# Клонировать репозиторий
git clone <your-repo-url> trading-platform
cd trading-platform
```

### Шаг 3: Настройка переменных окружения

```bash
# Создать .env файл для production
nano .env
```

**Содержимое `.env` (production):**
```bash
# Application
NODE_ENV=production
API_BASE_URL=https://your-domain.com

# Binance API
BINANCE_SPOT_WS_URL=wss://stream.binance.com:9443/ws
BINANCE_FUTURES_WS_URL=wss://fstream.binance.com/ws

# Database (PostgreSQL + TimescaleDB)
POSTGRES_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ
DATABASE_URL=postgresql://postgres:ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ@db:5432/tradingdb

# Redis
REDIS_URL=redis://redis:6379

# CORS (укажите ваш домен)
ALLOWED_ORIGINS=https://your-domain.com

# Server
PORT=3000
```

**⚠️ ВАЖНО:** Замените `ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ` на реальный пароль!

### Шаг 4: Обновление docker-compose.yml для production

Создайте `docker-compose.prod.yml`:

```bash
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  # Next.js приложение
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: trading-platform-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_BASE_URL=${API_BASE_URL}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - BINANCE_SPOT_WS_URL=${BINANCE_SPOT_WS_URL}
      - BINANCE_FUTURES_WS_URL=${BINANCE_FUTURES_WS_URL}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - PORT=${PORT}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - trading-network
    volumes:
      - ./logs:/app/logs

  # PostgreSQL + TimescaleDB database
  db:
    image: timescale/timescaledb:latest-pg16
    container_name: trading-platform-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: tradingdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-timescaledb.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./backups:/backups
    # Для удаленного доступа к БД (опционально, для отладки)
    # ports:
    #   - "127.0.0.1:5432:5432"
    networks:
      - trading-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: trading-platform-redis
    restart: always
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - trading-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx reverse proxy (для SSL)
  nginx:
    image: nginx:alpine
    container_name: trading-platform-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    networks:
      - trading-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  trading-network:
    driver: bridge
```

### Шаг 5: Настройка Nginx (с SSL)

```bash
nano nginx.prod.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL certificates (Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        # Proxy to Next.js app
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /ws {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
```

### Шаг 6: Получение SSL сертификата (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата (временно остановите Nginx если запущен)
sudo certbot certonly --standalone -d your-domain.com

# Автообновление сертификата
sudo systemctl enable certbot.timer
```

### Шаг 7: Сборка и запуск

```bash
# Создать директории для логов и бэкапов
mkdir -p logs backups

# Собрать и запустить все сервисы
docker-compose -f docker-compose.prod.yml up -d --build

# Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

### Шаг 8: Инициализация базы данных

```bash
# Подождать пока БД запустится (30 секунд)
sleep 30

# Выполнить Prisma миграцию
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Настроить TimescaleDB
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d tradingdb -f /docker-entrypoint-initdb.d/init.sql

# Генерация Prisma клиента (если нужно)
docker-compose -f docker-compose.prod.yml exec app npx prisma generate
```

### Шаг 9: Запуск коллектора данных

```bash
# Запустить коллектор
curl -X POST http://localhost:3000/api/collector

# Или через внешний домен
curl -X POST https://your-domain.com/api/collector
```

### Шаг 10: Проверка работы

```bash
# Проверить логи приложения
docker-compose -f docker-compose.prod.yml logs -f app

# Проверить статус коллектора
curl https://your-domain.com/api/collector

# Проверить данные в БД
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d tradingdb -c "SELECT COUNT(*) FROM snapshots;"
```

---

## 🔧 Вариант 2: Деплой без Docker (на сервере напрямую)

### Шаг 1: Установка зависимостей

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL + TimescaleDB
sudo apt install postgresql-15 postgresql-contrib -y
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update
sudo apt install timescaledb-2-postgresql-15 -y
sudo timescaledb-tune --quiet --yes

# Redis
sudo apt install redis-server -y

# PM2 (для управления Node.js процессом)
sudo npm install -g pm2
```

### Шаг 2: Настройка PostgreSQL

```bash
# Создать пользователя и БД
sudo -u postgres psql

# В psql:
CREATE DATABASE tradingdb;
CREATE USER trading WITH ENCRYPTED PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE tradingdb TO trading;
\q

# Настроить TimescaleDB
sudo -u postgres psql -d tradingdb -f ~/apps/trading-platform/scripts/init-timescaledb.sql
```

### Шаг 3: Запуск приложения

```bash
cd ~/apps/trading-platform

# Установить зависимости
npm install

# Prisma миграция
npx prisma migrate deploy
npx prisma generate

# Сборка для production
npm run build

# Запуск с PM2
pm2 start npm --name "trading-platform" -- start
pm2 save
pm2 startup
```

### Шаг 4: Автозапуск коллектора

Создать systemd service для автозапуска:

```bash
sudo nano /etc/systemd/system/trading-collector.service
```

```ini
[Unit]
Description=Trading Platform Data Collector
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST http://localhost:3000/api/collector
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
# Создать timer для автозапуска при перезагрузке
sudo nano /etc/systemd/system/trading-collector.timer
```

```ini
[Unit]
Description=Start Trading Collector on boot

[Timer]
OnBootSec=2min

[Install]
WantedBy=timers.target
```

```bash
# Включить timer
sudo systemctl enable trading-collector.timer
sudo systemctl start trading-collector.timer
```

---

## 📊 Мониторинг и обслуживание

### Логи

```bash
# Docker вариант
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f db

# PM2 вариант
pm2 logs trading-platform
```

### Бэкапы БД

```bash
# Создать скрипт бэкапа
nano ~/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="tradingdb_backup_$DATE.sql.gz"

# Docker вариант
docker-compose -f ~/apps/trading-platform/docker-compose.prod.yml exec -T db \
  pg_dump -U postgres tradingdb | gzip > "$BACKUP_DIR/$FILENAME"

# Удалить бэкапы старше 7 дней
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME"
```

```bash
# Сделать исполняемым
chmod +x ~/backup-db.sh

# Добавить в crontab (бэкап каждый день в 3:00)
crontab -e

# Добавить строку:
0 3 * * * /home/user/backup-db.sh >> /home/user/backup.log 2>&1
```

### Обновление приложения

```bash
cd ~/apps/trading-platform

# Остановить коллектор
curl -X DELETE http://localhost:3000/api/collector

# Получить последние изменения
git pull

# Docker вариант
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Или PM2 вариант
npm install
npm run build
pm2 restart trading-platform

# Запустить коллектор
sleep 30
curl -X POST http://localhost:3000/api/collector
```

---

## 🔒 Безопасность

### 1. Firewall (UFW)

```bash
# Установить UFW
sudo apt install ufw -y

# Разрешить SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw enable
sudo ufw status
```

### 2. Fail2Ban (защита от брутфорса)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Регулярные обновления

```bash
# Автообновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📈 Оптимизация производительности

### PostgreSQL (для production)

```bash
# Редактировать postgresql.conf
# Docker: это делается через переменные окружения
# Без Docker:
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Рекомендуемые настройки:
```ini
shared_buffers = 2GB                    # 25% от RAM
effective_cache_size = 6GB              # 75% от RAM
maintenance_work_mem = 512MB
work_mem = 16MB
max_connections = 100
```

### Redis

```bash
# В docker-compose уже настроено:
# maxmemory 512mb
# maxmemory-policy allkeys-lru
```

---

## ⚡ Быстрый чеклист деплоя

**Минимальная установка (5 минут):**

```bash
# 1. На сервере
git clone <repo> && cd <repo>

# 2. Создать .env
cp .env.example .env
nano .env  # Установить пароли и домен

# 3. Запустить
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Дождаться запуска (30 сек)
sleep 30

# 5. Инициализация БД
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# 6. Запустить коллектор
curl -X POST http://localhost:3000/api/collector

# 7. Готово!
docker-compose -f docker-compose.prod.yml ps
```

---

## 🆘 Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs app

# Проверить переменные окружения
docker-compose -f docker-compose.prod.yml exec app env | grep DATABASE
```

### Проблема: БД не доступна

```bash
# Проверить статус
docker-compose -f docker-compose.prod.yml ps db

# Проверить подключение
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d tradingdb -c "SELECT 1"
```

### Проблема: Коллектор не собирает данные

```bash
# Проверить статус
curl http://localhost:3000/api/collector

# Перезапустить
curl -X DELETE http://localhost:3000/api/collector
curl -X POST http://localhost:3000/api/collector

# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f app | grep Collector
```

---

## 💰 Стоимость хостинга

### VPS провайдеры (рекомендации):

**1. Бюджетный вариант (~$10-20/мес):**
- Hetzner Cloud CX21 (2 vCPU, 4GB RAM) - €4.90/мес
- DigitalOcean Droplet (2 vCPU, 4GB RAM) - $24/мес
- Vultr (2 vCPU, 4GB RAM) - $18/мес

**2. Средний вариант (~$40-60/мес):**
- DigitalOcean (4 vCPU, 8GB RAM) - $48/мес
- AWS Lightsail (2 vCPU, 8GB RAM) - $40/мес

**3. Managed Database (если не хотите управлять БД):**
- DigitalOcean Managed PostgreSQL - от $15/мес
- AWS RDS - от $20/мес

---

## ✅ Итого

**Простой вариант (Docker Compose):**
- ✅ Всё в одном месте
- ✅ Легко обновлять
- ✅ Автоматические перезапуски
- ✅ Изолированная среда

**Что нужно:**
1. VPS с Docker
2. Домен (для SSL)
3. 15 минут на настройку

**Готово!** 🎉

---

**Вопросы?**
- Смотрите `IMPLEMENTATION_COMPLETE.md` для деталей
- Смотрите `docs/DOCUMENTATION.md` для архитектуры
