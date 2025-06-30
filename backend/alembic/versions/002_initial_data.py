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

    # Создаем основную доску - owner_id будет установлен позже через миграцию 009
    # которая создает администратора из переменных окружения
    op.bulk_insert(boards_table, [
        {
            'id': 1,
            'title': 'Основная доска',
            'description': 'Основная канбан доска',
            'owner_id': 1,  # Временный owner_id, будет обновлен после создания админа
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