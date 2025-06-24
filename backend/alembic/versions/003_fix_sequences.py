"""Fix sequences for autoincrement fields

Revision ID: 003
Revises: 002
Create Date: 2024-06-24 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Обновляем последовательности для всех автоинкрементных полей
    # чтобы следующие вставки не конфликтовали с уже существующими записями
    
    # Получаем максимальные ID и обновляем последовательности
    connection = op.get_bind()
    
    # Для таблицы users
    result = connection.execute(sa.text("SELECT MAX(id) FROM users"))
    max_user_id = result.scalar() or 0
    connection.execute(sa.text(f"SELECT setval('users_id_seq', {max_user_id}, true)"))
    
    # Для таблицы boards  
    result = connection.execute(sa.text("SELECT MAX(id) FROM boards"))
    max_board_id = result.scalar() or 0
    connection.execute(sa.text(f"SELECT setval('boards_id_seq', {max_board_id}, true)"))
    
    # Для таблицы columns
    result = connection.execute(sa.text("SELECT MAX(id) FROM columns"))
    max_column_id = result.scalar() or 0
    connection.execute(sa.text(f"SELECT setval('columns_id_seq', {max_column_id}, true)"))
    
    # Для таблицы tags
    result = connection.execute(sa.text("SELECT MAX(id) FROM tags"))
    max_tag_id = result.scalar() or 0
    if max_tag_id > 0:
        connection.execute(sa.text(f"SELECT setval('tags_id_seq', {max_tag_id}, true)"))
    
    # Для таблицы cards
    result = connection.execute(sa.text("SELECT MAX(id) FROM cards"))
    max_card_id = result.scalar() or 0
    if max_card_id > 0:
        connection.execute(sa.text(f"SELECT setval('cards_id_seq', {max_card_id}, true)"))
    
    # Для таблицы card_history
    result = connection.execute(sa.text("SELECT MAX(id) FROM card_history"))
    max_history_id = result.scalar() or 0
    if max_history_id > 0:
        connection.execute(sa.text(f"SELECT setval('card_history_id_seq', {max_history_id}, true)"))
    
    # Для таблицы comments
    result = connection.execute(sa.text("SELECT MAX(id) FROM comments"))
    max_comment_id = result.scalar() or 0
    if max_comment_id > 0:
        connection.execute(sa.text(f"SELECT setval('comments_id_seq', {max_comment_id}, true)"))


def downgrade():
    # Возвращаем последовательности в начальное состояние
    connection = op.get_bind()
    
    connection.execute(sa.text("SELECT setval('users_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('boards_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('columns_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('tags_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('cards_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('card_history_id_seq', 1, false)"))
    connection.execute(sa.text("SELECT setval('comments_id_seq', 1, false)")) 