from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, Table, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from datetime import datetime
import enum

class RealEstateType(enum.Enum):
    OFFICE = "офис"
    BUILDING = "здание"
    BUILT_IN_PREMISES = "встроенные помещения"
    INDUSTRIAL_REAL_ESTATE = "производственная недвижимость"
    WAREHOUSE_PREMISES = "складские помещения"
    COMMERCIAL_REAL_ESTATE = "торговая недвижимость"
    HOTELS = "отели"
    OTHER_REAL_ESTATE = "иная недвижимость"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(100), nullable=False)
    telegram = Column(String(100), nullable=False)  # Telegram username или chat_id (обязательное поле)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    boards = relationship("Board", back_populates="owner")
    assigned_cards = relationship("Card", foreign_keys="Card.assignee_id", back_populates="assignee")
    approved_cards = relationship("Card", foreign_keys="Card.approver_id", back_populates="approver")
    created_cards = relationship("Card", foreign_keys="Card.created_by", back_populates="creator")
    comments = relationship("Comment", back_populates="user")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="boards")
    columns = relationship("KanbanColumn", back_populates="board", cascade="all, delete-orphan")

class KanbanColumn(Base):
    __tablename__ = "columns"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    position = Column(Integer, nullable=False)
    color = Column(String(7), default="#FFFFFF")
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    
    board = relationship("Board", back_populates="columns")
    cards = relationship("Card", back_populates="column", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cards = relationship("Card", secondary="card_tags", back_populates="tags")

class CardTag(Base):
    __tablename__ = "card_tags"

    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    position = Column(Integer)
    story_points = Column(Integer)
    column_id = Column(Integer, ForeignKey("columns.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"))
    approver_id = Column(Integer, ForeignKey("users.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    real_estate_type = Column(Enum(
        'офис',
        'здание',
        'встроенные помещения',
        'производственная недвижимость',
        'складские помещения',
        'торговая недвижимость',
        'отели',
        'иная недвижимость',
        name='real_estate_type_enum'
    ), nullable=True, comment="Тип недвижимости")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    column = relationship("KanbanColumn", back_populates="cards")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_cards")
    approver = relationship("User", foreign_keys=[approver_id], back_populates="approved_cards")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_cards")
    history = relationship("CardHistory", back_populates="card", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="card_tags", back_populates="cards")

class CardHistory(Base):
    __tablename__ = "card_history"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    card = relationship("Card", back_populates="history")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    ticket = relationship("Card", back_populates="comments")
    user = relationship("User", back_populates="comments") 