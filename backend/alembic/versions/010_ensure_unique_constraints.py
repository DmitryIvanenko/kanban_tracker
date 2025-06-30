"""Ensure unique constraints on users table

Revision ID: 010
Revises: 009
Create Date: 2024-06-30 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    """
    Проверяет и добавляет ограничения уникальности для полей username и email
    """
    # Получаем информацию о текущей схеме
    connection = op.get_bind()
    inspector = inspect(connection)
    
    # Получаем существующие индексы для таблицы users
    existing_indexes = inspector.get_indexes('users')
    
    # Проверяем наличие уникального индекса для username
    username_unique_exists = any(
        idx['name'] == 'ix_users_username' and idx['unique'] 
        for idx in existing_indexes
    )
    
    # Проверяем наличие уникального индекса для email
    email_unique_exists = any(
        idx['name'] == 'ix_users_email' and idx['unique'] 
        for idx in existing_indexes
    )
    
    print(f"Проверка ограничений уникальности:")
    print(f"  Username unique constraint: {'EXISTS' if username_unique_exists else 'MISSING'}")
    print(f"  Email unique constraint: {'EXISTS' if email_unique_exists else 'MISSING'}")
    
    # Если уникальный индекс для username отсутствует - создаем его
    if not username_unique_exists:
        print("Создание уникального индекса для username...")
        # Сначала удаляем неуникальный индекс если он есть
        try:
            op.drop_index('ix_users_username', table_name='users')
        except:
            pass  # Индекс может не существовать
        
        # Создаем уникальный индекс
        op.create_index('ix_users_username', 'users', ['username'], unique=True)
        print("Уникальный индекс для username создан")
    
    # Если уникальный индекс для email отсутствует - создаем его
    if not email_unique_exists:
        print("Создание уникального индекса для email...")
        # Сначала удаляем неуникальный индекс если он есть
        try:
            op.drop_index('ix_users_email', table_name='users')
        except:
            pass  # Индекс может не существовать
        
        # Создаем уникальный индекс
        op.create_index('ix_users_email', 'users', ['email'], unique=True)
        print("Уникальный индекс для email создан")


def downgrade():
    """
    Откатывает изменения (не рекомендуется для production)
    """
    print("Откат ограничений уникальности не рекомендуется")
    # В реальном проекте здесь можно было бы удалить ограничения,
    # но это может нарушить целостность данных 