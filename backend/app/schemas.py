from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional, List
import re
from .models import RealEstateType, UserRole

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
    telegram: str

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

    @validator('telegram')
    def validate_telegram(cls, v):
        if not v:
            raise ValueError('Telegram username не может быть пустым')
        if len(v) > 100:
            raise ValueError('Telegram username не должен превышать 100 символов')
        # Проверяем, что это либо username (@username), либо chat_id (только цифры)
        if not (v.startswith('@') or v.isdigit()):
            raise ValueError('Telegram должен быть в формате @username или chat_id (только цифры)')
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
    role: UserRole
    is_active: bool
    created_at: datetime
    email: Optional[str] = None
    telegram: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserRoleUpdate(BaseModel):
    user_id: int
    role: UserRole

class AdminUserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    telegram: str
    email: Optional[str] = None

    class Config:
        from_attributes = True

class TagBase(BaseModel):
    name: str

    @validator('name')
    def validate_tag_name(cls, v):
        if not v:
            raise ValueError('Название тега не может быть пустым')
        if len(v) > 50:
            raise ValueError('Название тега не должно превышать 50 символов')
        if not v.startswith('#'):
            v = f'#{v}'
        return v

class TagCreate(TagBase):
    pass

    @validator('name')
    def validate_tag_name(cls, v):
        if not v:
            raise ValueError('Название тега не может быть пустым')
        if len(v) > 50:
            raise ValueError('Название тега не должно превышать 50 символов')
        if not v.startswith('#'):
            v = f'#{v}'
        return v

class Tag(TagBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

    @validator('name')
    def validate_tag_name(cls, v):
        if not v:
            raise ValueError('Название тега не может быть пустым')
        if len(v) > 50:
            raise ValueError('Название тега не должно превышать 50 символов')
        if not v.startswith('#'):
            v = f'#{v}'
        return v

class CardBase(BaseModel):
    title: str
    description: str
    position: Optional[int] = None
    story_points: Optional[int] = None
    column_id: int
    assignee_id: Optional[int] = None
    approver_id: Optional[int] = None
    real_estate_type: Optional[str] = None
    rc_mk: Optional[str] = None
    rc_zm: Optional[str] = None
    tags: Optional[List[str]] = None

    @validator('tags')
    def validate_tags(cls, v):
        if v is None:
            return []
        if len(v) > 5:
            raise ValueError('Максимальное количество тегов - 5')
        
        # Обрабатываем разные типы данных
        result = []
        for tag in v:
            if isinstance(tag, str):
                # Если это строка, форматируем её
                formatted_tag = tag if tag.startswith('#') else f'#{tag}'
                result.append(formatted_tag)
            else:
                # Если это объект Tag, берём его name
                result.append(tag.name if hasattr(tag, 'name') else str(tag))
        
        return result

class CardCreate(CardBase):
    pass

    @validator('tags')
    def validate_tags(cls, v):
        if v is None:
            return []
        
        # Обрабатываем разные типы данных
        result = []
        for tag in v:
            if isinstance(tag, str):
                # Если это строка, форматируем её
                formatted_tag = tag if tag.startswith('#') else f'#{tag}'
                result.append(formatted_tag)
            else:
                # Если это объект Tag, берём его name
                result.append(tag.name if hasattr(tag, 'name') else str(tag))
        
        return result

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    story_points: Optional[int] = None
    column_id: Optional[int] = None
    assignee_id: Optional[int] = None
    approver_id: Optional[int] = None
    real_estate_type: Optional[str] = None
    rc_mk: Optional[str] = None
    rc_zm: Optional[str] = None
    tags: Optional[List[str]] = None

    @validator('tags')
    def validate_tags(cls, v):
        if v is None:
            return []
        if len(v) > 5:
            raise ValueError('Максимальное количество тегов - 5')
        
        # Обрабатываем разные типы данных
        result = []
        for tag in v:
            if isinstance(tag, str):
                # Если это строка, форматируем её
                formatted_tag = tag if tag.startswith('#') else f'#{tag}'
                result.append(formatted_tag)
            else:
                # Если это объект Tag, берём его name
                result.append(tag.name if hasattr(tag, 'name') else str(tag))
        
        return result

class Card(CardBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assignee: Optional[User] = None
    approver: Optional[User] = None
    tags: List[Tag] = []

    class Config:
        from_attributes = True

class ColumnBase(BaseModel):
    title: str
    position: int
    color: str
    wip_limit: Optional[int] = None

class ColumnCreate(ColumnBase):
    pass

class Column(ColumnBase):
    id: int
    cards: List[Card] = []

    class Config:
        from_attributes = True

class WipLimitUpdate(BaseModel):
    column_id: int
    wip_limit: Optional[int] = None

    @validator('wip_limit')
    def validate_wip_limit(cls, v):
        if v is not None and v < 1:
            raise ValueError('WIP лимит должен быть больше 0')
        return v

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

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    created_at: datetime
    ticket_id: int
    user_id: int
    user: User

    class Config:
        from_attributes = True 