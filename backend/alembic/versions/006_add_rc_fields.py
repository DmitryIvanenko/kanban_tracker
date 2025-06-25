"""Add rc_mk and rc_zm fields to cards table

Revision ID: 006
Revises: 005
Create Date: 2024-12-19 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None

# Определяем значения для РЦ полей
RC_VALUES = [
    'Центр',
    'Юг',
    'Урал',
    'Сибирь'
]

def upgrade():
    # Создаем enum типы для РЦ МК и РЦ ЗМ
    rc_mk_enum = postgresql.ENUM(
        *RC_VALUES,
        name='rc_mk_enum'
    )
    rc_mk_enum.create(op.get_bind())
    
    rc_zm_enum = postgresql.ENUM(
        *RC_VALUES,
        name='rc_zm_enum'
    )
    rc_zm_enum.create(op.get_bind())
    
    # Добавляем новые поля в таблицу cards
    op.add_column('cards', 
        sa.Column('rc_mk', 
                  sa.Enum(*RC_VALUES, name='rc_mk_enum'),
                  nullable=True,
                  comment='РЦ МК'))
    
    op.add_column('cards', 
        sa.Column('rc_zm', 
                  sa.Enum(*RC_VALUES, name='rc_zm_enum'),
                  nullable=True,
                  comment='РЦ ЗМ'))

def downgrade():
    # Удаляем колонки
    op.drop_column('cards', 'rc_mk')
    op.drop_column('cards', 'rc_zm')
    
    # Удаляем enum типы
    op.execute('DROP TYPE IF EXISTS rc_mk_enum')
    op.execute('DROP TYPE IF EXISTS rc_zm_enum') 