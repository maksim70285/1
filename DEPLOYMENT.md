# 🚀 Руководство по развертыванию веб-мессенджера на выделенном сервере (VDS)

Данный документ содержит пошаговую инструкцию по развертыванию веб-мессенджера на сервере под управлением **Ubuntu 22.04 / 24.04 LTS** с использованием **Docker**, **Docker Compose**, **Nginx (Reverse Proxy)**, **SSL (Let's Encrypt)** и систем защиты **UFW + Fail2ban**.

---

## 1. Подготовка VDS сервера

Подключитесь к вашему VDS по SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Обновите пакеты операционной системы:
```bash
apt update && apt upgrade -y
```

---

## 2. Настройка базовой безопасности (UFW & Fail2ban)

### Настройка файрвола (UFW)
Разрешите подключение по SSH, HTTP и HTTPS, затем включите фаервол:
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Установка и запуск Fail2ban
Защитит SSH от атак методом перебора паролей:
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 3. Установка Docker и Docker Compose

Установите Docker Engine и плагин Docker Compose:
```bash
# Установка необходимых утилит
apt install -y ca-certificates curl gnupg lsb-release

# Добавление ключа Docker GPG
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавление репозитория
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверка
docker --version
docker compose version
```

---

## 4. Клонирование и настройка проекта

Клонируйте репозиторий вашего мессенджера на сервер:
```bash
cd /opt
git clone https://github.com/your-username/web-messenger.git
cd web-messenger
```

Создайте `.env` файл из примера:
```bash
cp .env.example .env
```

Отредактируйте `.env` при необходимости (`nano .env`).

---

## 5. Выпуск бесплатного SSL-сертификата (Let's Encrypt)

Для корректной работы WebSockets в современных браузерах требуется защищенное HTTPS/WSS соединение.

1. Установите `certbot`:
```bash
apt install certbot -y
```

2. Привяжите ваш домен к IP-адресу VDS (A-запись в DNS панели домена).

3. Выпустите сертификат:
```bash
certbot certonly --standalone -d messenger.yourdomain.com --email admin@yourdomain.com --agree-tos -n
```

4. Сертификаты будут сохранены в каталоге:
`/etc/letsencrypt/live/messenger.yourdomain.com/`

5. Раскомментируйте строки с SSL в `nginx.conf`:
```nginx
ssl_certificate /etc/letsencrypt/live/messenger.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/messenger.yourdomain.com/privkey.pem;
```

---

## 6. Запуск через Docker Compose

Запустите контейнеры в фоновом режиме:
```bash
docker compose up -d --build
```

Проверьте статус запущенных сервисов:
```bash
docker compose ps
```

Просмотр логов в реальном времени:
```bash
docker compose logs -f messenger
```

---

## 7. Автоматическое обновление SSL сертификата

Добавьте задачу в `crontab` для автоматического продления сертификата каждые 60 дней:
```bash
crontab -e
```
Добавьте строку:
```cron
0 3 1 * * certbot renew --quiet && docker compose exec nginx nginx -s reload
```

---

## 🎉 Приемка и проверка
После запуска сайт и WebSockets будут доступны по адресу `https://messenger.yourdomain.com`:
- Мобильная адаптивность проверяется на смартфонах iOS и Android.
- При загрузке диалогов, поиска и профиля отображаются плавные **skeleton-загрузчики**.
- Сообщения и статусы доставки обновляются мгновенно через WebSockets.
