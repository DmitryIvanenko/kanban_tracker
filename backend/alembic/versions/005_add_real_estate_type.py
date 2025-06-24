"""Add real_estate_type field to cards table

Revision ID: 005
Revises: 004
Create Date: 2024-12-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

# Определяем типы недвижимости
REAL_ESTATE_TYPES = [
    'офис',
    'здание',
    'встроенные помещения',
    'производственная недвижимость',
    'складские помещения',
    'торговая недвижимость',
    'отели',
    'иная недвижимость'
]

def upgrade():
    # Создаем enum тип для типов недвижимости
    real_estate_type_enum = postgresql.ENUM(
        *REAL_ESTATE_TYPES,
        name='real_estate_type_enum'
    )
    real_estate_type_enum.create(op.get_bind())
    
    # Добавляем новое поле в таблицу cards
    op.add_column('cards', 
        sa.Column('real_estate_type', 
                  sa.Enum(*REAL_ESTATE_TYPES, name='real_estate_type_enum'),
                  nullable=True,
                  comment='Тип недвижимости для тикета'))

def downgrade():
    # Удаляем колонку
    op.drop_column('cards', 'real_estate_type')
    
    # Удаляем enum тип
    op.execute('DROP TYPE IF EXISTS real_estate_type_enum') 