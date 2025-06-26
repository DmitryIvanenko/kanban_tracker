FROM python:3.11-slim

WORKDIR /app

# Обновляем пакеты и устанавливаем необходимые инструменты для работы с сертификатами
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Обновляем CA-сертификаты
RUN update-ca-certificates

# Настраиваем pip для работы с доверенными хостами
RUN pip config set global.trusted-host pypi.org && \
    pip config set global.trusted-host pypi.python.org && \
    pip config set global.trusted-host files.pythonhosted.org

# Обновляем pip до последней версии
RUN pip install --upgrade pip

COPY requirements.txt .

# Устанавливаем зависимости с дополнительными флагами для SSL
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 