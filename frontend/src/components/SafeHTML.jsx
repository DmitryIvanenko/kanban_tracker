import React from 'react';
import { sanitizeUserInput } from '../utils/sanitizer';

/**
 * Компонент для безопасного отображения пользовательского HTML контента
 * @param {Object} props - Пропсы компонента
 * @param {string} props.content - Контент для отображения
 * @param {string} props.level - Уровень санитизации ('STRICT', 'BASIC', 'COMMENTS')
 * @param {string} props.tag - HTML тег-контейнер (по умолчанию 'span')
 * @param {Object} props.style - Дополнительные стили
 * @param {string} props.className - CSS классы
 * @param {Object} props.sx - MUI стили (если используется)
 * @returns {JSX.Element} - Безопасный HTML элемент
 */
const SafeHTML = ({ 
  content, 
  level = 'STRICT', 
  tag: Tag = 'span', 
  style = {},
  className = '',
  sx = {},
  ...props 
}) => {
  // Санитизируем контент
  const sanitizedContent = sanitizeUserInput(content, level);
  
  // Если контент пустой после санитизации
  if (!sanitizedContent) {
    return <Tag style={style} className={className} sx={sx} {...props} />;
  }
  
  // Для строгого уровня отображаем как обычный текст
  if (level === 'STRICT') {
    return (
      <Tag style={style} className={className} sx={sx} {...props}>
        {sanitizedContent}
      </Tag>
    );
  }
  
  // Для других уровней используем dangerouslySetInnerHTML с очищенным контентом
  return (
    <Tag 
      style={style} 
      className={className} 
      sx={sx}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      {...props}
    />
  );
};

/**
 * Специализированный компонент для отображения комментариев
 */
export const SafeComment = ({ content, ...props }) => (
  <SafeHTML 
    content={content} 
    level="COMMENTS" 
    tag="div"
    style={{ whiteSpace: 'pre-wrap', ...props.style }}
    {...props}
  />
);

/**
 * Специализированный компонент для отображения названий тикетов
 */
export const SafeTitle = ({ content, ...props }) => (
  <SafeHTML 
    content={content} 
    level="STRICT" 
    tag="span"
    {...props}
  />
);

/**
 * Специализированный компонент для отображения описаний
 */
export const SafeDescription = ({ content, ...props }) => (
  <SafeHTML 
    content={content} 
    level="BASIC" 
    tag="div"
    style={{ whiteSpace: 'pre-wrap', ...props.style }}
    {...props}
  />
);

/**
 * Специализированный компонент для отображения тегов
 */
export const SafeTag = ({ content, ...props }) => (
  <SafeHTML 
    content={content} 
    level="STRICT" 
    tag="span"
    {...props}
  />
);

export default SafeHTML; 