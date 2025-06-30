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

def create_admin_user():
    """
    Создает или обновляет пароль администратора
    """
    db = SessionLocal()
    try:
        # Ищем пользователя admin
        admin_user = db.query(models.User).filter(models.User.username == 'admin').first()
        
        if admin_user:
            # Обновляем пароль
            admin_user.hashed_password = get_password_hash('admin')
            db.commit()
            logger.info("Пароль администратора обновлен")
            print("Пароль администратора успешно обновлен")
        else:
            # Создаем нового администратора
            admin_user = models.User(
                username='admin',
                hashed_password=get_password_hash('admin'),
                telegram='@admin',
                is_active=True,
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            db.commit()
            logger.info("Администратор создан")
            print("Администратор успешно создан")
    except Exception as e:
        logger.error(f"Ошибка при создании/обновлении администратора: {e}")
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 