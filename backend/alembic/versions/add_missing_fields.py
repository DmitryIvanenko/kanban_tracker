"""add missing fields and tables

Revision ID: 003
Revises: 002
Create Date: 2024-06-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    # Получаем соединение для проверки существования объектов
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    # 1. Проверяем и исправляем поле is_admin на is_active в таблице users
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'is_admin' in users_columns and 'is_active' not in users_columns:
        # Если есть is_admin, но нет is_active - переименовываем
        op.alter_column('users', 'is_admin', new_column_name='is_active')
    elif 'is_active' not in users_columns:
        # Если нет ни того, ни другого - добавляем is_active
        op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=True, default=True))
        op.execute("UPDATE users SET is_active = TRUE WHERE is_active IS NULL")
    
    # 2. Добавляем недостающие поля в таблицу cards
    cards_columns = [col['name'] for col in inspector.get_columns('cards')]
    
    if 'story_points' not in cards_columns:
        op.add_column('cards', sa.Column('story_points', sa.Integer(), nullable=True))
    
    if 'created_by' not in cards_columns:
        op.add_column('cards', sa.Column('created_by', sa.Integer(), nullable=True))
        # Добавляем внешний ключ для created_by
        try:
            op.create_foreign_key(
                'fk_cards_created_by', 'cards', 'users', 
                ['created_by'], ['id']
            )
        except:
            # Если внешний ключ уже существует, игнорируем
            pass
    
    if 'updated_at' not in cards_columns:
        op.add_column('cards', sa.Column('updated_at', sa.DateTime(), nullable=True))
        # Устанавливаем значения по умолчанию для существующих записей
        op.execute("UPDATE cards SET updated_at = created_at WHERE updated_at IS NULL")
    
    # 3. Добавляем поле color в таблицу columns
    columns_columns = [col['name'] for col in inspector.get_columns('columns')]
    
    if 'color' not in columns_columns:
        op.add_column('columns', sa.Column('color', sa.String(7), nullable=True, default='#FFFFFF'))
        op.execute("UPDATE columns SET color = '#FFFFFF' WHERE color IS NULL")
    
    # 4. Создаем таблицу comments если её нет
    existing_tables = inspector.get_table_names()
    
    if 'comments' not in existing_tables:
        op.create_table(
            'comments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('content', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
            sa.Column('ticket_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['ticket_id'], ['cards.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id')
        )

def downgrade():
    # Получаем соединение для проверки существования объектов
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_tables = inspector.get_table_names()
    
    # 4. Удаляем таблицу comments если она существует
    if 'comments' in existing_tables:
        op.drop_table('comments')
    
    # 3. Удаляем поле color из таблицы columns если оно существует
    columns_columns = [col['name'] for col in inspector.get_columns('columns')]
    if 'color' in columns_columns:
        op.drop_column('columns', 'color')
    
    # 2. Удаляем добавленные поля из таблицы cards
    cards_columns = [col['name'] for col in inspector.get_columns('cards')]
    
    if 'created_by' in cards_columns:
        try:
            op.drop_constraint('fk_cards_created_by', 'cards', type_='foreignkey')
        except:
            pass
        op.drop_column('cards', 'created_by')
    
    if 'updated_at' in cards_columns:
        op.drop_column('cards', 'updated_at')
    
    if 'story_points' in cards_columns:
        op.drop_column('cards', 'story_points')
    
    # 1. Возвращаем поле is_admin в таблицу users
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'is_active' in users_columns and 'is_admin' not in users_columns:
        op.alter_column('users', 'is_active', new_column_name='is_admin') 