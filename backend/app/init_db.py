from sqlalchemy.orm import Session
from . import models
from .database import SessionLocal
from .models import KanbanColumn
from .auth import get_password_hash
import logging

logger = logging.getLogger(__name__)

def init_db():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже доска
        board = db.query(models.Board).first()
        if not board:
            # Создаем тестового пользователя
            hashed_password = get_password_hash("admin")
            logger.info(f"Создаем тестового пользователя admin с хешем пароля: {hashed_password}")
            user = models.User(
                username="admin",
                hashed_password=hashed_password,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Пользователь admin успешно создан с id: {user.id}")

            # Создаем доску
            board = models.Board(
                title="Основная доска",
                description="Основная канбан доска",
                owner_id=user.id
            )
            db.add(board)
            db.commit()
            db.refresh(board)

            # Проверяем, существуют ли уже колонки
            existing_columns = db.query(KanbanColumn).all()
            if not existing_columns:
                # Создаем три базовые колонки
                columns = [
                    KanbanColumn(
                        title="Backlog",
                        color="#FF6B6B",
                        position=0,
                        board_id=board.id
                    ),
                    KanbanColumn(
                        title="In Progress",
                        color="#4ECDC4",
                        position=1,
                        board_id=board.id
                    ),
                    KanbanColumn(
                        title="Done",
                        color="#45B7D1",
                        position=2,
                        board_id=board.id
                    )
                ]
                db.add_all(columns)
                db.commit()
    except Exception as e:
        print(f"Ошибка при инициализации базы данных: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 