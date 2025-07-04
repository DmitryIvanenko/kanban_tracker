# Kanban Tracker

Веб-приложение для управления задачами и проектами с использованием канбан-методологии.

## Технологии

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic

### Frontend
- React
- Material-UI  
- React Beautiful DnD
- Recharts
- DOMPurify (защита от XSS)

## Установка и запуск

### Предварительные требования
- Docker
- Docker Compose

### Быстрый запуск с помощью скриптов

#### Для Linux/Unix:
```bash
# Сделайте скрипт исполняемым
chmod +x start-project.sh

# Запустите проект
./start-project.sh
```

#### Для macOS:
```bash
# Сделайте скрипт исполняемым
chmod +x start-project-macos.sh

# Запустите проект
./start-project-macos.sh
```

**Что делают скрипты:**
- 🔍 Проверяют наличие Docker и Docker Compose
- 📋 Создают `.env` файл из примера (если отсутствует)
- 🛑 Останавливают предыдущие контейнеры
- 🏗️ Собирают и запускают контейнеры
- 🔄 Выполняют миграции базы данных
- ✅ Проверяют доступность сервисов
- 📊 Показывают статус приложения

### Ручной запуск

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd kanban-tracker
```

2. Настройте переменные окружения:

Скопируйте файл `env.example` в `.env` и настройте переменные:

```bash
cp env.example .env
```

**Минимальная конфигурация (.env):**
```bash
# ОБЯЗАТЕЛЬНО! Установите надежный пароль
ADMIN_PASSWORD=YourSecurePassword123
```

**Полная конфигурация:**
```bash
# Обязательные переменные
ADMIN_PASSWORD=YourSecurePassword123

# Опциональные переменные
ADMIN_USERNAME=admin
ADMIN_TELEGRAM=@yourtelegram
TELEGRAM_BOT_TOKEN=1234567890:AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIII

# Безопасность (для production)
SECRET_KEY=$(openssl rand -hex 32)
ENV=production
DEBUG=false
```

**Валидация переменных:**
- ✅ `ADMIN_PASSWORD` проверяется на сложность (мин. 8 символов, заглавные/строчные буквы, цифры)
- ✅ `TELEGRAM_BOT_TOKEN` проверяется на корректный формат Telegram API
- ✅ `ADMIN_TELEGRAM` валидируется как @username или chat_id
- ✅ `SECRET_KEY` должен быть минимум 32 символа для production
- ✅ `DATABASE_URL` проверяется как валидный PostgreSQL URL

**Важно:** 
- 🚨 Приложение **НЕ ЗАПУСТИТСЯ** без валидного `ADMIN_PASSWORD`
- 🔒 Никогда не коммитьте файл `.env` в репозиторий
- 🛡️ В production используйте сложные пароли и секретные ключи
- 📋 Подробные требования к переменным смотрите в `env.example`

3. Запустите проект:

**Для Linux/Unix:**
```bash
docker compose up --build
```

**Для macOS (при проблемах с SSL):**
```bash
docker compose -f docker-compose.macos.yml up --build
```

4. Приложение будет доступно по следующим адресам:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger документация: http://localhost:8000/docs

### Управление проектом

**Запуск:**
```bash
# Linux/Unix
./start-project.sh

# macOS
./start-project-macos.sh

# Или вручную
docker compose up -d
```

**Остановка:**
```bash
# Linux/Unix
docker compose down

# macOS
docker compose -f docker-compose.macos.yml down
```

**Просмотр логов:**
```bash
# Linux/Unix
docker compose logs -f

# macOS
docker compose -f docker-compose.macos.yml logs -f
```

**Перезапуск с пересборкой:**
```bash
# Linux/Unix
docker compose down && docker compose up --build

# macOS
docker compose -f docker-compose.macos.yml down && docker compose -f docker-compose.macos.yml up --build
```

### Настройка администратора

После первого запуска создайте/обновите учетную запись администратора:

```bash
# Создайте/обновите администратора
docker compose exec backend python -c "import sys; sys.path.append('/app'); from app.init_db import create_admin_user; create_admin_user()"
```

Или используйте миграцию базы данных (администратор создается автоматически):

```bash
docker compose exec backend alembic upgrade head
```

После этого вы сможете войти в систему под логином и паролем, указанными в файле `.env`.

## Особенности для разных платформ

### macOS
На macOS возможны проблемы с SSL сертификатами при сборке Docker образов. Для решения:
1. Используйте специальный скрипт: `./start-project-macos.sh`
2. Или специальный docker-compose: `docker compose -f docker-compose.macos.yml up --build`
3. Подробности в файле `README.macOS.md`

### Linux/Unix
Стандартный запуск через `./start-project.sh` или `docker compose up --build`

## Структура проекта

```
kanban-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   └── database.py
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── Dockerfile.macos
│   └── package.json
├── docker-compose.yml
├── docker-compose.macos.yml
├── start-project.sh
├── start-project-macos.sh
└── README.macOS.md
```

## API Endpoints

- `/api/auth/` - Аутентификация
- `/api/boards/` - Управление досками
- `/api/columns/` - Управление колонками
- `/api/cards/` - Управление карточками
- `/api/history/` - История изменений
- `/api/statistics/` - Статистика

## Лицензия

MIT 