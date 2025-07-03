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
    
    # Для таблицы users (минимум 1, если таблица пустая)
    result = connection.execute(sa.text("SELECT MAX(id) FROM users"))
    max_user_id = result.scalar() or 0
    seq_value = max(max_user_id, 1)
    connection.execute(sa.text(f"SELECT setval('users_id_seq', {seq_value}, true)"))
    
    # Для таблицы boards  
    result = connection.execute(sa.text("SELECT MAX(id) FROM boards"))
    max_board_id = result.scalar() or 0
    seq_value = max(max_board_id, 1)
    connection.execute(sa.text(f"SELECT setval('boards_id_seq', {seq_value}, true)"))
    
    # Для таблицы columns
    result = connection.execute(sa.text("SELECT MAX(id) FROM columns"))
    max_column_id = result.scalar() or 0
    seq_value = max(max_column_id, 1)
    connection.execute(sa.text(f"SELECT setval('columns_id_seq', {seq_value}, true)"))
    
    # Для остальных таблиц проверяем их существование и данные
    tables_sequences = [
        ('tags', 'tags_id_seq'),
        ('cards', 'cards_id_seq'),
        ('card_history', 'card_history_id_seq'),
        ('comments', 'comments_id_seq')
    ]
    
    for table_name, seq_name in tables_sequences:
        # Проверяем существование таблицы
        table_exists = connection.execute(sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table_name)"
        ), {"table_name": table_name}).scalar()
        
        if table_exists:
            result = connection.execute(sa.text(f"SELECT MAX(id) FROM {table_name}"))
            max_id = result.scalar() or 0
            seq_value = max(max_id, 1)
            connection.execute(sa.text(f"SELECT setval('{seq_name}', {seq_value}, true)"))


def downgrade():
    # Возвращаем последовательности в начальное состояние
    connection = op.get_bind()
    
    sequences = [
        'users_id_seq',
        'boards_id_seq', 
        'columns_id_seq',
        'tags_id_seq',
        'cards_id_seq',
        'card_history_id_seq',
        'comments_id_seq'
    ]
    
    for seq_name in sequences:
        # Проверяем существование sequence перед сбросом
        seq_exists = connection.execute(sa.text(
            "SELECT EXISTS (SELECT FROM pg_sequences WHERE sequencename = :seq_name)"
        ), {"seq_name": seq_name}).scalar()
        
        if seq_exists:
            connection.execute(sa.text(f"SELECT setval('{seq_name}', 1, false)")) 