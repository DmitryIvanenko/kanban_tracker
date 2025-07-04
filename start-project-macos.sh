#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Остановка возможных запущенных контейнеров
echo -e "${YELLOW}🔄 Остановка предыдущих контейнеров...${NC}"
docker compose down &> /dev/null
docker compose -f docker-compose.macos.yml down &> /dev/null

# Очистка Docker кеша (опционально)
read -p "Очистить Docker кеш? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Очистка Docker кеша...${NC}"
    docker system prune -f
fi

# Сборка и запуск контейнеров
echo -e "${YELLOW}🏗️  Сборка и запуск контейнеров...${NC}"
docker compose -f docker-compose.macos.yml up -d --build

# Проверка статуса
echo -e "${YELLOW}⏳ Ожидание запуска сервисов...${NC}"
sleep 10

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
fi

# Проверка frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend доступен: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend недоступен${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Приложение запущено!${NC}"
echo "=================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Полезные команды:"
echo "  docker compose -f docker-compose.macos.yml logs -f    # Просмотр логов"
echo "  docker compose -f docker-compose.macos.yml down       # Остановка"
echo "  docker compose -f docker-compose.macos.yml ps         # Статус"
echo ""
echo -e "${YELLOW}📝 Для остановки используйте: docker compose -f docker-compose.macos.yml down${NC}" 