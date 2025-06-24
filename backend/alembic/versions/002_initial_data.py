"""Add initial data

Revision ID: 002
Revises: 001
Create Date: 2024-06-24 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Определяем таблицы для вставки данных
    users_table = table('users',
        column('id', sa.Integer),
        column('username', sa.String),
        column('email', sa.String),
        column('hashed_password', sa.String),
        column('telegram', sa.String),
        column('is_active', sa.Boolean),
        column('created_at', sa.DateTime)
    )
    
    boards_table = table('boards',
        column('id', sa.Integer),
        column('title', sa.String),
        column('description', sa.String),
        column('owner_id', sa.Integer),
        column('created_at', sa.DateTime)
    )
    
    columns_table = table('columns',
        column('id', sa.Integer),
        column('title', sa.String),
        column('position', sa.Integer),
        column('color', sa.String),
        column('board_id', sa.Integer)
    )

    # Создаем администратора
    # Хеш пароля "admin" с использованием bcrypt (12 rounds)
    admin_password_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3CqO11Wd/.gCUEKTSjVcOYzVfbVeJqNKjE."
    
    op.bulk_insert(users_table, [
        {
            'id': 1,
            'username': 'admin',
            'email': None,
            'hashed_password': admin_password_hash,
            'telegram': '@admin',
            'is_active': True,
            'created_at': datetime.utcnow()
        }
    ])

    # Создаем основную доску
    op.bulk_insert(boards_table, [
        {
            'id': 1,
            'title': 'Основная доска',
            'description': 'Основная канбан доска',
            'owner_id': 1,
            'created_at': datetime.utcnow()
        }
    ])

    # Создаем колонки
    op.bulk_insert(columns_table, [
        {
            'id': 1,
            'title': 'Backlog',
            'position': 0,
            'color': '#FF6B6B',
            'board_id': 1
        },
        {
            'id': 2,
            'title': 'In Progress',
            'position': 1,
            'color': '#4ECDC4',
            'board_id': 1
        },
        {
            'id': 3,
            'title': 'Done',
            'position': 2,
            'color': '#45B7D1',
            'board_id': 1
        }
    ])


def downgrade():
    # Удаляем данные в обратном порядке
    op.execute("DELETE FROM columns WHERE board_id = 1")
    op.execute("DELETE FROM boards WHERE id = 1")
    op.execute("DELETE FROM users WHERE id = 1") 