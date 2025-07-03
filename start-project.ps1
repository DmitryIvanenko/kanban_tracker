# Скрипт для запуска Kanban Tracker на Windows
# Запуск: .\start-project.ps1

Write-Host "🚀 Запуск Kanban Tracker..." -ForegroundColor Green

# Проверка наличия Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "❌ Docker не найден! Установите Docker Desktop для Windows" -ForegroundColor Red
    exit 1
}

# Проверка наличия Docker Compose
$dockerComposeInstalled = Get-Command docker-compose -ErrorAction SilentlyContinue
if (-not $dockerComposeInstalled) {
    Write-Host "❌ Docker Compose не найден! Установите Docker Desktop для Windows" -ForegroundColor Red
    exit 1
}

# Проверка наличия .env файла
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден!" -ForegroundColor Yellow
    Write-Host "Создаю .env файл..." -ForegroundColor Yellow
    
    # Генерируем безопасный SECRET_KEY
    $secretKey = -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
    
    # Создаем .env файл без BOM символов
    $envContent = @"
ADMIN_PASSWORD=SecureAdmin123
ADMIN_USERNAME=admin
ADMIN_TELEGRAM=@admin
DATABASE_URL=postgresql://postgres:postgres@db:5432/kanban
SECRET_KEY=$secretKey
DEBUG=true
ENV=development
"@
    
    # Используем .NET метод для создания файла без BOM
    [System.IO.File]::WriteAllText("$PWD\.env", $envContent)
    
    Write-Host "✅ Файл .env создан с базовыми настройками!" -ForegroundColor Green
    Write-Host "🔐 Сгенерирован уникальный SECRET_KEY!" -ForegroundColor Green
    Write-Host "💡 Вы можете отредактировать его позже для production настроек" -ForegroundColor Blue
}

# Проверка, что Docker Desktop запущен
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker Desktop не запущен! Запустите Docker Desktop и попробуйте снова." -ForegroundColor Red
    exit 1
}

Write-Host "🧹 Очистка предыдущих контейнеров..." -ForegroundColor Blue
docker compose down --volumes

Write-Host "🔨 Сборка и запуск проекта..." -ForegroundColor Blue
Write-Host "   Это может занять несколько минут при первом запуске..." -ForegroundColor Yellow

# Запуск с подробными логами
docker compose up --build

Write-Host "✅ Проект запущен!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API документация: http://localhost:8000/docs" -ForegroundColor Cyan 