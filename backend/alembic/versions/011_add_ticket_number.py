"""Add ticket_number field to cards table

Revision ID: 011
Revises: 010
Create Date: 2024-12-19 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    """
    Добавляет поле ticket_number в таблицу cards и заполняет его значениями
    для существующих записей в формате CMD-0000001, CMD-0000002 и т.д.
    """
    connection = op.get_bind()
    
    # 1. Добавляем поле ticket_number как nullable сначала
    print("Добавление поля ticket_number...")
    op.add_column('cards', 
        sa.Column('ticket_number', 
                  sa.String(20), 
                  nullable=True,
                  comment='Уникальный номер тикета в формате CMD-0000001'))
    
    # 2. Заполняем существующие записи номерами тикетов
    print("Заполнение номеров тикетов для существующих записей...")
    
    # Получаем все существующие карточки, отсортированные по id
    result = connection.execute(text("SELECT id FROM cards ORDER BY id"))
    cards = result.fetchall()
    
    # Заполняем ticket_number для каждой карточки
    for index, card in enumerate(cards, start=1):
        ticket_number = f"CMD-{index:07d}"
        connection.execute(
            text("UPDATE cards SET ticket_number = :ticket_number WHERE id = :card_id"),
            {"ticket_number": ticket_number, "card_id": card[0]}
        )
        print(f"Карточка ID {card[0]} получила номер {ticket_number}")
    
    # 3. Теперь делаем поле NOT NULL и добавляем уникальный индекс
    print("Настройка ограничений для поля ticket_number...")
    op.alter_column('cards', 'ticket_number', nullable=False)
    op.create_index('ix_cards_ticket_number', 'cards', ['ticket_number'], unique=True)
    
    print(f"Успешно добавлено поле ticket_number для {len(cards)} записей")


def downgrade():
    """
    Удаляет поле ticket_number из таблицы cards
    """
    print("Удаление поля ticket_number...")
    op.drop_index('ix_cards_ticket_number', table_name='cards')
    op.drop_column('cards', 'ticket_number')
    print("Поле ticket_number удалено") 