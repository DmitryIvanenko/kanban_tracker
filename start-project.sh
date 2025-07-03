#!/bin/bash

# Скрипт для запуска Kanban Tracker на Mac/Linux
# Запуск: chmod +x start-project.sh && ./start-project.sh

echo "🚀 Запуск Kanban Tracker..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден! Установите Docker Desktop"
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose не найден! Установите Docker Desktop"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден!"
    echo "Создаю .env файл..."
    
    # Генерируем безопасный SECRET_KEY
    if command -v openssl &> /dev/null; then
        SECRET_KEY=$(openssl rand -hex 32)
    else
        # Fallback для систем без openssl
        SECRET_KEY=$(head -c 32 /dev/urandom | xxd -p | tr -d '\n')
    fi
    
    # Создаем .env файл с базовыми настройками
    cat > .env << EOF
ADMIN_PASSWORD=SecureAdmin123
ADMIN_USERNAME=admin
ADMIN_TELEGRAM=@admin
DATABASE_URL=postgresql://postgres:postgres@db:5432/kanban
SECRET_KEY=$SECRET_KEY
DEBUG=true
ENV=development
EOF
    
    echo "✅ Файл .env создан с базовыми настройками!"
    echo "🔐 Сгенерирован уникальный SECRET_KEY!"
    echo "💡 Вы можете отредактировать его позже для production настроек"
fi

# Проверка, что Docker запущен
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker не запущен! Запустите Docker Desktop и попробуйте снова."
    exit 1
fi

echo "🧹 Очистка предыдущих контейнеров..."
docker compose down --volumes 2>/dev/null || docker-compose down --volumes

echo "🔨 Сборка и запуск проекта..."
echo "   Это может занять несколько минут при первом запуске..."

# Запуск с подробными логами
docker compose up --build 2>/dev/null || docker-compose up --build

echo "✅ Проект запущен!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API документация: http://localhost:8000/docs" 