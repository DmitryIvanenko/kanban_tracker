import DOMPurify from 'dompurify';

/**
 * Конфигурация для различных типов контента
 */
const SANITIZE_CONFIGS = {
  // Строгая конфигурация - только текст, никакого HTML
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  },
  
  // Базовая конфигурация - только безопасные теги для форматирования
  BASIC: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  },
  
  // Для комментариев - позволяем немного больше форматирования
  COMMENTS: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }
};

/**
 * Санитизирует пользовательский ввод от XSS атак
 * @param {string} input - Входная строка
 * @param {string} level - Уровень санитизации ('STRICT', 'BASIC', 'COMMENTS')
 * @returns {string} - Очищенная строка
 */
export const sanitizeUserInput = (input, level = 'STRICT') => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config = SANITIZE_CONFIGS[level] || SANITIZE_CONFIGS.STRICT;
  
  // Создаем очищенную версию
  const cleaned = DOMPurify.sanitize(input, config);
  
  // Дополнительная проверка на потенциально опасные паттерны
  const dangerousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];
  
  let result = cleaned;
  dangerousPatterns.forEach(pattern => {
    result = result.replace(pattern, '');
  });
  
  return result;
};

/**
 * Санитизирует объект с пользовательскими данными
 * @param {Object} data - Объект с данными
 * @param {Object} fieldConfig - Конфигурация полей { fieldName: 'STRICT'|'BASIC'|'COMMENTS' }
 * @returns {Object} - Очищенный объект
 */
export const sanitizeObject = (data, fieldConfig = {}) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  Object.keys(fieldConfig).forEach(fieldName => {
    if (sanitized[fieldName]) {
      const level = fieldConfig[fieldName];
      sanitized[fieldName] = sanitizeUserInput(sanitized[fieldName], level);
    }
  });
  
  return sanitized;
};

/**
 * Безопасно экранирует HTML символы для отображения как обычный текст
 * @param {string} text - Текст для экранирования
 * @returns {string} - Экранированный текст
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Проверяет, содержит ли строка потенциально опасный контент
 * @param {string} input - Строка для проверки
 * @returns {boolean} - true если обнаружен подозрительный контент
 */
export const containsSuspiciousContent = (input) => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const suspiciousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\(/gi,
    /url\(/gi
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Валидатор для названий тикетов и других коротких текстов
 * @param {string} title - Название для валидации
 * @returns {Object} - { isValid: boolean, message: string, sanitized: string }
 */
export const validateAndSanitizeTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return {
      isValid: false,
      message: 'Название не может быть пустым',
      sanitized: ''
    };
  }

  if (containsSuspiciousContent(title)) {
    return {
      isValid: false,
      message: 'Название содержит недопустимые символы или код',
      sanitized: sanitizeUserInput(title, 'STRICT')
    };
  }

  const sanitized = sanitizeUserInput(title, 'STRICT');
  
  if (sanitized.length > 200) {
    return {
      isValid: false,
      message: 'Название слишком длинное (максимум 200 символов)',
      sanitized: sanitized.substring(0, 200)
    };
  }

  return {
    isValid: true,
    message: '',
    sanitized
  };
};

/**
 * Валидатор для комментариев
 * @param {string} comment - Комментарий для валидации
 * @returns {Object} - { isValid: boolean, message: string, sanitized: string }
 */
export const validateAndSanitizeComment = (comment) => {
  if (!comment || typeof comment !== 'string') {
    return {
      isValid: false,
      message: 'Комментарий не может быть пустым',
      sanitized: ''
    };
  }

  if (containsSuspiciousContent(comment)) {
    return {
      isValid: false,
      message: 'Комментарий содержит недопустимые символы или код',
      sanitized: sanitizeUserInput(comment, 'COMMENTS')
    };
  }

  const sanitized = sanitizeUserInput(comment, 'COMMENTS');
  
  if (sanitized.length > 2000) {
    return {
      isValid: false,
      message: 'Комментарий слишком длинный (максимум 2000 символов)',
      sanitized: sanitized.substring(0, 2000)
    };
  }

  return {
    isValid: true,
    message: '',
    sanitized
  };
}; 