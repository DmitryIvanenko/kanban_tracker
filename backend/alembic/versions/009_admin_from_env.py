"""Create admin user from environment variables

Revision ID: 009
Revises: 008
Create Date: 2024-06-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import os
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    """
    Создает администратора на основе переменных окружения
    """
    # Импортируем функции для работы с паролями
    from app.auth import get_password_hash
    from sqlalchemy.sql import table, column
    
    # Получаем данные администратора из переменных окружения
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_password = os.getenv('ADMIN_PASSWORD')
    admin_telegram = os.getenv('ADMIN_TELEGRAM', '@admin')
    
    if not admin_password or admin_password == 'your_secure_password_here':
        print("Предупреждение: ADMIN_PASSWORD не установлен, используется значение по умолчанию")
        admin_password = 'admin'
    
    # Определяем таблицу users
    users_table = table('users',
        column('id', sa.Integer),
        column('username', sa.String),
        column('email', sa.String),
        column('hashed_password', sa.String),
        column('telegram', sa.String),
        column('is_active', sa.Boolean),
        column('role', sa.Enum),
        column('created_at', sa.DateTime)
    )
    
    # Проверяем, есть ли уже пользователь с таким именем
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT COUNT(*) FROM users WHERE username = :username"),
        {"username": admin_username}
    ).fetchone()
    
    if result[0] == 0:
        # Создаем администратора только если его еще нет
        admin_password_hash = get_password_hash(admin_password)
        
        # Используем INSERT с RETURNING для получения ID нового пользователя
        insert_result = connection.execute(
            sa.text("""
                INSERT INTO users (username, email, hashed_password, telegram, is_active, role, created_at)
                VALUES (:username, :email, :hashed_password, :telegram, :is_active, :role, :created_at)
                RETURNING id
            """),
            {
                'username': admin_username,
                'email': None,
                'hashed_password': admin_password_hash,
                'telegram': admin_telegram,
                'is_active': True,
                'role': 'ADMIN',
                'created_at': datetime.utcnow()
            }
        )
        
        admin_id = insert_result.fetchone()[0]
        
        # Обновляем owner_id основной доски на ID созданного администратора
        connection.execute(
            sa.text("UPDATE boards SET owner_id = :admin_id WHERE id = 1"),
            {"admin_id": admin_id}
        )
        
        print(f"Администратор {admin_username} создан с ID {admin_id}")
        print(f"Основная доска привязана к администратору")
    else:
        # Если пользователь существует, обновляем owner_id доски на его ID
        existing_admin = connection.execute(
            sa.text("SELECT id FROM users WHERE username = :username"),
            {"username": admin_username}
        ).fetchone()
        
        if existing_admin:
            connection.execute(
                sa.text("UPDATE boards SET owner_id = :admin_id WHERE id = 1"),
                {"admin_id": existing_admin[0]}
            )
            print(f"Основная доска привязана к существующему администратору (ID: {existing_admin[0]})")
        
        print(f"Пользователь {admin_username} уже существует, пропускаем создание")


def downgrade():
    """
    Удаляет администратора созданного из переменных окружения
    """
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM users WHERE username = :username AND role = 'ADMIN'"),
        {"username": admin_username}
    )
    print(f"Администратор {admin_username} удален") 