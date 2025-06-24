"""Add telegram field to users and approver_id to cards

Revision ID: 006_add_telegram_and_approver
Revises: 004_fix_all_issues
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_telegram_and_approver'
down_revision = '004_fix_all_issues'
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем поле telegram в таблицу users
    op.add_column('users', sa.Column('telegram', sa.String(length=100), nullable=True))
    
    # Добавляем поле approver_id в таблицу cards
    op.add_column('cards', sa.Column('approver_id', sa.Integer(), nullable=True))
    
    # Создаем foreign key для approver_id
    op.create_foreign_key(
        'fk_cards_approver_id', 
        'cards', 
        'users', 
        ['approver_id'], 
        ['id'], 
        ondelete='SET NULL'
    )
    
    # Обновляем существующих пользователей с временным значением telegram
    # В реальной ситуации нужно будет попросить пользователей обновить свои профили
    op.execute("UPDATE users SET telegram = '@username_' || id::text WHERE telegram IS NULL")
    
    # Делаем поле telegram обязательным после заполнения данных
    op.alter_column('users', 'telegram', nullable=False)


def downgrade():
    # Удаляем foreign key
    op.drop_constraint('fk_cards_approver_id', 'cards', type_='foreignkey')
    
    # Удаляем поле approver_id из таблицы cards
    op.drop_column('cards', 'approver_id')
    
    # Удаляем поле telegram из таблицы users
    op.drop_column('users', 'telegram') 