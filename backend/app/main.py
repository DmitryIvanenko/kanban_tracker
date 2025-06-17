from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from jose import JWTError, jwt
from passlib.context import CryptContext
from loguru import logger
from . import models, schemas
from .database import get_db, engine
from .init_db import init_db
from typing import List, Optional
import logging
import json
from .auth import get_current_user, create_access_token, verify_password

# Создаем таблицы в базе данных
models.Base.metadata.create_all(bind=engine)

# Инициализируем базу данных
init_db()

# Настройки JWT
SECRET_KEY = "your-secret-key"  # В продакшене использовать безопасный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройка хеширования паролей
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app = FastAPI(
    title="Kanban Tracker API",
    description="API для управления задачами и проектами",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/api/auth/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Начало регистрации пользователя: {user.username}")
    
    # Проверяем, существует ли пользователь с таким username (регистронезависимо)
    logger.info(f"Проверка существования пользователя с username: {user.username}")
    db_user = db.query(models.User).filter(
        func.lower(models.User.username) == func.lower(user.username)
    ).first()
    
    if db_user:
        logger.warning(f"Пользователь с username {user.username} уже существует")
        logger.warning(f"Детали существующего пользователя: id={db_user.id}, username={db_user.username}, created_at={db_user.created_at}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Пользователь с именем '{user.username}' уже существует"
        )
    
    logger.info(f"Создание нового пользователя: {user.username}")
    # Создаем нового пользователя
    hashed_password = get_password_hash(user.password)
    logger.info(f"Пароль захеширован для пользователя {user.username}")
    
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        is_active=True
    )
    
    try:
        logger.info(f"Добавление пользователя в базу данных: {user.username}")
        db.add(db_user)
        db.commit()
        logger.info(f"Пользователь успешно добавлен в базу данных: {user.username}")
        db.refresh(db_user)
        logger.info(f"Пользователь успешно зарегистрирован: {user.username}")
        return db_user
    except Exception as e:
        logger.error(f"Ошибка при регистрации пользователя {user.username}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при регистрации пользователя: {str(e)}"
        )

@app.post("/api/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        logger.info(f"Попытка входа пользователя: {login_data.username}")
        
        # Проверяем существование пользователя (регистронезависимо)
        user = db.query(models.User).filter(
            func.lower(models.User.username) == func.lower(login_data.username)
        ).first()
        
        if not user:
            logger.error(f"Пользователь {login_data.username} не найден")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Найден пользователь: {user.username}")
        
        is_valid = verify_password(login_data.password, user.hashed_password)
        logger.info(f"Результат проверки пароля: {is_valid}")
        
        if not is_valid:
            logger.error(f"Неверный пароль для пользователя {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Успешный вход пользователя {login_data.username}")
        access_token = create_access_token(data={"sub": user.username})
        logger.info(f"Создан токен для пользователя {login_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при входе: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Kanban Tracker API"}

@app.get("/api/columns")
async def get_columns(db: Session = Depends(get_db)):
    columns = db.query(models.KanbanColumn).all()
    # Загружаем карточки для каждой колонки
    for column in columns:
        column.cards = db.query(models.Card).filter(models.Card.column_id == column.id).all()
        # Загружаем информацию об исполнителях для каждой карточки
        for card in column.cards:
            if card.assignee_id:
                card.assignee = db.query(models.User).filter(models.User.id == card.assignee_id).first()
    return columns

@app.get("/api/columns/{column_id}")
async def get_column(column_id: int, db: Session = Depends(get_db)):
    column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Колонка не найдена")
    return column

@app.post("/api/cards", response_model=schemas.Card)
async def create_card(card: schemas.CardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        logger.info(f"Начало создания тикета. Данные: {card.dict()}")
        
        # Проверяем существование колонки
        column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == card.column_id).first()
        if not column:
            raise HTTPException(status_code=404, detail="Колонка не найдена")
        logger.info(f"Колонка найдена: {column.id}")

        # Проверяем существование исполнителя, если он указан
        assignee = None
        if card.assignee_id:
            assignee = db.query(models.User).filter(models.User.id == card.assignee_id).first()
            if not assignee:
                raise HTTPException(status_code=404, detail="Исполнитель не найден")
            logger.info(f"Исполнитель найден: {assignee.username}")

        # Создаем новую карточку
        db_card = models.Card(
            title=card.title,
            description=card.description,
            position=card.position,
            story_points=card.story_points,
            column_id=card.column_id,
            assignee_id=card.assignee_id,
            created_by=current_user.id
        )
        
        db.add(db_card)
        db.commit()
        db.refresh(db_card)
        
        # Создаем запись в истории
        history_entry = models.CardHistory(
            card_id=db_card.id,
            action="created",
            details=json.dumps({
                "title": card.title,
                "description": card.description,
                "position": card.position,
                "story_points": card.story_points,
                "column_id": card.column_id,
                "assignee_id": card.assignee_id
            })
        )
        db.add(history_entry)
        db.commit()
        
        # Формируем ответ
        response_data = {
            "id": db_card.id,
            "title": db_card.title,
            "description": db_card.description,
            "position": db_card.position,
            "story_points": db_card.story_points,
            "column_id": db_card.column_id,
            "assignee_id": db_card.assignee_id,
            "created_at": db_card.created_at,
            "updated_at": db_card.updated_at
        }
        
        if assignee:
            response_data["assignee"] = {
                "id": assignee.id,
                "username": assignee.username,
                "is_active": assignee.is_active,
                "created_at": assignee.created_at
            }
        
        return response_data
    except Exception as e:
        logger.error(f"Неожиданная ошибка при создании тикета: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cards/{card_id}/move")
async def move_card(
    card_id: int,
    move_data: schemas.CardMove,
    db: Session = Depends(get_db)
):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    
    # Проверяем существование колонки назначения
    target_column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == move_data.to_column).first()
    if not target_column:
        raise HTTPException(status_code=404, detail="Колонка назначения не найдена")
    
    # Создаем запись в истории
    history_entry = models.CardHistory(
        card_id=card_id,
        action="move",
        details=f"Перемещена из колонки {card.column_id} в колонку {move_data.to_column}"
    )
    db.add(history_entry)
    
    # Обновляем позицию карточки
    card.column_id = move_data.to_column
    card.position = move_data.new_position
    
    db.commit()
    return {"message": "Карточка успешно перемещена"}

@app.get("/api/cards/{card_id}/history")
async def get_card_history(
    card_id: int,
    db: Session = Depends(get_db)
):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
        
    history = db.query(models.CardHistory)\
        .filter(models.CardHistory.card_id == card_id)\
        .order_by(models.CardHistory.created_at.desc())\
        .all()
    return history

@app.get("/api/auth/me", response_model=schemas.User)
async def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[schemas.User])
async def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

@app.get("/api/statistics")
async def get_statistics(
    assignee_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        # Базовый запрос для карточек
        query = db.query(models.Card)
        
        # Применяем фильтры
        if assignee_id:
            query = query.filter(models.Card.assignee_id == assignee_id)
        if start_date:
            query = query.filter(models.Card.created_at >= start_date)
        if end_date:
            query = query.filter(models.Card.created_at <= end_date)
            
        # Получаем все карточки с учетом фильтров
        cards = query.all()
        
        # Считаем общую статистику
        total_tickets = len(cards)
        total_story_points = sum(card.story_points for card in cards if card.story_points)
        average_story_points = total_story_points / total_tickets if total_tickets > 0 else 0
        
        # Статистика по колонкам
        tickets_by_column = {}
        for card in cards:
            column = card.column
            if column:
                column_name = column.title
                tickets_by_column[column_name] = tickets_by_column.get(column_name, 0) + 1
        
        # Статистика по исполнителям
        tickets_by_assignee = {}
        for card in cards:
            if card.assignee:
                assignee_name = card.assignee.username
                tickets_by_assignee[assignee_name] = tickets_by_assignee.get(assignee_name, 0) + 1
        
        return {
            "total_tickets": total_tickets,
            "tickets_by_column": tickets_by_column,
            "tickets_by_assignee": tickets_by_assignee,
            "average_story_points": average_story_points
        }
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/users")
async def debug_users(db: Session = Depends(get_db)):
    try:
        users = db.query(models.User).all()
        return {
            "total": len(users),
            "users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "hashed_password": user.hashed_password[:20] + "..." # Показываем только начало хеша
                }
                for user in users
            ]
        }
    except Exception as e:
        logger.error(f"Ошибка при получении списка пользователей: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении списка пользователей: {str(e)}"
        )

@app.get("/api/debug/verify-password")
async def debug_verify_password(password: str = Query(..., description="Пароль для проверки"), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if not user:
        return {"error": "Пользователь не найден"}
    
    is_valid = verify_password(password, user.hashed_password)
    return {
        "password": password,
        "stored_hash": user.hashed_password,
        "is_valid": is_valid
    }

@app.put("/api/cards/{card_id}", response_model=schemas.Card)
async def update_card(
    card_id: int,
    card_update: schemas.CardUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Получаем карточку
        db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
        if not db_card:
            raise HTTPException(status_code=404, detail="Карточка не найдена")

        # Проверяем существование исполнителя, если он указан
        assignee = None
        if card_update.assignee_id:
            assignee = db.query(models.User).filter(models.User.id == card_update.assignee_id).first()
            if not assignee:
                raise HTTPException(status_code=404, detail="Исполнитель не найден")

        # Обновляем поля карточки
        update_data = card_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_card, key, value)

        # Создаем запись в истории
        history_entry = models.CardHistory(
            card_id=card_id,
            action="updated",
            details=json.dumps(update_data)
        )
        db.add(history_entry)
        
        db.commit()
        db.refresh(db_card)

        # Формируем ответ
        response_data = {
            "id": db_card.id,
            "title": db_card.title,
            "description": db_card.description,
            "position": db_card.position,
            "story_points": db_card.story_points,
            "column_id": db_card.column_id,
            "assignee_id": db_card.assignee_id,
            "created_at": db_card.created_at,
            "updated_at": db_card.updated_at
        }

        if assignee:
            response_data["assignee"] = {
                "id": assignee.id,
                "username": assignee.username,
                "is_active": assignee.is_active,
                "created_at": assignee.created_at
            }

        return response_data
    except Exception as e:
        logger.error(f"Неожиданная ошибка при обновлении тикета: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}/comments", response_model=List[schemas.Comment])
def get_ticket_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comments = db.query(models.Comment).filter(models.Comment.ticket_id == ticket_id).all()
    # Загружаем данные о пользователях для каждого комментария
    for comment in comments:
        comment.user = db.query(models.User).filter(models.User.id == comment.user_id).first()
    return comments

@app.post("/tickets/{ticket_id}/comments", response_model=schemas.Comment)
def create_comment(
    ticket_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_comment = models.Comment(
        content=comment.content,
        ticket_id=ticket_id,
        user_id=current_user.id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    # Загружаем данные о пользователе для нового комментария
    db_comment.user = current_user
    return db_comment 