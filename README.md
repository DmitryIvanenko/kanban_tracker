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

## Установка и запуск

### Предварительные требования
- Docker
- Docker Compose

### Запуск проекта

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd kanban-tracker
```

2. Настройте переменные окружения:

Создайте файл `.env` в корневой директории проекта:

```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
ADMIN_TELEGRAM=@admin
```

**Описание переменных:**
- `TELEGRAM_BOT_TOKEN` - токен телеграм бота для уведомлений (получите у @BotFather)
- `ADMIN_USERNAME` - имя пользователя администратора (по умолчанию: admin)  
- `ADMIN_PASSWORD` - пароль администратора (**ОБЯЗАТЕЛЬНО** установите безопасный пароль)
- `ADMIN_TELEGRAM` - телеграм администратора (по умолчанию: @admin)

**Важно:** 
- Никогда не коммитьте файл .env в репозиторий
- Используйте надежный пароль для ADMIN_PASSWORD
- Каждая среда должна иметь свой .env файл

3. Запустите проект с помощью Docker Compose:
```bash
docker-compose up --build
```

4. Приложение будет доступно по следующим адресам:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger документация: http://localhost:8000/docs

### Настройка администратора

После первого запуска создайте/обновите учетную запись администратора:

```bash
# Создайте/обновите администратора
docker-compose exec backend python -c "import sys; sys.path.append('/app'); from app.init_db import create_admin_user; create_admin_user()"
```

Или используйте миграцию базы данных (администратор создается автоматически):

```bash
docker-compose exec backend alembic upgrade head
```

После этого вы сможете войти в систему под логином и паролем, указанными в файле `.env`.

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
│   └── package.json
└── docker-compose.yml
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