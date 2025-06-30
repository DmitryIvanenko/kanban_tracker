"""
Конфигурация приложения с валидацией переменных окружения
"""

import re
from typing import Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from pydantic import Field, field_validator, SecretStr
from pydantic.networks import PostgresDsn, HttpUrl
import os


class Settings(BaseSettings):
    """
    Настройки приложения с валидацией переменных окружения
    """
    
    # База данных
    database_url: PostgresDsn = Field(
        default="postgresql://postgres:postgres@db:5432/kanban",
        env="DATABASE_URL",
        description="URL подключения к PostgreSQL базе данных"
    )
    
    # Администратор
    admin_username: str = Field(
        default="admin",
        env="ADMIN_USERNAME", 
        min_length=3,
        max_length=50,
        description="Имя пользователя администратора"
    )
    
    admin_password: SecretStr = Field(
        ...,  # Обязательное поле
        env="ADMIN_PASSWORD",
        min_length=8,
        description="Пароль администратора (минимум 8 символов)"
    )
    
    admin_telegram: str = Field(
        default="@admin",
        env="ADMIN_TELEGRAM",
        min_length=2,
        max_length=100,
        description="Telegram администратора (@username или chat_id)"
    )
    
    # Telegram Bot
    telegram_bot_token: Optional[SecretStr] = Field(
        default=None,
        env="TELEGRAM_BOT_TOKEN",
        description="Токен Telegram бота (опционально)"
    )
    
    # Настройки приложения
    app_name: str = Field(
        default="Kanban Tracker",
        env="APP_NAME",
        description="Название приложения"
    )
    
    debug: bool = Field(
        default=False,
        env="DEBUG",
        description="Режим отладки"
    )
    
    # Безопасность
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        env="SECRET_KEY",
        min_length=32,
        description="Секретный ключ для подписи JWT токенов"
    )
    
    # Настройки JWT
    jwt_algorithm: str = Field(
        default="HS256",
        env="JWT_ALGORITHM",
        description="Алгоритм для JWT токенов"
    )
    
    jwt_expire_minutes: int = Field(
        default=30,
        env="JWT_EXPIRE_MINUTES",
        ge=1,
        le=10080,  # Максимум неделя
        description="Время жизни JWT токена в минутах"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        validate_assignment = True

    @field_validator('admin_username')
    @classmethod
    def validate_admin_username(cls, v):
        """Валидация имени администратора"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError(
                'Имя администратора может содержать только буквы, цифры, подчеркивания и дефисы'
            )
        return v
    
    @field_validator('admin_password')
    @classmethod
    def validate_admin_password(cls, v):
        """Валидация пароля администратора"""
        password = v.get_secret_value() if isinstance(v, SecretStr) else str(v)
        
        # Проверка на небезопасные значения по умолчанию
        unsafe_passwords = [
            'admin', 'password', '123456', 'qwerty', 
            'your_secure_password_here', 'change_me'
        ]
        
        if password.lower() in unsafe_passwords:
            raise ValueError(
                f'Пароль "{password}" небезопасен! Установите надежный пароль в ADMIN_PASSWORD'
            )
        
        # Проверка сложности пароля
        if len(password) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        
        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                'Пароль должен содержать как минимум одну заглавную букву, '
                'одну строчную букву и одну цифру'
            )
        
        return v
    
    @field_validator('admin_telegram')
    @classmethod
    def validate_admin_telegram(cls, v):
        """Валидация Telegram идентификатора"""
        # Проверяем формат @username или chat_id (только цифры)
        if v.startswith('@'):
            # Username формат
            if not re.match(r'^@[a-zA-Z0-9_]{5,32}$', v):
                raise ValueError(
                    'Telegram username должен быть в формате @username '
                    '(5-32 символа, только буквы, цифры и подчеркивания)'
                )
        elif v.isdigit():
            # Chat ID формат
            if len(v) < 5 or len(v) > 15:
                raise ValueError('Telegram chat_id должен содержать 5-15 цифр')
        else:
            raise ValueError(
                'Telegram должен быть в формате @username или chat_id (только цифры)'
            )
        
        return v
    
    @field_validator('telegram_bot_token')
    @classmethod
    def validate_telegram_bot_token(cls, v):
        """Валидация токена Telegram бота"""
        if v is None:
            return v
            
        token = v.get_secret_value() if isinstance(v, SecretStr) else str(v)
        
        # Если токен пустой, то это нормально (опциональный параметр)
        if not token or token.strip() == '':
            return None
        
        # Формат токена: XXXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        if not re.match(r'^\d{8,10}:[a-zA-Z0-9_-]{35}$', token):
            raise ValueError(
                'Неверный формат токена Telegram бота. '
                'Получите токен у @BotFather в Telegram'
            )
        
        return v
    
    @field_validator('secret_key')
    @classmethod
    def validate_secret_key(cls, v):
        """Валидация секретного ключа"""
        if v == "your-secret-key-change-in-production":
            raise ValueError(
                'ВАЖНО: Измените SECRET_KEY в production окружении! '
                'Используйте команду: openssl rand -hex 32'
            )
        
        if len(v) < 32:
            raise ValueError('SECRET_KEY должен содержать минимум 32 символа')
        
        return v

    def get_database_url(self) -> str:
        """Получить URL базы данных как строку"""
        return str(self.database_url)
    
    def get_admin_password(self) -> str:
        """Получить пароль администратора"""
        return self.admin_password.get_secret_value()
    
    def get_telegram_bot_token(self) -> Optional[str]:
        """Получить токен Telegram бота"""
        if self.telegram_bot_token:
            return self.telegram_bot_token.get_secret_value()
        return None
    
    def is_production(self) -> bool:
        """Проверить является ли окружение production"""
        return not self.debug and os.getenv('ENV', '').lower() == 'production'
    
    def validate_production_ready(self) -> list[str]:
        """Проверить готовность к production развертыванию"""
        issues = []
        
        if self.debug:
            issues.append("DEBUG=True в production недопустимо")
        
        if self.secret_key == "your-secret-key-change-in-production":
            issues.append("SECRET_KEY должен быть изменен в production")
        
        admin_pass = self.get_admin_password()
        if len(admin_pass) < 12:
            issues.append("Пароль администратора слишком простой для production")
        
        if not self.get_telegram_bot_token():
            issues.append("Рекомендуется настроить TELEGRAM_BOT_TOKEN для уведомлений")
        
        return issues


# Создаем единый экземпляр настроек
try:
    settings = Settings()
    
    # Дополнительная проверка для production
    if settings.is_production():
        production_issues = settings.validate_production_ready()
        if production_issues:
            raise ValueError(
                "Проблемы конфигурации для production:\n" + 
                "\n".join(f"- {issue}" for issue in production_issues)
            )
    
except Exception as e:
    print(f"❌ КРИТИЧЕСКАЯ ОШИБКА КОНФИГУРАЦИИ: {e}")
    print("\n📋 Проверьте следующие переменные окружения:")
    print("- ADMIN_PASSWORD (обязательно, минимум 8 символов)")
    print("- DATABASE_URL (опционально, по умолчанию: postgresql://postgres:postgres@db:5432/kanban)")
    print("- ADMIN_USERNAME (опционально, по умолчанию: admin)")
    print("- ADMIN_TELEGRAM (опционально, по умолчанию: @admin)")
    print("- TELEGRAM_BOT_TOKEN (опционально, для уведомлений)")
    print("- SECRET_KEY (рекомендуется для production)")
    print("\n🔧 Пример .env файла:")
    print("ADMIN_PASSWORD=YourSecurePassword123")
    print("ADMIN_USERNAME=admin")
    print("ADMIN_TELEGRAM=@yourtelegram")
    print("TELEGRAM_BOT_TOKEN=1234567890:AAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIII")
    print("SECRET_KEY=$(openssl rand -hex 32)")
    raise SystemExit(1)


# Экспорт для обратной совместимости
def get_settings() -> Settings:
    """Получить настройки приложения"""
    return settings 