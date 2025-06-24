import os
import requests
import logging
from typing import Optional
from .models import User, Card

logger = logging.getLogger(__name__)

# Получаем токен бота из переменных окружения
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

def send_telegram_message(chat_id: str, message: str) -> bool:
    """
    Отправляет сообщение в Telegram
    
    Args:
        chat_id: ID чата или username (@username)
        message: Текст сообщения
        
    Returns:
        bool: True если сообщение отправлено успешно, False в противном случае
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN не установлен. Уведомления отключены.")
        return False
        
    try:
        url = f"{TELEGRAM_API_URL}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        logger.info(f"Telegram сообщение отправлено пользователю {chat_id}")
        return True
        
    except requests.exceptions.RequestException as e:
        try:
            error_details = e.response.json() if hasattr(e, 'response') and e.response else "Нет деталей ошибки"
            logger.error(f"Ошибка отправки Telegram сообщения пользователю {chat_id}: {e}")
            logger.error(f"Детали ошибки Telegram API: {error_details}")
        except:
            logger.error(f"Ошибка отправки Telegram сообщения пользователю {chat_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Неожиданная ошибка при отправке Telegram сообщения: {e}")
        return False

def send_approver_notification(approver: User, card: Card) -> bool:
    """
    Отправляет уведомление согласующему о назначении на тикет
    
    Args:
        approver: Пользователь-согласующий
        card: Карточка тикета
        
    Returns:
        bool: True если уведомление отправлено успешно
    """
    if not approver.telegram:
        logger.warning(f"У пользователя {approver.username} не указан Telegram")
        return False
        
    message = f"""
🔔 *Новое назначение на согласование*

📋 **Тикет:** {card.title}
📝 **Описание:** {card.description or 'Не указано'}
⭐ **Story Points:** {card.story_points or 'Не указано'}

Вы назначены согласующим для этого тикета.
    """.strip()
    
    return send_telegram_message(approver.telegram, message)

def send_approver_change_notification(old_approver: Optional[User], new_approver: Optional[User], card: Card) -> bool:
    """
    Отправляет уведомления при смене согласующего
    
    Args:
        old_approver: Предыдущий согласующий (может быть None)
        new_approver: Новый согласующий (может быть None)
        card: Карточка тикета
        
    Returns:
        bool: True если все уведомления отправлены успешно
    """
    success = True
    
    # Уведомляем старого согласующего об удалении назначения
    if old_approver and old_approver.telegram:
        message = f"""
ℹ️ *Изменение назначения*

📋 **Тикет:** {card.title}

Вы больше не являетесь согласующим для этого тикета.
        """.strip()
        
        if not send_telegram_message(old_approver.telegram, message):
            success = False
    
    # Уведомляем нового согласующего о назначении
    if new_approver and new_approver.telegram:
        if not send_approver_notification(new_approver, card):
            success = False
    
    return success 