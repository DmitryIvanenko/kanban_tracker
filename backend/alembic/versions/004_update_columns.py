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
    # Эта миграция теперь пустая - обновления колонок будут в миграции 009
    # после создания доски и базовых колонок
    pass


def downgrade():
    # Ничего не делаем при откате
    pass 