from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from . import models
from .database import SessionLocal
from .models import KanbanColumn
from .auth import get_password_hash
from .config import settings
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
        db.execute(text("SELECT 1"))
        logger.info("База данных успешно инициализирована")
    except Exception as e:
        logger.info(f"Ошибка при проверке БД: {e}")
    finally:
        db.close()

def create_admin_user():
    """
    Создает или обновляет администратора на основе валидированных настроек.
    Использует атомарную операцию для предотвращения дубликатов.
    """
    # Получаем данные администратора из валидированных настроек
    admin_username = settings.admin_username
    admin_password = settings.get_admin_password()
    admin_telegram = settings.admin_telegram
    
    # Валидация уже прошла в config.py, но на всякий случай проверим
    if not admin_password:
        logger.error("ADMIN_PASSWORD не установлен")
        print("Ошибка: ADMIN_PASSWORD должен быть установлен и валидирован")
        return False
    
    db = SessionLocal()
    try:
        # Хешируем пароль заранее
        hashed_password = get_password_hash(admin_password)
        
        # Используем атомарную операцию UPSERT (PostgreSQL ON CONFLICT)
        upsert_query = text("""
            INSERT INTO users (username, hashed_password, telegram, is_active, role, created_at)
            VALUES (:username, :hashed_password, :telegram, :is_active, :role, NOW())
            ON CONFLICT (username) 
            DO UPDATE SET
                hashed_password = EXCLUDED.hashed_password,
                telegram = EXCLUDED.telegram,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active
            RETURNING id, 
                CASE 
                    WHEN xmax = 0 THEN 'inserted'
                    ELSE 'updated'
                END as action
        """)
        
        result = db.execute(upsert_query, {
            'username': admin_username,
            'hashed_password': hashed_password,
            'telegram': admin_telegram,
            'is_active': True,
            'role': 'ADMIN'
        })
        
        row = result.fetchone()
        db.commit()
        
        if row:
            user_id, action = row
            if action == 'inserted':
                logger.info(f"Администратор {admin_username} успешно создан (ID: {user_id})")
                print(f"Администратор {admin_username} успешно создан")
            else:
                logger.info(f"Администратор {admin_username} успешно обновлен (ID: {user_id})")
                print(f"Администратор {admin_username} успешно обновлен")
            return True
        else:
            logger.error("Неожиданная ошибка при создании/обновлении администратора")
            print("Ошибка при создании/обновлении администратора")
            return False
            
    except IntegrityError as e:
        db.rollback()
        # Эта ошибка не должна происходить с UPSERT, но на всякий случай
        logger.error(f"Ошибка целостности при создании/обновлении администратора {admin_username}: {e}")
        print(f"Ошибка целостности базы данных: {e}")
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Неожиданная ошибка при создании/обновлении администратора {admin_username}: {e}")
        print(f"Ошибка: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 