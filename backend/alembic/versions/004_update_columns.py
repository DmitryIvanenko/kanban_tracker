"""Update column names and add approval column

Revision ID: 004
Revises: 003
Create Date: 2024-06-24 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Определяем таблицу колонок для обновления
    columns_table = table('columns',
        column('id', sa.Integer),
        column('title', sa.String),
        column('position', sa.Integer),
        column('color', sa.String),
        column('board_id', sa.Integer)
    )

    # Переименовываем существующие столбцы
    op.execute(
        "UPDATE columns SET title = 'Бэклог' WHERE title = 'Backlog'"
    )
    op.execute(
        "UPDATE columns SET title = 'В работе' WHERE title = 'In Progress'"
    )
    op.execute(
        "UPDATE columns SET title = 'Готово' WHERE title = 'Done'"
    )
    
    # Обновляем позицию столбца "Готово" чтобы освободить место для нового столбца
    op.execute(
        "UPDATE columns SET position = 3 WHERE title = 'Готово'"
    )
    
    # Добавляем новый столбец "На согласовании"
    op.bulk_insert(columns_table, [
        {
            'id': 4,
            'title': 'На согласовании',
            'position': 2,
            'color': '#FFA726',  # Оранжевый цвет для выделения
            'board_id': 1
        }
    ])


def downgrade():
    # Удаляем новый столбец "На согласовании"
    op.execute("DELETE FROM columns WHERE title = 'На согласовании'")
    
    # Возвращаем позицию столбца "Готово" обратно
    op.execute(
        "UPDATE columns SET position = 2 WHERE title = 'Готово'"
    )
    
    # Возвращаем старые названия столбцов
    op.execute(
        "UPDATE columns SET title = 'Backlog' WHERE title = 'Бэклог'"
    )
    op.execute(
        "UPDATE columns SET title = 'In Progress' WHERE title = 'В работе'"
    )
    op.execute(
        "UPDATE columns SET title = 'Done' WHERE title = 'Готово'"
    ) 