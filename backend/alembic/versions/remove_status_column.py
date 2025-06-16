"""remove status column

Revision ID: remove_status_column
Revises: initial_migration
Create Date: 2024-03-16 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_status_column'
down_revision = 'initial_migration'
branch_labels = None
depends_on = None


def upgrade():
    # Удаляем колонку status из таблицы cards
    op.drop_column('cards', 'status')


def downgrade():
    # Добавляем колонку status обратно в таблицу cards
    op.add_column('cards', sa.Column('status', sa.String(), nullable=False, server_default='new')) 