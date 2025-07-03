# Инструкции по запуску проекта с Docker

## 🚀 Быстрый запуск (рекомендуется)

### Windows:
```powershell
.\start-project.ps1
```

### Mac/Linux:
```bash
chmod +x start-project.sh && ./start-project.sh
```

Скрипты автоматически создадут .env файл и запустят проект.

## 📋 Ручной запуск

### 1. Создание .env файла (автоматически)
Скрипты создают .env файл автоматически, но при необходимости можно создать вручную:

**Минимальная конфигурация:**
```env
ADMIN_PASSWORD=SecureAdmin123
ADMIN_USERNAME=admin
ADMIN_TELEGRAM=@admin
DATABASE_URL=postgresql://postgres:postgres@db:5432/kanban
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true
ENV=development
```

### 2. Запуск проекта

**Вариант 1: Полная пересборка (рекомендуется при первом запуске)**
```bash
docker compose down --volumes
docker compose up --build
```

**Вариант 2: Быстрый запуск (если уже собирали раньше)**
```bash
docker compose up
```

**Вариант 3: Запуск в фоновом режиме**
```bash
docker compose up -d --build
```

## 🔧 Исправленные проблемы

✅ **Проблема "failed to execute bake"** - исправлена  
✅ **Зависание на frontend build** - исправлена  
✅ **Проблемы с BOM символами в .env** - исправлена  
✅ **Отсутствие package-lock.json** - исправлена  
✅ **Проблемы с временем сертификатов** - исправлена  

## 🌐 Проверка работы

После успешного запуска:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API документация**: http://localhost:8000/docs

## 📊 Управление контейнерами

```bash
# Просмотр статуса контейнеров
docker compose ps

# Просмотр логов
docker compose logs
docker compose logs frontend
docker compose logs backend
docker compose logs db

# Остановка контейнеров
docker compose down

# Остановка с удалением volumes (потеряете данные БД)
docker compose down --volumes

# Перезапуск определенного сервиса
docker compose restart backend
```

## 🛠️ Устранение проблем

### Если проект не запускается:
1. Убедитесь, что Docker Desktop запущен
2. Проверьте, что порты 3000, 8000, 5432 свободны
3. Перезапустите Docker Desktop
4. Выполните: `docker compose down --volumes && docker compose up --build`

### Если нужно пересобрать только один сервис:
```bash
# Пересобрать только backend
docker compose build backend
docker compose up backend

# Пересобрать только frontend  
docker compose build frontend
docker compose up frontend
```

### Очистка кеша Docker:
```bash
docker system prune -a --volumes
```

## 🔐 Безопасность

Для production обязательно измените:
- `ADMIN_PASSWORD` - на безопасный пароль
- `SECRET_KEY` - на уникальный ключ (используйте `openssl rand -hex 32`)
- `DEBUG=false` - отключите отладку
- `ENV=production` - установите production режим 