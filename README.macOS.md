# Решение проблем с SSL на macOS

## Проблема
При сборке Docker контейнеров на macOS (особенно с Apple Silicon) возникает ошибка:
```
SSL routines:tls_post_process_server_certificate:certificate verify failed
```

## Решения

### Вариант 1: Использование специального docker-compose для macOS
```bash
# Используйте специальный docker-compose файл для macOS
docker compose -f docker-compose.macos.yml up -d --build
```

### Вариант 2: Переменные окружения для Docker
Добавьте в ваш `.env` файл:
```bash
DOCKER_BUILDKIT=1
BUILDKIT_INLINE_CACHE=1
```

### Вариант 3: Использование альтернативных репозиториев Alpine
Если проблема все еще возникает, можно собрать контейнер с принудительным использованием HTTP:
```bash
docker compose build --build-arg ALPINE_MIRROR=http://dl-cdn.alpinelinux.org/alpine/v3.18/main
```

### Вариант 4: Сборка с конкретной платформой
Для Apple Silicon Mac:
```bash
docker compose build --platform linux/amd64
```

### Вариант 5: Очистка Docker кеша
Если ничего не помогает:
```bash
docker system prune -a
docker compose -f docker-compose.macos.yml up -d --build --no-cache
```

## Команды для разработки на macOS

### Запуск проекта
```bash
# Для macOS (рекомендуется)
docker compose -f docker-compose.macos.yml up -d --build

# Остановка
docker compose -f docker-compose.macos.yml down

# Просмотр логов
docker compose -f docker-compose.macos.yml logs -f
```

### Отладка
```bash
# Проверка статуса контейнеров
docker compose -f docker-compose.macos.yml ps

# Вход в контейнер frontend для отладки
docker compose -f docker-compose.macos.yml exec frontend sh

# Вход в контейнер backend для отладки
docker compose -f docker-compose.macos.yml exec backend bash
```

## Специальные настройки для macOS

### 1. Dockerfile.macos
- Использует HTTP репозитории вместо HTTPS
- Отключает SSL проверку для npm
- Использует `--allow-untrusted` для apk

### 2. docker-compose.macos.yml
- Использует специальный Dockerfile для frontend
- Включает дополнительные build аргументы для оптимизации

## Проверка работоспособности
После успешного запуска:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Полезные команды
```bash
# Полная очистка и пересборка
docker compose -f docker-compose.macos.yml down -v
docker system prune -a
docker compose -f docker-compose.macos.yml up -d --build --no-cache

# Проверка использования ресурсов
docker stats

# Просмотр использования места
docker system df
``` 