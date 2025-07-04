# Этап сборки
FROM node:20-alpine AS build

# Решение проблемы с SSL на macOS - устанавливаем certificates и используем fallback
RUN apk add --no-cache ca-certificates wget && \
    update-ca-certificates && \
    (apk update --no-cache || apk --allow-untrusted --no-cache update) && \
    (apk upgrade --available --no-cache || apk --allow-untrusted --no-cache upgrade --available) || true

# Устанавливаем дополнительные пакеты для сборки
RUN apk add --no-cache python3 make g++ || \
    apk --allow-untrusted --no-cache add python3 make g++

WORKDIR /app

# Настраиваем npm с таймаутами и retry
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set fetch-retries 3

# Копируем файлы package.json и package-lock.json для кеширования слоя зависимостей
COPY package*.json ./

# Устанавливаем зависимости с расширенными таймаутами
RUN npm install --timeout=600000

# Копируем исходный код
COPY . .

# Собираем приложение с увеличенным heap размером
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Этап production
FROM nginx:alpine AS production

# Копируем собранное приложение из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"] 