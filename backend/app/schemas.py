from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional, List
import re

class LoginRequest(BaseModel):
    username: str
    password: str

class CardMove(BaseModel):
    from_column: int
    to_column: int
    new_position: int

class CardHistoryBase(BaseModel):
    action: str
    details: str

class CardHistory(CardHistoryBase):
    id: int
    card_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

    @validator('username')
    def validate_username(cls, v):
        if not v:
            raise ValueError('Имя пользователя не может быть пустым')
        if len(v) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(v) > 50:
            raise ValueError('Имя пользователя не должно превышать 50 символов')
        if not re.match(r'^[a-zA-Zа-яА-ЯёЁ0-9_\s-]+$', v):
            raise ValueError('Имя пользователя может содержать только буквы, цифры, пробелы, дефис и подчеркивание')
        return v

class UserCreate(UserBase):
    password: str

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Пароль не может быть пустым')
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        return v

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    email: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class CardBase(BaseModel):
    title: str
    description: str
    position: Optional[int] = None
    story_points: Optional[int] = None
    column_id: int
    assignee_id: Optional[int] = None

class CardCreate(CardBase):
    pass

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    story_points: Optional[int] = None
    column_id: Optional[int] = None
    assignee_id: Optional[int] = None

class Card(CardBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assignee: Optional[User] = None

    class Config:
        from_attributes = True

class ColumnBase(BaseModel):
    title: str
    position: int
    color: str

class ColumnCreate(ColumnBase):
    pass

class Column(ColumnBase):
    id: int
    cards: List[Card] = []

    class Config:
        from_attributes = True

class BoardBase(BaseModel):
    title: str

class BoardCreate(BoardBase):
    pass

class Board(BoardBase):
    id: int
    owner_id: int
    created_at: datetime
    columns: List[Column] = []

    class Config:
        from_attributes = True 