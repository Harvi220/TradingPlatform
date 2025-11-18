# ИНСТРУКЦИЯ ПО СРОЧНОМУ РАЗВЕРТЫВАНИЮ

## ⚠️ ВАЖНО: КРИТИЧЕСКИЕ РИСКИ

Это **минимальная конфигурация** для срочного развертывания. Проект имеет **54 критические проблемы** (см. `PRODUCTION_READINESS_REPORT.md`).

### Основные риски:

- ❌ **Нет защиты API** - любой может удалить данные через DELETE
- ❌ **Потеря данных** - используется in-memory хранилище (теряется при рестарте)
- ❌ **Memory leak** - setInterval в module scope
- ❌ **Нет тестов** - качество не гарантировано
- ⚠️ **Базовая CORS защита** - работает только в браузерах
- ⚠️ **Rate limiting через nginx** - можно обойти

**Рекомендуется использовать только для demo/testing!**

---

## 🚀 БЫСТРЫЙ СТАРТ

### Требования

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ свободной RAM
- Открытые порты: 80, 443, 3000, 5432, 6379

### Шаг 1: Подготовка сервера

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### Шаг 2: Клонирование проекта

```bash
# Клонировать репозиторий
cd /opt
git clone <your-repo-url> trading-platform
cd trading-platform/TradingPlatform
```

### Шаг 3: Настройка environment variables

```bash
# Скопировать шаблон
cp .env.example .env.production

# Отредактировать .env.production
nano .env.production
```

**Обязательно изменить:**

```env
# Замените на ваш домен
API_BASE_URL=https://your-domain.com

# Замените на ваш домен (можно несколько через запятую)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Используйте сильный пароль для PostgreSQL
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD_HERE@db:5432/tradingdb
```

### Шаг 4: Запуск приложения

```bash
# Build и запуск всех сервисов
docker-compose up -d --build

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f app
```

### Шаг 5: Инициализация базы данных

**ВАЖНО:** После первого запуска необходимо создать таблицы в PostgreSQL:

```bash
# Подождать пока база данных полностью запустится (5-10 секунд)
sleep 10

# Применить Prisma схему к базе данных
docker-compose exec -T app npx prisma db push

# Должно вывести:
# 🚀  Your database is now in sync with your Prisma schema. Done in XXXms
```

### Шаг 6: Проверка работоспособности

```bash
# Проверить что приложение запустилось
curl http://localhost:3000

# Проверить API health
curl http://localhost:3000/api/health

# Проверить API
curl http://localhost:3000/api/binance/spot?symbol=BTCUSDT

# Проверить PostgreSQL
docker-compose exec db psql -U postgres -d tradingdb -c "SELECT version();"

# Проверить Redis
docker-compose exec redis redis-cli ping

# Проверить что таблицы созданы
docker-compose exec db psql -U postgres -d tradingdb -c "\dt"
```

---

## 🌐 НАСТРОЙКА ДОМЕНА С REG.RU (Production)

### ШАГ A: Настройка DNS на REG.RU

**ВАЖНО:** Выполняйте эти шаги, если домен куплен на **reg.ru**

#### 1. Войти в панель управления reg.ru

1. Откройте https://www.reg.ru/
2. Нажмите **"Войти"** (справа сверху)
3. Введите логин и пароль
4. Перейдите в **"Домены"** → **"Мои домены"**
5. Кликните на ваш домен

#### 2. Настроить DNS записи

1. В карточке домена найдите раздел **"Управление DNS"**, **"DNS-серверы и зона"** или **"Ресурсные записи"**
2. Нажмите **"Добавить запись"** или **"Изменить"**

**Создать A-записи:**

**Для основного домена:**

```
Тип записи: A
Имя поддомена: @ (или пустое поле)
IP-адрес (IPv4): IP_ВАШЕГО_СЕРВЕРА
TTL: 3600 (или "1 час")
```

**Для WWW (опционально, но рекомендуется):**

```
Тип записи: A
Имя поддомена: www
IP-адрес (IPv4): IP_ВАШЕГО_СЕРВЕРА
TTL: 3600
```

3. Нажмите **"Добавить"** или **"Сохранить изменения"**

#### 3. Проверить распространение DNS

**Время ожидания:**

- Минимум: 5-10 минут
- Обычно: 30-60 минут
- Максимум: до 24 часов (редко)

```bash
# Проверить DNS (замените example.com на ваш домен!)
nslookup example.com

# Должно показать:
# Name:    example.com
# Address: ВАШ_IP_СЕРВЕРА

# Детальная проверка
dig example.com

# Проверка с разных DNS серверов
nslookup example.com 8.8.8.8  # Google DNS
nslookup example.com 1.1.1.1  # Cloudflare DNS
```

**Если DNS не резолвится:**

- Подождите 30-60 минут
- Проверьте что IP адрес введен правильно
- Проверьте что используются DNS-серверы reg.ru (обычно ns1.reg.ru, ns2.reg.ru)

---

### ШАГ B: Получить SSL сертификат (Let's Encrypt)

**ВАЖНО:** DNS должен быть уже настроен и резолвиться на ваш сервер!

```bash
# На сервере
cd /opt/trading-platform/TradingPlatform

# Установить Certbot
sudo apt update
sudo apt install -y certbot

# Остановить nginx (если запущен)
sudo docker-compose stop nginx

# Получить SSL сертификат (замените example.com на ваш домен!)
sudo certbot certonly --standalone \
  -d example.com \
  -d www.example.com

# Certbot задаст вопросы:
# 1. Email address (для уведомлений): ваш_email@gmail.com
# 2. Agree to terms of service: A (да)
# 3. Share email with EFF: N (нет) или Y (да)

# При успехе увидите:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/example.com/fullchain.pem
# Key is saved at:         /etc/letsencrypt/live/example.com/privkey.pem
```

**Если Certbot не может получить сертификат:**

```bash
# Проверьте что DNS резолвится
nslookup example.com

# Проверьте что порт 80 открыт
sudo ufw status
sudo ufw allow 80/tcp

# Попробуйте снова
sudo certbot certonly --standalone -d example.com -d www.example.com
```

#### Скопировать SSL сертификаты в проект

```bash
cd /opt/trading-platform/TradingPlatform

# Создать директорию для SSL
mkdir -p ssl

# Скопировать сертификаты (замените example.com на ваш домен!)
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/example.com/privkey.pem ssl/key.pem

# Установить права доступа
sudo chmod 644 ssl/cert.pem
sudo chmod 600 ssl/key.pem
sudo chown -R $USER:$USER ssl/

# Проверить что файлы скопированы
ls -lh ssl/
```

---

### ШАГ C: Настроить nginx для HTTPS

```bash
cd /opt/trading-platform/TradingPlatform

# Отредактировать nginx.conf
nano nginx.conf
```

**Заменить ВСЁ содержимое на (замените example.com на ваш домен!):**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name example.com www.example.com;

        # Перенаправить все HTTP запросы на HTTPS
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name example.com www.example.com;

        # SSL сертификаты
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL настройки
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Proxy для Next.js приложения
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API endpoints с rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Сохранить:** `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Перезапустить nginx
docker-compose restart nginx

# Проверить логи nginx
docker-compose logs -f nginx

# Должны увидеть что nginx запустился без ошибок
```

---

### ШАГ D: Проверка HTTPS

#### В браузере:

1. Откройте `https://example.com` (замените на ваш домен)
2. Должен быть **зеленый замочек** 🔒
3. Сертификат от **Let's Encrypt**
4. Приложение должно открыться

#### Через командную строку:

```bash
# Проверить HTTP -> HTTPS редирект
curl -I http://example.com
# Должен вернуть:
# HTTP/1.1 301 Moved Permanently
# Location: https://example.com/

# Проверить HTTPS работает
curl https://example.com
# Должен вернуть HTML страницу

# Проверить API
curl https://example.com/api/binance/spot?symbol=BTCUSDT
# Должен вернуть JSON с данными order book

# Проверить SSL сертификат
openssl s_client -connect example.com:443 -servername example.com | grep "Verify return code"
# Должен вернуть: Verify return code: 0 (ok)
```

---

### ШАГ E: Автообновление SSL сертификата

SSL сертификаты Let's Encrypt действуют **90 дней**. Настроить автообновление:

```bash
# Создать скрипт обновления
sudo nano /opt/renew-ssl.sh
```

**Вставить (замените example.com на ваш домен!):**

```bash
#!/bin/bash

# Обновить сертификат
certbot renew --quiet

# Скопировать в проект
cp /etc/letsencrypt/live/example.com/fullchain.pem /opt/trading-platform/TradingPlatform/ssl/cert.pem
cp /etc/letsencrypt/live/example.com/privkey.pem /opt/trading-platform/TradingPlatform/ssl/key.pem

# Перезапустить nginx
cd /opt/trading-platform/TradingPlatform && docker-compose restart nginx

# Записать в лог
echo "$(date): SSL certificate renewed" >> /var/log/ssl-renew.log
```

**Сохранить:** `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Сделать скрипт исполняемым
sudo chmod +x /opt/renew-ssl.sh

# Добавить в crontab (автоматический запуск каждый день в 3:00 ночи)
sudo crontab -e

# Добавить эту строку в конец файла:
0 3 * * * /opt/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1

# Сохранить и выйти
```

**Проверить что cron работает:**

```bash
# Посмотреть список cron задач
sudo crontab -l

# Вручную запустить обновление (для теста)
sudo /opt/renew-ssl.sh

# Проверить лог
cat /var/log/ssl-renew.log
```

---

## 📊 УПРАВЛЕНИЕ СЕРВИСАМИ

### Основные команды

```bash
# Запуск сервисов
docker-compose up -d

# Остановка сервисов
docker-compose down

# Перезапуск сервисов
docker-compose restart

# Просмотр логов
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx

# Просмотр статуса
docker-compose ps

# Пересборка после изменений в коде
docker-compose up -d --build

# Очистка (УДАЛИТ ВСЕ ДАННЫЕ!)
docker-compose down -v
```

### Обновление кода

```bash
# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker-compose up -d --build

# Проверить логи
docker-compose logs -f app
```

---

## 🔧 TROUBLESHOOTING

### Приложение не запускается

```bash
# Проверить логи
docker-compose logs app

# Проверить что все зависимости установлены
docker-compose exec app npm list

# Пересобрать с нуля
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### PostgreSQL не подключается

```bash
# Проверить что PostgreSQL запущен
docker-compose ps db

# Проверить логи PostgreSQL
docker-compose logs db

# Проверить подключение
docker-compose exec db psql -U postgres -d tradingdb
```

### Nginx выдает 502 Bad Gateway

```bash
# Проверить что app запущен
docker-compose ps app

# Проверить логи nginx
docker-compose logs nginx

# Проверить что app доступен из nginx
docker-compose exec nginx wget -O- http://app:3000
```

### WebSocket не подключается

```bash
# Проверить логи приложения
docker-compose logs -f app | grep WebSocket

# Проверить что порты открыты
sudo netstat -tulpn | grep 3000

# Проверить firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Приложение использует много памяти

```bash
# Проверить использование ресурсов
docker stats

# Перезапустить приложение (ПОТЕРЯЕТ ДАННЫЕ!)
docker-compose restart app
```

---

## 📈 МОНИТОРИНГ

### Базовый мониторинг

```bash
# Использование ресурсов в реальном времени
docker stats

# Логи в реальном времени
docker-compose logs -f

# Размер томов
docker system df -v

# Проверка здоровья PostgreSQL
docker-compose exec db pg_isready -U postgres

# Проверка здоровья Redis
docker-compose exec redis redis-cli ping
```

### Рекомендуемые метрики для отслеживания

- Memory usage приложения (должен быть стабильным)
- Response time API endpoints
- PostgreSQL connection pool
- WebSocket соединения
- Disk space для PostgreSQL volumes

---

## 🛡️ БАЗОВАЯ БЕЗОПАСНОСТЬ

### Что реализовано

✅ CORS защита (только для браузеров)
✅ Security Headers (XSS, Clickjacking)
✅ Rate Limiting через nginx (200 req/min)
✅ PostgreSQL в изолированной сети
✅ Запуск приложения от непривилегированного пользователя

### Что НЕ реализовано (КРИТИЧНО!)

❌ API Key аутентификация
❌ Валидация входных данных
❌ Защита DELETE endpoints
❌ Логирование подозрительной активности
❌ Backup стратегия
❌ DDoS защита

### Минимальные шаги для улучшения безопасности

```bash
# 1. Сменить пароль PostgreSQL
# Отредактировать docker-compose.yml и .env.production

# 2. Закрыть ненужные порты
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 3. Ограничить доступ к портам БД (только localhost)
# В docker-compose.yml закомментировать:
# ports:
#   - "5432:5432"  # PostgreSQL
#   - "6379:6379"  # Redis

# 4. Настроить автоматические обновления
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📝 ВАЖНЫЕ ЗАМЕТКИ

### Проблема с потерей данных

**КРИТИЧНО:** Приложение использует in-memory хранилище (`Map` в `snapshots/route.ts`).

**Последствия:**

- ВСЕ данные теряются при рестарте
- Деплой новой версии = потеря всех данных
- Перезапуск сервера = потеря всех данных

**Временное решение:**
Использовать PostgreSQL только для критичных данных.

**Полное решение (требует доработки):**
Мигрировать на Prisma ORM (5-7 дней работы).

### Memory Leak

**Проблема:** `setInterval` в module scope в `snapshots/route.ts:53`

**Последствия:**

- Утечка памяти в serverless окружениях
- Приложение будет потреблять все больше памяти

**Временное решение:**
Перезапускать приложение раз в сутки:

```bash
# Добавить в crontab
0 3 * * * cd /opt/trading-platform/TradingPlatform && docker-compose restart app
```

---

## 🆘 ПОЛУЧИТЬ ПОМОЩЬ

1. Проверить `PRODUCTION_READINESS_REPORT.md` для списка всех проблем
2. Проверить логи: `docker-compose logs -f`
3. Проверить статус: `docker-compose ps`
4. Проверить ресурсы: `docker stats`

---

**Дата создания:** 2025-11-14
**Версия:** 1.0 (Минимальная конфигурация для срочного развертывания)

# Просмотр логов

docker-compose logs -f app

# Остановка сервисов

docker-compose down

# Перезапуск

docker-compose restart

# Пересборка после изменений

docker-compose up -d --build
