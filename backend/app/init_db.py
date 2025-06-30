from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from . import models
from .database import SessionLocal
from .models import KanbanColumn
from .auth import get_password_hash
import logging
import os

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

def create_admin_user():
    """
    Создает или обновляет администратора на основе переменных окружения
    """
    # Получаем данные администратора из переменных окружения
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin')
    admin_telegram = os.getenv('ADMIN_TELEGRAM', '@admin')
    
    if not admin_password or admin_password == 'your_secure_password_here':
        logger.error("ADMIN_PASSWORD не установлен или содержит значение по умолчанию")
        print("Ошибка: ADMIN_PASSWORD должен быть установлен в переменных окружения")
        return
    
    db = SessionLocal()
    try:
        # Ищем пользователя по username из env
        admin_user = db.query(models.User).filter(models.User.username == admin_username).first()
        
        if admin_user:
            # Обновляем данные администратора
            admin_user.hashed_password = get_password_hash(admin_password)
            admin_user.telegram = admin_telegram
            admin_user.role = models.UserRole.ADMIN
            admin_user.is_active = True
            try:
                db.commit()
                logger.info(f"Администратор {admin_username} обновлен")
                print(f"Администратор {admin_username} успешно обновлен")
            except IntegrityError as e:
                db.rollback()
                logger.error(f"Ошибка при обновлении администратора {admin_username}: {e}")
                print(f"Ошибка при обновлении администратора: {e}")
        else:
            # Создаем нового администратора
            admin_user = models.User(
                username=admin_username,
                hashed_password=get_password_hash(admin_password),
                telegram=admin_telegram,
                is_active=True,
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            try:
                db.commit()
                logger.info(f"Администратор {admin_username} создан")
                print(f"Администратор {admin_username} успешно создан")
            except IntegrityError as e:
                db.rollback()
                if "duplicate key value violates unique constraint" in str(e):
                    logger.warning(f"Пользователь {admin_username} уже существует")
                    print(f"Пользователь {admin_username} уже существует")
                    # Попробуем найти существующего пользователя и обновить его
                    existing_user = db.query(models.User).filter(models.User.username == admin_username).first()
                    if existing_user:
                        existing_user.hashed_password = get_password_hash(admin_password)
                        existing_user.telegram = admin_telegram
                        existing_user.role = models.UserRole.ADMIN
                        existing_user.is_active = True
                        db.commit()
                        logger.info(f"Существующий пользователь {admin_username} обновлен до роли администратора")
                        print(f"Существующий пользователь {admin_username} обновлен до роли администратора")
                else:
                    logger.error(f"Неожиданная ошибка целостности при создании администратора {admin_username}: {e}")
                    print(f"Ошибка создания администратора: {e}")
    except Exception as e:
        logger.error(f"Ошибка при создании/обновлении администратора: {e}")
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 