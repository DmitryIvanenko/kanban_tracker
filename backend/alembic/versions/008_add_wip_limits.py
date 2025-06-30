"""Add WIP limits to columns

Revision ID: 008
Revises: 007
Create Date: 2025-06-30 07:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    """Add wip_limit column to columns table"""
    
    # Добавляем поле wip_limit в таблицу columns
    op.add_column('columns', 
        sa.Column('wip_limit', 
                  sa.Integer(),
                  nullable=True,
                  comment='WIP лимит для колонки (Work In Progress)')
    )


def downgrade():
    """Remove wip_limit column from columns table"""
    
    # Удаляем поле wip_limit из таблицы columns
    op.drop_column('columns', 'wip_limit') 