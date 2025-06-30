"""Add user roles

Revision ID: 007
Revises: 006
Create Date: 2024-12-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None

# Определяем значения для ролей пользователей
USER_ROLES = [
    'USER',
    'CURATOR', 
    'ADMIN'
]

def upgrade():
    # Создаем enum тип для ролей пользователей
    user_role_enum = postgresql.ENUM(
        *USER_ROLES,
        name='userrole'
    )
    user_role_enum.create(op.get_bind())
    
    # Добавляем поле role в таблицу users
    op.add_column('users', 
        sa.Column('role', 
                  sa.Enum(*USER_ROLES, name='userrole'),
                  nullable=False,
                  server_default='USER',
                  comment='Роль пользователя'))
    
    # Создаем первого admin пользователя, если таблица users не пустая
    connection = op.get_bind()
    
    # Проверяем, есть ли пользователи в таблице
    result = connection.execute(sa.text("SELECT COUNT(*) FROM users")).fetchone()
    
    if result[0] > 0:
        # Назначаем первому пользователю роль admin
        connection.execute(sa.text("""
            UPDATE users 
            SET role = 'ADMIN' 
            WHERE id = (SELECT MIN(id) FROM users)
        """))

def downgrade():
    # Удаляем колонку role
    op.drop_column('users', 'role')
    
    # Удаляем enum тип
    op.execute('DROP TYPE IF EXISTS userrole') 