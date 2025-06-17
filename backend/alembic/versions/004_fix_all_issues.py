"""fix all database issues: types, constraints, cascade delete

Revision ID: 004
Revises: 003
Create Date: 2024-01-01 00:00:04.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    # Создаем инспектор для проверки существования столбцов
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    print("🔧 Fixing all database issues...")
    
    # 1. Исправляем каскадное удаление для card_history
    print("1. Fixing cascade delete for card_history...")
    try:
        # Удаляем старое ограничение внешнего ключа
        op.drop_constraint('card_history_card_id_fkey', 'card_history', type_='foreignkey')
        
        # Создаем новое ограничение с CASCADE
        op.create_foreign_key(
            'card_history_card_id_fkey',
            'card_history',
            'cards',
            ['card_id'],
            ['id'],
            ondelete='CASCADE'
        )
        print("  ✅ Fixed cascade delete for card_history")
    except Exception as e:
        print(f"  ⚠️  card_history cascade already correct: {e}")
    
    # 2. Исправляем таблицу users
    print("2. Fixing users table...")
    
    # Проверяем существование столбца is_admin
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'is_admin' in users_columns:
        # Переименовываем is_admin в is_active
        op.alter_column('users', 'is_admin', new_column_name='is_active')
        print("  ✅ Renamed is_admin to is_active")
    
    # Устанавливаем NOT NULL для обязательных полей и ограничения длины
    try:
        # username - делаем NOT NULL и ограничиваем длину
        op.alter_column('users', 'username',
                       existing_type=sa.String(),
                       type_=sa.String(50),
                       nullable=False)
        print("  ✅ Fixed username: String(50), NOT NULL")
    except Exception as e:
        print(f"  ⚠️  username already correct: {e}")
    
    try:
        # email - ограничиваем длину (nullable=True остается)
        op.alter_column('users', 'email',
                       existing_type=sa.String(),
                       type_=sa.String(100),
                       nullable=True)
        print("  ✅ Fixed email: String(100)")
    except Exception as e:
        print(f"  ⚠️  email already correct: {e}")
    
    try:
        # hashed_password - делаем NOT NULL и ограничиваем длину
        op.alter_column('users', 'hashed_password',
                       existing_type=sa.String(),
                       type_=sa.String(100),
                       nullable=False)
        print("  ✅ Fixed hashed_password: String(100), NOT NULL")
    except Exception as e:
        print(f"  ⚠️  hashed_password already correct: {e}")
    
    try:
        # is_active - устанавливаем значение по умолчанию и NOT NULL
        op.alter_column('users', 'is_active',
                       existing_type=sa.Boolean(),
                       nullable=False,
                       server_default=sa.text('true'))
        print("  ✅ Fixed is_active: Boolean, NOT NULL, default=true")
    except Exception as e:
        print(f"  ⚠️  is_active already correct: {e}")
    
    # 3. Исправляем таблицу boards
    print("3. Fixing boards table...")
    
    try:
        # title - делаем NOT NULL и ограничиваем длину
        op.alter_column('boards', 'title',
                       existing_type=sa.String(),
                       type_=sa.String(255),
                       nullable=False)
        print("  ✅ Fixed title: String(255), NOT NULL")
    except Exception as e:
        print(f"  ⚠️  title already correct: {e}")
    
    try:
        # owner_id - делаем NOT NULL
        op.alter_column('boards', 'owner_id',
                       existing_type=sa.Integer(),
                       nullable=False)
        print("  ✅ Fixed owner_id: NOT NULL")
    except Exception as e:
        print(f"  ⚠️  owner_id already correct: {e}")
    
    # 4. Исправляем таблицу columns
    print("4. Fixing columns table...")
    
    try:
        # title - делаем NOT NULL и ограничиваем длину
        op.alter_column('columns', 'title',
                       existing_type=sa.String(),
                       type_=sa.String(255),
                       nullable=False)
        print("  ✅ Fixed title: String(255), NOT NULL")
    except Exception as e:
        print(f"  ⚠️  title already correct: {e}")
    
    try:
        # position - делаем NOT NULL
        op.alter_column('columns', 'position',
                       existing_type=sa.Integer(),
                       nullable=False)
        print("  ✅ Fixed position: NOT NULL")
    except Exception as e:
        print(f"  ⚠️  position already correct: {e}")
    
    try:
        # board_id - делаем NOT NULL
        op.alter_column('columns', 'board_id',
                       existing_type=sa.Integer(),
                       nullable=False)
        print("  ✅ Fixed board_id: NOT NULL")
    except Exception as e:
        print(f"  ⚠️  board_id already correct: {e}")
    
    # 5. Исправляем таблицу cards
    print("5. Fixing cards table...")
    
    try:
        # title - уже NOT NULL в модели, но проверим
        op.alter_column('cards', 'title',
                       existing_type=sa.String(),
                       nullable=False)
        print("  ✅ Fixed title: NOT NULL")
    except Exception as e:
        print(f"  ⚠️  title already correct: {e}")
    
    try:
        # column_id - делаем NOT NULL
        op.alter_column('cards', 'column_id',
                       existing_type=sa.Integer(),
                       nullable=False)
        print("  ✅ Fixed column_id: NOT NULL")
    except Exception as e:
        print(f"  ⚠️  column_id already correct: {e}")
    
    # Исправляем типы DateTime для cards (убираем timezone)
    try:
        op.alter_column('cards', 'created_at',
                       existing_type=sa.DateTime(timezone=True),
                       type_=sa.DateTime(),
                       server_default=sa.text('now()'))
        print("  ✅ Fixed created_at: DateTime without timezone")
    except Exception as e:
        print(f"  ⚠️  created_at already correct: {e}")
    
    # 6. Исправляем таблицу comments (если существует)
    comments_tables = inspector.get_table_names()
    if 'comments' in comments_tables:
        print("6. Fixing comments table...")
        
        try:
            # content - делаем NOT NULL
            op.alter_column('comments', 'content',
                           existing_type=sa.String(),
                           nullable=False)
            print("  ✅ Fixed content: NOT NULL")
        except Exception as e:
            print(f"  ⚠️  content already correct: {e}")
        
        try:
            # ticket_id - делаем NOT NULL
            op.alter_column('comments', 'ticket_id',
                           existing_type=sa.Integer(),
                           nullable=False)
            print("  ✅ Fixed ticket_id: NOT NULL")
        except Exception as e:
            print(f"  ⚠️  ticket_id already correct: {e}")
        
        try:
            # user_id - делаем NOT NULL
            op.alter_column('comments', 'user_id',
                           existing_type=sa.Integer(),
                           nullable=False)
            print("  ✅ Fixed user_id: NOT NULL")
        except Exception as e:
            print(f"  ⚠️  user_id already correct: {e}")
        
        # Исправляем тип DateTime для comments (убираем timezone)
        try:
            op.alter_column('comments', 'created_at',
                           existing_type=sa.DateTime(timezone=True),
                           type_=sa.DateTime(),
                           server_default=sa.text('now()'))
            print("  ✅ Fixed created_at: DateTime without timezone")
        except Exception as e:
            print(f"  ⚠️  created_at already correct: {e}")
    
    # 7. Исправляем таблицу tags (если существует)
    if 'tags' in comments_tables:
        print("7. Fixing tags table...")
        
        try:
            # name - делаем NOT NULL и ограничиваем длину
            op.alter_column('tags', 'name',
                           existing_type=sa.String(),
                           type_=sa.String(50),
                           nullable=False)
            print("  ✅ Fixed name: String(50), NOT NULL")
        except Exception as e:
            print(f"  ⚠️  name already correct: {e}")
    
    print("🎉 All database issues fixed successfully!")

def downgrade():
    # Откатываем изменения в обратном порядке
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()
    
    print("🔄 Rolling back all database fixes...")
    
    # 1. Откатываем tags
    if 'tags' in tables:
        op.alter_column('tags', 'name',
                       existing_type=sa.String(50),
                       type_=sa.String(),
                       nullable=True)
    
    # 2. Откатываем comments
    if 'comments' in tables:
        op.alter_column('comments', 'created_at',
                       existing_type=sa.DateTime(),
                       type_=sa.DateTime(timezone=True))
        op.alter_column('comments', 'user_id',
                       existing_type=sa.Integer(),
                       nullable=True)
        op.alter_column('comments', 'ticket_id',
                       existing_type=sa.Integer(),
                       nullable=True)
        op.alter_column('comments', 'content',
                       existing_type=sa.String(),
                       nullable=True)
    
    # 3. Откатываем cards
    op.alter_column('cards', 'created_at',
                   existing_type=sa.DateTime(),
                   type_=sa.DateTime(timezone=True))
    op.alter_column('cards', 'column_id',
                   existing_type=sa.Integer(),
                   nullable=True)
    op.alter_column('cards', 'title',
                   existing_type=sa.String(),
                   nullable=True)
    
    # 4. Откатываем columns
    op.alter_column('columns', 'board_id',
                   existing_type=sa.Integer(),
                   nullable=True)
    op.alter_column('columns', 'position',
                   existing_type=sa.Integer(),
                   nullable=True)
    op.alter_column('columns', 'title',
                   existing_type=sa.String(255),
                   type_=sa.String(),
                   nullable=True)
    
    # 5. Откатываем boards
    op.alter_column('boards', 'owner_id',
                   existing_type=sa.Integer(),
                   nullable=True)
    op.alter_column('boards', 'title',
                   existing_type=sa.String(255),
                   type_=sa.String(),
                   nullable=True)
    
    # 6. Откатываем users
    op.alter_column('users', 'is_active',
                   existing_type=sa.Boolean(),
                   nullable=True,
                   server_default=None)
    op.alter_column('users', 'hashed_password',
                   existing_type=sa.String(100),
                   type_=sa.String(),
                   nullable=True)
    op.alter_column('users', 'email',
                   existing_type=sa.String(100),
                   type_=sa.String(),
                   nullable=True)
    op.alter_column('users', 'username',
                   existing_type=sa.String(50),
                   type_=sa.String(),
                   nullable=True)
    
    # Переименовываем обратно is_active в is_admin
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'is_active' in users_columns:
        op.alter_column('users', 'is_active', new_column_name='is_admin')
    
    # 7. Откатываем cascade delete для card_history
    op.drop_constraint('card_history_card_id_fkey', 'card_history', type_='foreignkey')
    
    # Восстанавливаем старое ограничение без CASCADE
    op.create_foreign_key(
        'card_history_card_id_fkey',
        'card_history',
        'cards',
        ['card_id'],
        ['id']
    )
    
    print("🔄 Rollback completed!") 