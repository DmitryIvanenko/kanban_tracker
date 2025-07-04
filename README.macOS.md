# Решение проблем с SSL на macOS

## Проблема
При сборке Docker контейнеров на macOS (особенно с Apple Silicon) возникают ошибки SSL:

**Frontend (Alpine Linux):**
```
SSL routines:tls_post_process_server_certificate:certificate verify failed
```

**Backend (Python pip):**
```
[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate
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

### Вариант 3: Использование альтернативных репозиториев
Если проблема все еще возникает, можно собрать контейнер с принудительным использованием HTTP:
```bash
docker compose -f docker-compose.macos.yml build --build-arg ALPINE_MIRROR=http://dl-cdn.alpinelinux.org/alpine/v3.18/main
```

### Вариант 4: Сборка с конкретной платформой
Для Apple Silicon Mac:
```bash
docker compose -f docker-compose.macos.yml build --platform linux/amd64
```

### Вариант 5: Полная очистка Docker кеша
Если ничего не помогает:
```bash
docker system prune -a --volumes
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

### 1. Frontend (Dockerfile.macos)
- Использует HTTP репозитории вместо HTTPS
- Отключает SSL проверку для npm
- Использует `--allow-untrusted` для apk

### 2. Backend (Dockerfile.macos)
- Добавляет trusted-host для pip
- Использует `--trusted-host` для всех pip команд
- Настраивает pip config для обхода SSL

### 3. docker-compose.macos.yml
- Использует специальные Dockerfile для обоих сервисов
- Включает дополнительные build аргументы для оптимизации

## Проверка работоспособности
После успешного запуска:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Диагностика проблем

### Проверка SSL сертификатов
```bash
# Проверка доступности репозиториев
docker run --rm alpine:latest sh -c "apk update"

# Проверка pip
docker run --rm python:3.11-slim sh -c "pip install --upgrade pip"
```

### Логи сборки
```bash
# Детальные логи сборки
docker compose -f docker-compose.macos.yml build --progress=plain --no-cache

# Сборка отдельных сервисов
docker compose -f docker-compose.macos.yml build frontend --progress=plain
docker compose -f docker-compose.macos.yml build backend --progress=plain
```

## Полезные команды
```bash
# Полная очистка и пересборка
docker compose -f docker-compose.macos.yml down -v
docker system prune -a --volumes
docker compose -f docker-compose.macos.yml up -d --build --no-cache

# Проверка использования ресурсов
docker stats

# Просмотр использования места
docker system df

# Принудительная пересборка без кеша
docker compose -f docker-compose.macos.yml build --no-cache --pull
```

## Альтернативные решения

### 1. Использование Docker Desktop настроек
В Docker Desktop для macOS:
- Settings → Docker Engine
- Добавьте в конфигурацию:
```json
{
  "insecure-registries": [],
  "registry-mirrors": ["https://registry.docker-cn.com"]
}
```

### 2. Системные сертификаты
```bash
# Обновите сертификаты системы
brew install ca-certificates
```

### 3. Переменные окружения
Добавьте в `.env`:
```bash
PYTHONHTTPSVERIFY=0
CURL_CA_BUNDLE=""
REQUESTS_CA_BUNDLE=""
``` 