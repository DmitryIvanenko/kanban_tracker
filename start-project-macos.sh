#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Запуск Kanban Tracker на macOS${NC}"
echo "=================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не найден. Пожалуйста, установите Docker Desktop для macOS${NC}"
    exit 1
fi

# Проверка наличия docker compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не найден. Пожалуйста, обновите Docker Desktop${NC}"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден. Создаю из примера...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Файл .env создан. Отредактируйте его при необходимости${NC}"
fi

# Диагностика SSL проблем
echo -e "${BLUE}🔍 Диагностика SSL окружения...${NC}"

# Проверка сертификатов
if ! docker run --rm alpine:latest sh -c "apk update" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Обнаружены проблемы с SSL сертификатами Alpine${NC}"
fi

if ! docker run --rm python:3.11-slim sh -c "pip install --upgrade pip" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Обнаружены проблемы с SSL сертификатами Python/pip${NC}"
fi

# Остановка возможных запущенных контейнеров
echo -e "${YELLOW}🔄 Остановка предыдущих контейнеров...${NC}"
docker compose down &> /dev/null
docker compose -f docker-compose.macos.yml down &> /dev/null

# Очистка Docker кеша (опционально)
read -p "Очистить Docker кеш? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Очистка Docker кеша...${NC}"
    docker system prune -f --volumes
fi

# Проверка на принудительную пересборку
read -p "Принудительная пересборка без кеша? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BUILD_ARGS="--no-cache --pull"
else
    BUILD_ARGS=""
fi

# Сборка и запуск контейнеров
echo -e "${YELLOW}🏗️  Сборка и запуск контейнеров с macOS оптимизациями...${NC}"
echo -e "${BLUE}📝 Используются специальные Dockerfile для обхода SSL проблем${NC}"

if ! docker compose -f docker-compose.macos.yml up -d --build $BUILD_ARGS; then
    echo -e "${RED}❌ Ошибка при сборке контейнеров${NC}"
    echo -e "${YELLOW}💡 Попробуйте следующие решения:${NC}"
    echo "1. Запустите с полной очисткой кеша"
    echo "2. Проверьте README.macOS.md для дополнительных решений"
    echo "3. Попробуйте сборку с конкретной платформой:"
    echo "   docker compose -f docker-compose.macos.yml build --platform linux/amd64"
    exit 1
fi

# Проверка статуса
echo -e "${YELLOW}⏳ Ожидание запуска сервисов...${NC}"
sleep 15

# Проверка здоровья сервисов
echo -e "${YELLOW}🔍 Проверка статуса сервисов...${NC}"
docker compose -f docker-compose.macos.yml ps

# Проверка доступности
echo -e "${YELLOW}🌐 Проверка доступности приложения...${NC}"

# Проверка backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend доступен: http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend недоступен${NC}"
    echo -e "${YELLOW}📋 Логи backend:${NC}"
    docker compose -f docker-compose.macos.yml logs --tail=10 backend
fi

# Проверка frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend доступен: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend недоступен${NC}"
    echo -e "${YELLOW}📋 Логи frontend:${NC}"
    docker compose -f docker-compose.macos.yml logs --tail=10 frontend
fi

echo ""
echo -e "${GREEN}🎉 Приложение запущено!${NC}"
echo "=================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo -e "${BLUE}🔧 Специальные настройки для macOS:${NC}"
echo "  - Используется docker-compose.macos.yml"
echo "  - Специальные Dockerfile с обходом SSL"
echo "  - Trusted hosts для pip"
echo "  - HTTP репозитории для Alpine"
echo ""
echo "📋 Полезные команды:"
echo "  docker compose -f docker-compose.macos.yml logs -f    # Просмотр логов"
echo "  docker compose -f docker-compose.macos.yml down       # Остановка"
echo "  docker compose -f docker-compose.macos.yml ps         # Статус"
echo ""
echo -e "${YELLOW}📝 Для остановки: docker compose -f docker-compose.macos.yml down${NC}"
echo -e "${YELLOW}📖 Подробная документация: README.macOS.md${NC}" 