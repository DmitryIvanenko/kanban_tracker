from sqlalchemy.orm import Session
from . import models
from .database import SessionLocal
from .models import KanbanColumn
from .auth import get_password_hash
import logging

logger = logging.getLogger(__name__)

def init_db():
    """
    Функция инициализации БД. 
    Теперь только проверяет подключение - все данные создаются через миграции.
    """
    db = SessionLocal()
    try:
        # Проверяем подключение к БД
        db.execute("SELECT 1")
        logger.info("База данных успешно инициализирована")
    except Exception as e:
        logger.info(f"Ошибка при проверке БД: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 