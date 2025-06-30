from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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
from .auth import get_current_user, create_access_token, verify_password, get_password_hash
from .telegram_bot import send_approver_notification, send_approver_change_notification
import re
from fastapi.responses import JSONResponse

# Создаем таблицы в базе данных (отключено - используем миграции)
# models.Base.metadata.create_all(bind=engine)

# Инициализируем базу данных (создание данных, но не таблиц)
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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "Authorization", "Content-Type", "Accept"],
    expose_headers=["*"],
    max_age=3600
)

# Добавляем обработчик для OPTIONS запросов
@app.options("/{full_path:path}")
async def options_handler():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
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
        telegram=user.telegram,
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
    except IntegrityError as e:
        logger.warning(f"Ошибка уникальности при регистрации пользователя {user.username}: {str(e)}")
        db.rollback()
        if "duplicate key value violates unique constraint" in str(e):
            if "ix_users_username" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Пользователь с именем '{user.username}' уже существует"
                )
            elif "ix_users_email" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Пользователь с email '{user.email}' уже существует"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с такими данными уже существует"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка целостности данных: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Неожиданная ошибка при регистрации пользователя {user.username}: {str(e)}")
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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/columns")
async def get_columns(db: Session = Depends(get_db)):
    try:
        columns = db.query(models.KanbanColumn).order_by(models.KanbanColumn.position).all()
        # Загружаем карточки для каждой колонки
        for column in columns:
            column.cards = db.query(models.Card).filter(models.Card.column_id == column.id).all()
            # Загружаем информацию об исполнителях, согласующих и тегах для каждой карточки
            for card in column.cards:
                if card.assignee_id:
                    card.assignee = db.query(models.User).filter(models.User.id == card.assignee_id).first()
                if card.approver_id:
                    card.approver = db.query(models.User).filter(models.User.id == card.approver_id).first()
                # Загружаем теги
                card.tags = db.query(models.Tag).join(models.CardTag).filter(models.CardTag.card_id == card.id).all()
                logger.info(f"Card {card.id} tags: {[tag.name for tag in card.tags]}")
                logger.info(f"Card {card.id} tags (full data): {[tag.__dict__ for tag in card.tags]}")
                logger.info(f"Card {card.id} tags (type): {type(card.tags)}")
                logger.info(f"Card {card.id} full data: {card.__dict__}")
        
        # Формируем ответ
        response_data = []
        for column in columns:
            column_data = {
                "id": column.id,
                "title": column.title,
                "position": column.position,
                "color": column.color,
                "wip_limit": column.wip_limit,
                "cards_count": len(column.cards),
                "cards": []
            }
            
            for card in column.cards:
                card_data = {
                    "id": card.id,
                    "title": card.title,
                    "description": card.description,
                    "position": card.position,
                    "story_points": card.story_points,
                    "column_id": card.column_id,
                    "assignee_id": card.assignee_id,
                    "approver_id": card.approver_id,
                    "real_estate_type": card.real_estate_type,
                    "rc_mk": card.rc_mk,
                    "rc_zm": card.rc_zm,
                    "created_at": card.created_at,
                    "updated_at": card.updated_at,
                    "tags": [{"id": tag.id, "name": tag.name, "created_at": tag.created_at} for tag in card.tags]
                }
                
                if card.assignee:
                    card_data["assignee"] = {
                        "id": card.assignee.id,
                        "username": card.assignee.username,
                        "telegram": card.assignee.telegram,
                        "role": card.assignee.role,
                        "is_active": card.assignee.is_active,
                        "created_at": card.assignee.created_at,
                        "email": card.assignee.email
                    }
                
                if card.approver:
                    card_data["approver"] = {
                        "id": card.approver.id,
                        "username": card.approver.username,
                        "telegram": card.approver.telegram,
                        "role": card.approver.role,
                        "is_active": card.approver.is_active,
                        "created_at": card.approver.created_at,
                        "email": card.approver.email
                    }
                
                column_data["cards"].append(card_data)
            
            response_data.append(column_data)
        
        logger.info(f"Отправляем ответ с колонками: {response_data}")
        return response_data
    except Exception as e:
        logger.error(f"Ошибка при получении колонок: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/columns/{column_id}")
async def get_column(column_id: int, db: Session = Depends(get_db)):
    column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Колонка не найдена")
    return column

def get_or_create_tag(db: Session, tag_name: str) -> models.Tag:
    try:
        logger.info(f"Создание или получение тега: {tag_name}")
        logger.info(f"Тип тега: {type(tag_name)}")
        
        # Убираем все # в начале и добавляем один #
        tag_name = tag_name.lstrip('#')
        tag_name = f'#{tag_name}'
        
        # Проверяем длину тега
        if len(tag_name) > 50:
            raise ValueError(f"Тег слишком длинный: {tag_name}")
        
        tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
        if not tag:
            logger.info(f"Создаем новый тег: {tag_name}")
            tag = models.Tag(name=tag_name)
            db.add(tag)
            # Не делаем commit - flush достаточно для получения ID
            db.flush()
            logger.info(f"Тег успешно создан: {tag.name}, id: {tag.id}")
        else:
            logger.info(f"Найден существующий тег: {tag.name}, id: {tag.id}")
        
        return tag
    except Exception as e:
        logger.error(f"Ошибка в get_or_create_tag: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise

def update_card_tags(db: Session, card: models.Card, tag_names: List[str]):
    try:
        logger.info(f"Обновление тегов карточки {card.id}: {tag_names}")
        logger.info(f"Тип тегов: {type(tag_names)}")
        logger.info(f"Структура тегов: {[type(tag) for tag in tag_names]}")
        
        if tag_names is None:
            logger.info("Теги не указаны, пропускаем обновление")
            return
        
        if len(tag_names) > 5:
            raise ValueError("Максимальное количество тегов - 5")
        
        # Удаляем все существующие теги
        card.tags = []
        logger.info("Существующие теги очищены")
        
        # Добавляем новые теги
        for tag_name in tag_names:
            logger.info(f"Обработка тега: {tag_name}, тип: {type(tag_name)}")
            tag = get_or_create_tag(db, tag_name)
            card.tags.append(tag)
            logger.info(f"Тег добавлен: {tag.name}, id: {tag.id}")
        
        # Не делаем commit здесь - это должно происходить в вызывающей функции
        logger.info(f"Теги подготовлены для сохранения: {[tag.name for tag in card.tags]}")
    except Exception as e:
        logger.error(f"Ошибка в update_card_tags: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise

@app.post("/api/cards", response_model=schemas.Card)
async def create_card(card: schemas.CardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        logger.info(f"Начало создания тикета. Данные: {card.dict()}")
        logger.info(f"Поля РЦ МК: {card.rc_mk} (тип: {type(card.rc_mk)})")
        logger.info(f"Поля РЦ ЗМ: {card.rc_zm} (тип: {type(card.rc_zm)})")
        
        # Проверяем существование колонки
        column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == card.column_id).first()
        if not column:
            raise HTTPException(status_code=404, detail="Колонка не найдена")
        logger.info(f"Колонка найдена: {column.id}")

        # Проверяем WIP лимит для колонки
        if not check_wip_limit(db, card.column_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Исчерпан WIP лимит задач в колонке '{column.title}'"
            )

        # Проверяем существование исполнителя, если он указан
        assignee = None
        if card.assignee_id:
            assignee = db.query(models.User).filter(models.User.id == card.assignee_id).first()
            if not assignee:
                raise HTTPException(status_code=404, detail="Исполнитель не найден")
            logger.info(f"Исполнитель найден: {assignee.username}")

        # Проверяем существование согласующего, если он указан
        approver = None
        if card.approver_id:
            approver = db.query(models.User).filter(models.User.id == card.approver_id).first()
            if not approver:
                raise HTTPException(status_code=404, detail="Согласующий не найден")
            logger.info(f"Согласующий найден: {approver.username}")

        # Конвертируем строковое значение типа недвижимости в enum
        real_estate_type_value = None
        if card.real_estate_type:
            # Ищем enum по имени константы и получаем его значение
            try:
                real_estate_type_enum = models.RealEstateType[card.real_estate_type]
                real_estate_type_value = real_estate_type_enum.value  # Получаем строковое значение
                logger.info(f"Тип недвижимости конвертирован: {card.real_estate_type} -> {real_estate_type_value}")
            except KeyError:
                logger.error(f"Неизвестный тип недвижимости: {card.real_estate_type}")
                raise HTTPException(status_code=422, detail=f"Неизвестный тип недвижимости: {card.real_estate_type}")

        # Конвертируем строковые значения РЦ в enum
        rc_mk_value = None
        if card.rc_mk:
            try:
                rc_mk_enum = models.RCType[card.rc_mk]
                rc_mk_value = rc_mk_enum.value
                logger.info(f"РЦ МК конвертирован: {card.rc_mk} -> {rc_mk_value}")
            except KeyError:
                logger.error(f"Неизвестный РЦ МК: {card.rc_mk}")
                raise HTTPException(status_code=422, detail=f"Неизвестный РЦ МК: {card.rc_mk}")

        rc_zm_value = None
        if card.rc_zm:
            try:
                rc_zm_enum = models.RCType[card.rc_zm]
                rc_zm_value = rc_zm_enum.value
                logger.info(f"РЦ ЗМ конвертирован: {card.rc_zm} -> {rc_zm_value}")
            except KeyError:
                logger.error(f"Неизвестный РЦ ЗМ: {card.rc_zm}")
                raise HTTPException(status_code=422, detail=f"Неизвестный РЦ ЗМ: {card.rc_zm}")

        # Создаем новую карточку
        db_card = models.Card(
            title=card.title,
            description=card.description,
            position=card.position,
            story_points=card.story_points,
            column_id=card.column_id,
            assignee_id=card.assignee_id,
            approver_id=card.approver_id,
            real_estate_type=real_estate_type_value,  # Сохраняем строковое значение
            rc_mk=rc_mk_value,  # Сохраняем строковое значение РЦ МК
            rc_zm=rc_zm_value,  # Сохраняем строковое значение РЦ ЗМ
            created_by=current_user.id
        )
        
        db.add(db_card)
        db.flush()  # Получаем ID карточки без commit
        logger.info(f"Карточка создана с ID: {db_card.id}")
        
        # Добавляем теги
        if card.tags:
            logger.info(f"Добавляем теги к карточке {db_card.id}: {card.tags}")
            logger.info(f"Тип тегов: {type(card.tags)}")
            update_card_tags(db, db_card, card.tags)
            logger.info(f"Теги добавлены: {[tag.name for tag in db_card.tags]}")
            logger.info(f"Тип добавленных тегов: {type(db_card.tags)}")
        
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
                "assignee_id": card.assignee_id,
                "real_estate_type": card.real_estate_type,
                "rc_mk": card.rc_mk,
                "rc_zm": card.rc_zm,
                "tags": card.tags
            })
        )
        db.add(history_entry)
        
        # Делаем окончательный commit всех изменений
        db.commit()
        db.refresh(db_card)
        logger.info(f"Карточка успешно сохранена в базу данных")
        
        # Отправляем Telegram уведомление согласующему, если он назначен
        if approver:
            try:
                logger.info(f"Отправка Telegram уведомления согласующему {approver.username}")
                success = send_approver_notification(approver, db_card)
                if success:
                    logger.info(f"Telegram уведомление успешно отправлено согласующему {approver.username}")
                else:
                    logger.warning(f"Не удалось отправить Telegram уведомление согласующему {approver.username}")
            except Exception as e:
                logger.error(f"Ошибка при отправке Telegram уведомления: {str(e)}")
        
        # Формируем ответ
        response_data = {
            "id": db_card.id,
            "title": db_card.title,
            "description": db_card.description,
            "position": db_card.position,
            "story_points": db_card.story_points,
            "column_id": db_card.column_id,
            "assignee_id": db_card.assignee_id,
            "approver_id": db_card.approver_id,
            "real_estate_type": real_estate_type_value,
            "rc_mk": rc_mk_value,
            "rc_zm": rc_zm_value,
            "created_at": db_card.created_at,
            "updated_at": db_card.updated_at,
            "tags": [{"id": tag.id, "name": tag.name, "created_at": tag.created_at} for tag in db_card.tags]
        }
        
        if assignee:
            response_data["assignee"] = {
                "id": assignee.id,
                "username": assignee.username,
                "telegram": assignee.telegram,
                "role": assignee.role,
                "is_active": assignee.is_active,
                "created_at": assignee.created_at,
                "email": assignee.email
            }
        
        if approver:
            response_data["approver"] = {
                "id": approver.id,
                "username": approver.username,
                "telegram": approver.telegram,
                "role": approver.role,
                "is_active": approver.is_active,
                "created_at": approver.created_at,
                "email": approver.email
            }
        
        logger.info(f"Возвращаем ответ: {response_data}")
        return response_data
    except HTTPException:
        # Повторно выбрасываем HTTPException без изменений
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при создании тикета: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        db.rollback()  # Откатываем транзакцию
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
    
    # Если карточка не перемещается (остается в той же колонке), пропускаем проверку WIP лимита
    if card.column_id != move_data.to_column:
        # Проверяем WIP лимит только при перемещении в другую колонку
        if not check_wip_limit(db, move_data.to_column):
            # Получаем название колонки для ошибки
            column_name = target_column.title
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Исчерпан WIP лимит задач в колонке '{column_name}'"
            )
    
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

@app.get("/api/real-estate-types")
async def get_real_estate_types():
    """Получить все доступные типы недвижимости"""
    return {
        "types": [
            {"value": member.name, "label": member.value}
            for member in models.RealEstateType
        ]
    }

@app.get("/api/rc-types")
async def get_rc_types():
    """Получить все доступные типы РЦ"""
    return {
        "types": [
            {"value": member.name, "label": member.value}
            for member in models.RCType
        ]
    }

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
        logger.info(f"Начало обновления карточки {card_id}")
        logger.info(f"Полученные данные: {card_update.dict()}")
        
        # Получаем карточку
        db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
        if not db_card:
            raise HTTPException(status_code=404, detail="Карточка не найдена")

        # Сохраняем старого согласующего для отправки уведомлений
        old_approver = db_card.approver if db_card.approver_id else None
        
        # Проверяем существование исполнителя, если он указан
        assignee = None
        if card_update.assignee_id:
            assignee = db.query(models.User).filter(models.User.id == card_update.assignee_id).first()
            if not assignee:
                raise HTTPException(status_code=404, detail="Исполнитель не найден")

        # Проверяем существование согласующего, если он указан
        approver = None
        if card_update.approver_id:
            approver = db.query(models.User).filter(models.User.id == card_update.approver_id).first()
            if not approver:
                raise HTTPException(status_code=404, detail="Согласующий не найден")

        # Обновляем поля карточки
        update_data = card_update.dict(exclude_unset=True)
        logger.info(f"Данные для обновления: {update_data}")
        
        # Конвертируем тип недвижимости если он есть
        real_estate_type_value = None
        if 'real_estate_type' in update_data and update_data['real_estate_type']:
            real_estate_type_constant = update_data['real_estate_type']
            logger.info(f"Получен тип недвижимости: {real_estate_type_constant}")
            
            # Конвертируем константу enum в значение enum для базы данных
            try:
                enum_member = models.RealEstateType[real_estate_type_constant]
                real_estate_type_value = enum_member.value
                logger.info(f"Конвертирован тип недвижимости: {real_estate_type_constant} -> {real_estate_type_value}")
            except KeyError:
                logger.error(f"Неизвестный тип недвижимости: {real_estate_type_constant}")
                raise HTTPException(status_code=400, detail=f"Неизвестный тип недвижимости: {real_estate_type_constant}")

        # Конвертируем РЦ МК если он есть
        rc_mk_value = None
        if 'rc_mk' in update_data and update_data['rc_mk']:
            rc_mk_constant = update_data['rc_mk']
            logger.info(f"Получен РЦ МК: {rc_mk_constant}")
            
            try:
                enum_member = models.RCType[rc_mk_constant]
                rc_mk_value = enum_member.value
                logger.info(f"Конвертирован РЦ МК: {rc_mk_constant} -> {rc_mk_value}")
            except KeyError:
                logger.error(f"Неизвестный РЦ МК: {rc_mk_constant}")
                raise HTTPException(status_code=400, detail=f"Неизвестный РЦ МК: {rc_mk_constant}")

        # Конвертируем РЦ ЗМ если он есть
        rc_zm_value = None
        if 'rc_zm' in update_data and update_data['rc_zm']:
            rc_zm_constant = update_data['rc_zm']
            logger.info(f"Получен РЦ ЗМ: {rc_zm_constant}")
            
            try:
                enum_member = models.RCType[rc_zm_constant]
                rc_zm_value = enum_member.value
                logger.info(f"Конвертирован РЦ ЗМ: {rc_zm_constant} -> {rc_zm_value}")
            except KeyError:
                logger.error(f"Неизвестный РЦ ЗМ: {rc_zm_constant}")
                raise HTTPException(status_code=400, detail=f"Неизвестный РЦ ЗМ: {rc_zm_constant}")
        
        for key, value in update_data.items():
            if key == 'real_estate_type':
                # Используем конвертированное значение для типа недвижимости
                if real_estate_type_value is not None:
                    setattr(db_card, key, real_estate_type_value)
            elif key == 'rc_mk':
                # Используем конвертированное значение для РЦ МК
                if rc_mk_value is not None:
                    setattr(db_card, key, rc_mk_value)
            elif key == 'rc_zm':
                # Используем конвертированное значение для РЦ ЗМ
                if rc_zm_value is not None:
                    setattr(db_card, key, rc_zm_value)
            elif key != 'tags':  # Исключаем теги из общего обновления
                setattr(db_card, key, value)

        # Обновляем теги
        if 'tags' in update_data:
            logger.info(f"Обновляем теги карточки {card_id}: {update_data['tags']}")
            logger.info(f"Тип тегов: {type(update_data['tags'])}")
            logger.info(f"Структура тегов: {[type(tag) for tag in update_data['tags']]}")
            
            try:
                # Очищаем существующие теги
                db_card.tags = []
                logger.info("Существующие теги очищены")
                
                # Добавляем новые теги
                for tag_name in update_data['tags']:
                    logger.info(f"Обрабатываем тег: {tag_name}, тип: {type(tag_name)}")
                    tag_obj = get_or_create_tag(db, tag_name)
                    logger.info(f"Создан/получен тег: {tag_obj.name}, id: {tag_obj.id}")
                    db_card.tags.append(tag_obj)
                
                logger.info(f"Теги обновлены: {[tag.name for tag in db_card.tags]}")
            except Exception as e:
                logger.error(f"Ошибка при обновлении тегов: {str(e)}")
                logger.error("Полный стек ошибки:", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Ошибка при обновлении тегов: {str(e)}")

        # Создаем запись в истории
        history_entry = models.CardHistory(
            card_id=card_id,
            action="updated",
            details=json.dumps(update_data)
        )
        db.add(history_entry)
        
        try:
            db.commit()
            db.refresh(db_card)
            logger.info("Изменения успешно сохранены в базу данных")
        except Exception as e:
            logger.error(f"Ошибка при сохранении в базу данных: {str(e)}")
            logger.error("Полный стек ошибки:", exc_info=True)
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка при сохранении в базу данных: {str(e)}")

        # Отправляем Telegram уведомления при изменении согласующего
        if 'approver_id' in update_data:
            try:
                logger.info(f"Изменение согласующего: {old_approver.username if old_approver else 'None'} -> {approver.username if approver else 'None'}")
                success = send_approver_change_notification(old_approver, approver, db_card)
                if success:
                    logger.info("Telegram уведомления о смене согласующего успешно отправлены")
                else:
                    logger.warning("Не удалось отправить некоторые Telegram уведомления о смене согласующего")
            except Exception as e:
                logger.error(f"Ошибка при отправке Telegram уведомлений о смене согласующего: {str(e)}")

        # Формируем ответ
        response_data = {
            "id": db_card.id,
            "title": db_card.title,
            "description": db_card.description,
            "position": db_card.position,
            "story_points": db_card.story_points,
            "column_id": db_card.column_id,
            "assignee_id": db_card.assignee_id,
            "approver_id": db_card.approver_id,
            "real_estate_type": real_estate_type_value,
            "rc_mk": rc_mk_value,
            "rc_zm": rc_zm_value,
            "created_at": db_card.created_at,
            "updated_at": db_card.updated_at,
            "tags": [{"id": tag.id, "name": tag.name, "created_at": tag.created_at} for tag in db_card.tags]
        }

        if assignee:
            response_data["assignee"] = {
                "id": assignee.id,
                "username": assignee.username,
                "telegram": assignee.telegram,
                "role": assignee.role,
                "is_active": assignee.is_active,
                "created_at": assignee.created_at,
                "email": assignee.email
            }

        if approver:
            response_data["approver"] = {
                "id": approver.id,
                "username": approver.username,
                "telegram": approver.telegram,
                "role": approver.role,
                "is_active": approver.is_active,
                "created_at": approver.created_at,
                "email": approver.email
            }

        logger.info(f"Успешно обновлена карточка {card_id}")
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при обновлении тикета: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cards/{card_id}/comments", response_model=List[schemas.Comment])
def get_card_comments(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comments = db.query(models.Comment).filter(models.Comment.ticket_id == card_id).all()
    # Загружаем данные о пользователях для каждого комментария
    for comment in comments:
        comment.user = db.query(models.User).filter(models.User.id == comment.user_id).first()
    return comments

@app.post("/api/cards/{card_id}/comments", response_model=schemas.Comment)
def create_card_comment(
    card_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование карточки
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    
    db_comment = models.Comment(
        content=comment.content,
        ticket_id=card_id,
        user_id=current_user.id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    # Загружаем данные о пользователе для нового комментария
    db_comment.user = current_user
    return db_comment

@app.get("/api/cards/{card_id}")
async def get_card(card_id: int, db: Session = Depends(get_db)):
    try:
        card = db.query(models.Card).filter(models.Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Карточка не найдена")
        
        # Загружаем теги
        card.tags = db.query(models.Tag).join(models.CardTag).filter(models.CardTag.card_id == card.id).all()
        logger.info(f"Получены теги карточки {card_id}: {[tag.name for tag in card.tags]}")
        logger.info(f"Получены теги карточки {card_id} (полные данные): {[tag.__dict__ for tag in card.tags]}")
        logger.info(f"Получены теги карточки {card_id} (тип): {type(card.tags)}")
        
        # Формируем ответ
        response_data = {
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "position": card.position,
            "story_points": card.story_points,
            "column_id": card.column_id,
            "assignee_id": card.assignee_id,
            "approver_id": card.approver_id,
            "real_estate_type": card.real_estate_type,
            "rc_mk": card.rc_mk,
            "rc_zm": card.rc_zm,
            "created_at": card.created_at,
            "updated_at": card.updated_at,
            "tags": [{"id": tag.id, "name": tag.name, "created_at": tag.created_at} for tag in card.tags]
        }
        
        if card.assignee:
            response_data["assignee"] = {
                "id": card.assignee.id,
                "username": card.assignee.username,
                "telegram": card.assignee.telegram,
                "role": card.assignee.role,
                "is_active": card.assignee.is_active,
                "created_at": card.assignee.created_at,
                "email": card.assignee.email
            }
        
        if card.approver:
            response_data["approver"] = {
                "id": card.approver.id,
                "username": card.approver.username,
                "telegram": card.approver.telegram,
                "role": card.approver.role,
                "is_active": card.approver.is_active,
                "created_at": card.approver.created_at,
                "email": card.approver.email
            }
        
        logger.info(f"Отправляем ответ для карточки {card_id}: {response_data}")
        return response_data
    except Exception as e:
        logger.error(f"Ошибка при получении карточки {card_id}: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cards/{card_id}")
async def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        logger.info(f"Начало удаления карточки {card_id} пользователем {current_user.username}")
        
        # Получаем карточку
        db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
        if not db_card:
            raise HTTPException(status_code=404, detail="Карточка не найдена")

        # Сохраняем информацию о карточке для логирования
        card_info = {
            "title": db_card.title,
            "description": db_card.description,
            "deleted_by": current_user.username
        }
        
        # Удаляем связи с тегами
        db_card.tags.clear()
        
        # Удаляем карточку (комментарии и история удалятся автоматически благодаря cascade)
        db.delete(db_card)
        
        try:
            db.commit()
            logger.info(f"Карточка {card_id} '{card_info['title']}' успешно удалена пользователем {current_user.username}")
        except Exception as e:
            logger.error(f"Ошибка при удалении карточки {card_id}: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка при удалении карточки: {str(e)}")

        return {
            "message": f"Карточка '{card_info['title']}' успешно удалена", 
            "deleted_card_id": card_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при удалении карточки {card_id}: {str(e)}")
        logger.error("Полный стек ошибки:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Функции для проверки ролей
def require_admin_role(current_user: models.User = Depends(get_current_user)):
    """Проверяет, что текущий пользователь имеет роль admin"""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа. Требуется роль администратора."
        )
    return current_user

def require_curator_or_admin_role(current_user: models.User = Depends(get_current_user)):
    """Проверяет, что текущий пользователь имеет роль curator или admin"""
    if current_user.role not in [models.UserRole.CURATOR, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа. Требуется роль куратора или администратора."
        )
    return current_user

# API endpoints для управления ролями (только для админов)
@app.get("/api/admin/users", response_model=List[schemas.AdminUserResponse])
async def get_all_users_for_admin(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin_role)
):
    """Получить список всех пользователей для админки"""
    try:
        users = db.query(models.User).order_by(models.User.created_at).all()
        return users
    except Exception as e:
        logger.error(f"Ошибка при получении пользователей для админки: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении списка пользователей: {str(e)}"
        )

@app.put("/api/admin/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin_role)
):
    """Обновить роль пользователя (только для админов)"""
    try:
        # Проверяем, что пользователь существует
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем, что ID в URL совпадает с ID в теле запроса
        if user_id != role_data.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID пользователя в URL не совпадает с ID в теле запроса"
            )
        
        # Не позволяем админу изменить свою собственную роль
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя изменить собственную роль"
            )
        
        # Обновляем роль
        old_role = user.role
        user.role = role_data.role
        db.commit()
        db.refresh(user)
        
        logger.info(f"Админ {current_user.username} изменил роль пользователя {user.username} с {old_role.value} на {role_data.role.value}")
        
        return {
            "message": f"Роль пользователя {user.username} успешно изменена на {role_data.role.value}",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении роли пользователя: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении роли: {str(e)}"
        )

@app.get("/api/admin/roles")
async def get_available_roles(current_user: models.User = Depends(require_admin_role)):
    """Получить список доступных ролей"""
    return {
        "roles": [
            {"value": "USER", "label": "Пользователь"},
            {"value": "CURATOR", "label": "Куратор"},
            {"value": "ADMIN", "label": "Администратор"}
        ]
    }

# API endpoints для управления WIP лимитами (только для curator и admin)
@app.get("/api/curator/columns")
async def get_columns_for_curator(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_curator_or_admin_role)
):
    """Получить список колонок для кураторской страницы"""
    try:
        columns = db.query(models.KanbanColumn).order_by(models.KanbanColumn.position).all()
        
        result = []
        for column in columns:
            cards_count = db.query(models.Card).filter(models.Card.column_id == column.id).count()
            result.append({
                "id": column.id,
                "title": column.title,
                "position": column.position,
                "color": column.color,
                "wip_limit": column.wip_limit,
                "cards_count": cards_count
            })
        
        return result
    except Exception as e:
        logger.error(f"Ошибка при получении колонок для куратора: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении колонок: {str(e)}"
        )

@app.put("/api/curator/columns/{column_id}/wip-limit")
async def update_wip_limit(
    column_id: int,
    wip_data: schemas.WipLimitUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_curator_or_admin_role)
):
    """Обновить WIP лимит колонки (только для curator и admin)"""
    try:
        # Проверяем, что колонка существует
        column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == column_id).first()
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Колонка не найдена"
            )
        
        # Проверяем, что ID в URL совпадает с ID в теле запроса
        if column_id != wip_data.column_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID колонки в URL не совпадает с ID в теле запроса"
            )
        
        # Обновляем WIP лимит
        old_limit = column.wip_limit
        column.wip_limit = wip_data.wip_limit
        db.commit()
        db.refresh(column)
        
        # Получаем текущее количество карточек в колонке
        cards_count = db.query(models.Card).filter(models.Card.column_id == column_id).count()
        
        logger.info(f"Куратор {current_user.username} изменил WIP лимит колонки '{column.title}' с {old_limit} на {wip_data.wip_limit}")
        
        return {
            "message": f"WIP лимит колонки '{column.title}' успешно {'установлен' if old_limit is None else 'изменен'}",
            "column": {
                "id": column.id,
                "title": column.title,
                "wip_limit": column.wip_limit,
                "cards_count": cards_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении WIP лимита: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении WIP лимита: {str(e)}"
        )

# Функция для проверки WIP лимитов
def check_wip_limit(db: Session, column_id: int) -> bool:
    """Проверить, можно ли добавить карточку в колонку (не превышен ли WIP лимит)"""
    try:
        column = db.query(models.KanbanColumn).filter(models.KanbanColumn.id == column_id).first()
        if not column:
            return True  # Если колонка не найдена, разрешаем (будет ошибка позже)
        
        # Если лимит не установлен, разрешаем
        if column.wip_limit is None:
            return True
        
        # Считаем текущее количество карточек в колонке
        current_cards_count = db.query(models.Card).filter(models.Card.column_id == column_id).count()
        
        # Проверяем, не превышен ли лимит
        return current_cards_count < column.wip_limit
        
    except Exception as e:
        logger.error(f"Ошибка при проверке WIP лимита для колонки {column_id}: {str(e)}")
        return True  # В случае ошибки разрешаем (не блокируем пользователя)

# Добавляем обработчик ошибок
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Глобальная ошибка: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        }
    ) 