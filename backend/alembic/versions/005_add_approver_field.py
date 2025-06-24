"""add approver field to cards

Revision ID: 005
Revises: 004
Create Date: 2025-06-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

def upgrade():
    """Добавляем поле approver_id в таблицу cards"""
    print("🔧 Добавляем поле 'Согласующий' в тикеты...")
    
    # Добавляем столбец approver_id
    op.add_column('cards', sa.Column('approver_id', sa.Integer(), nullable=True))
    
    # Создаем внешний ключ к таблице users
    op.create_foreign_key(
        'cards_approver_id_fkey',
        'cards',
        'users',
        ['approver_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    print("  ✅ Поле approver_id успешно добавлено в таблицу cards")

def downgrade():
    """Удаляем поле approver_id из таблицы cards"""
    print("🔄 Откатываем добавление поля 'Согласующий'...")
    
    # Удаляем внешний ключ
    op.drop_constraint('cards_approver_id_fkey', 'cards', type_='foreignkey')
    
    # Удаляем столбец
    op.drop_column('cards', 'approver_id')
    
    print("  ✅ Поле approver_id успешно удалено из таблицы cards") 