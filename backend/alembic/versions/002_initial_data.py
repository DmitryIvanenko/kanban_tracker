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
    # Миграция 002 теперь пустая - все данные создаются в миграции 009
    # после создания администратора
    pass


def downgrade():
    # Ничего не делаем при откате
    pass 