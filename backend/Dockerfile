FROM python:3.11-slim

WORKDIR /app

# Обновляем pip до последней версии
RUN pip install --upgrade pip

# Копируем requirements.txt для кеширования слоя зависимостей
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 