from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import time
from loguru import logger
from .config import settings

# Получаем URL базы данных через валидированную конфигурацию
SQLALCHEMY_DATABASE_URL = settings.get_database_url()

# Функция для проверки подключения к базе данных
def wait_for_db(max_retries=5, retry_interval=5):
    for i in range(max_retries):
        try:
            engine = create_engine(SQLALCHEMY_DATABASE_URL)
            engine.connect()
            logger.info("Успешное подключение к базе данных")
            return engine
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"Попытка подключения к базе данных {i + 1} из {max_retries} не удалась: {str(e)}")
                time.sleep(retry_interval)
            else:
                logger.error(f"Не удалось подключиться к базе данных после {max_retries} попыток")
                raise

# Создаем движок с повторными попытками подключения
engine = wait_for_db()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 