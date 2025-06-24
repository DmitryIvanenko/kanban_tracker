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
```bash
cp .env.example .env
```
Отредактируйте файл `.env` и укажите ваш токен Telegram бота:
- Получите токен у @BotFather в Telegram
- Замените `your_telegram_bot_token_here` на ваш токен

3. Запустите проект с помощью Docker Compose:
```bash
docker-compose up --build
```

3. Приложение будет доступно по следующим адресам:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger документация: http://localhost:8000/docs

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