import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Tooltip,
  Divider
} from '@mui/material';
import { api, updateCard, deleteCard, getUsers, getColumn, getRealEstateTypes } from '../services/api';
import CommentsSection from './CommentsSection';
import { validateAndSanitizeTitle, sanitizeUserInput } from '../utils/sanitizer';

const EditTicketModal = ({ open, onClose, onSuccess, ticket }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [realEstateType, setRealEstateType] = useState('');
  const [realEstateTypes, setRealEstateTypes] = useState([]);
  const [rcMk, setRcMk] = useState('');
  const [rcZm, setRcZm] = useState('');

  // Опции для РЦ полей
  const rcOptions = [
    { value: 'CENTR', label: 'Центр' },
    { value: 'UG', label: 'Юг' },
    { value: 'URAL', label: 'Урал' },
    { value: 'SIBIR', label: 'Сибирь' }
  ];

  // Функция для конвертации русского значения в английскую константу
  const convertRussianToConstant = (russianValue) => {
    const option = rcOptions.find(opt => opt.label === russianValue);
    return option ? option.value : '';
  };

  // Функция для конвертации русского значения типа недвижимости в английскую константу
  const convertRealEstateTypeToConstant = (russianValue) => {
    const type = realEstateTypes.find(type => type.label === russianValue);
    return type ? type.value : '';
  };

  useEffect(() => {
    if (ticket) {
      console.log('EditTicketModal: получен тикет:', ticket);
      console.log('EditTicketModal: rc_mk:', ticket.rc_mk);
      console.log('EditTicketModal: rc_zm:', ticket.rc_zm);
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setStoryPoints(ticket.story_points?.toString() || '');
      setAssigneeId(ticket.assignee_id || '');
      setApproverId(ticket.approver_id || '');
      // realEstateType будет установлен в отдельном useEffect после загрузки realEstateTypes
      setRcMk(convertRussianToConstant(ticket.rc_mk) || '');
      setRcZm(convertRussianToConstant(ticket.rc_zm) || '');
      console.log('EditTicketModal: теги тикета:', ticket.tags);
      console.log('EditTicketModal: тип тегов:', typeof ticket.tags);
      console.log('EditTicketModal: теги тикета (JSON):', JSON.stringify(ticket.tags));
      const tagNames = ticket.tags?.map(tag => {
        if (typeof tag === 'string') return tag;
        if (typeof tag === 'object' && tag.name) return tag.name.replace('#', '');
        return '';
      }).filter(Boolean) || [];
      setTags(tagNames);
      
      // Получаем название колонки
      const fetchColumnTitle = async () => {
        try {
          const columnData = await getColumn(ticket.column_id);
          setColumnTitle(columnData.title);
        } catch (error) {
          console.error('Ошибка при получении информации о колонке:', error);
        }
      };
      fetchColumnTitle();
    }
  }, [ticket]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, realEstateTypesData] = await Promise.all([
          getUsers(),
          getRealEstateTypes()
        ]);
        setUsers(usersData);
        setRealEstateTypes(realEstateTypesData.types);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchColumnTitle = async () => {
      if (ticket?.column_id) {
        try {
          const columnData = await getColumn(ticket.column_id);
          setColumnTitle(columnData.title);
        } catch (error) {
          console.error('Ошибка при загрузке колонки:', error);
        }
      }
    };
    fetchColumnTitle();
  }, [ticket]);

  // Инициализация realEstateType после загрузки realEstateTypes
  useEffect(() => {
    if (ticket && realEstateTypes.length > 0) {
      setRealEstateType(convertRealEstateTypeToConstant(ticket.real_estate_type) || '');
    }
  }, [ticket, realEstateTypes]);

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = sanitizeUserInput(currentTag.trim(), 'STRICT');
      if (!newTag) return;
      
      if (tags.length >= 5) {
        setError('Максимальное количество тегов - 5');
        return;
      }
      
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setError(''); // Очищаем ошибку если тег добавлен успешно
      }
      setCurrentTag('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидируем и санитизируем название
    const titleValidation = validateAndSanitizeTitle(title.trim());
    if (!titleValidation.isValid) {
      setError(titleValidation.message);
      return;
    }

    if (!storyPoints || isNaN(Number(storyPoints))) {
      setError('Story Points должны быть числом');
      return;
    }

    if (tags.length > 5) {
      setError('Максимальное количество тегов - 5');
      return;
    }

    try {
      // Санитизируем описание
      const sanitizedDescription = sanitizeUserInput(description.trim(), 'BASIC');
      
      // Санитизируем и форматируем теги
      const formattedTags = tags.map(tag => {
        const sanitizedTag = sanitizeUserInput(tag, 'STRICT');
        const tagName = sanitizedTag.startsWith('#') ? sanitizedTag : `#${sanitizedTag}`;
        return tagName.replace(/^#+/, '#'); // Убираем лишние # в начале
      });
      console.log('Отправляем теги на бэкенд:', formattedTags);
      
      const cardData = {
        title: titleValidation.sanitized,
        description: sanitizedDescription,
        story_points: parseInt(storyPoints),
        assignee_id: assigneeId || null,
        approver_id: approverId || null,
        real_estate_type: realEstateType || null,
        rc_mk: rcMk || null,
        rc_zm: rcZm || null,
        tags: formattedTags
      };
      
      const response = await updateCard(ticket.id, cardData);
      
      onClose();
      onSuccess(response);
    } catch (error) {
      console.error('Ошибка при обновлении тикета:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Ошибка при обновлении тикета');
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCard(ticket.id);
      setIsDeleteDialogOpen(false);
      onClose();
      onSuccess(null); // Передаем null чтобы указать, что карточка удалена
    } catch (error) {
      console.error('Ошибка при удалении тикета:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Ошибка при удалении тикета');
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  const isDoneColumn = columnTitle === 'Готово';
  const editButton = isDoneColumn ? (
    <Tooltip title="Тикет в колонке Готово нельзя редактировать">
      <span>
        <Button 
          variant="contained" 
          color="primary" 
          disabled
          sx={{ bgcolor: 'grey.400' }}
        >
          Изменить
        </Button>
      </span>
    </Tooltip>
  ) : (
    <Button onClick={handleEditClick} variant="contained" color="primary">
      Изменить
    </Button>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="edit-ticket-dialog-title"
      aria-describedby="edit-ticket-dialog-description"
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle id="edit-ticket-dialog-title">
        {isEditing ? 'Редактировать тикет' : 'Просмотр тикета'}
      </DialogTitle>
      
      <DialogContent 
        id="edit-ticket-dialog-description"
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          pb: 0 // Убираем нижний отступ
        }}
      >
        {/* Форма с основной информацией о тикете */}
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Номер тикета - неизменяемое поле */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'grey.300'
            }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Номер тикета
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {ticket?.ticket_number || `CMD-${String(ticket?.id || 0).padStart(7, '0')}`}
              </Typography>
            </Box>
            
            <TextField
              label="Название"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditing}
              error={!!error && !title.trim()}
              helperText={error && !title.trim() ? error : ''}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isEditing}
            />
            <TextField
              label="Story Points"
              type="number"
              fullWidth
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              disabled={!isEditing}
              error={!!error && (!storyPoints || isNaN(Number(storyPoints)))}
              helperText={error && (!storyPoints || isNaN(Number(storyPoints))) ? error : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Исполнитель</InputLabel>
              <Select
                value={assigneeId}
                label="Исполнитель"
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!isEditing}
              >
                <MenuItem value="">
                  <em>Не назначен</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Согласующий</InputLabel>
              <Select
                value={approverId}
                label="Согласующий"
                onChange={(e) => setApproverId(e.target.value)}
                disabled={!isEditing}
              >
                <MenuItem value="">
                  <em>Не назначен</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Тип недвижимости</InputLabel>
              <Select
                value={realEstateType}
                label="Тип недвижимости"
                onChange={(e) => setRealEstateType(e.target.value)}
                disabled={!isEditing}
              >
                <MenuItem value="">
                  <em>Не выбран</em>
                </MenuItem>
                {realEstateTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>РЦ МК</InputLabel>
              <Select
                value={rcMk}
                label="РЦ МК"
                onChange={(e) => setRcMk(e.target.value)}
                disabled={!isEditing}
              >
                <MenuItem value="">
                  <em>Не выбран</em>
                </MenuItem>
                {rcOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>РЦ ЗМ</InputLabel>
              <Select
                value={rcZm}
                label="РЦ ЗМ"
                onChange={(e) => setRcZm(e.target.value)}
                disabled={!isEditing}
              >
                <MenuItem value="">
                  <em>Не выбран</em>
                </MenuItem>
                {rcOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {isEditing && (
              <Box>
                <TextField
                  label="Добавить тег"
                  fullWidth
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  helperText="Нажмите Enter для добавления тега"
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      variant="outlined"
                      sx={{
                        color: '#787e3f',
                        borderColor: '#787e3f',
                        '&:hover': {
                          bgcolor: 'rgba(120, 126, 63, 0.08)',
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {!isEditing && tags && tags.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Теги:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      variant="outlined"
                      sx={{
                        color: '#787e3f',
                        borderColor: '#787e3f',
                        '&:hover': {
                          bgcolor: 'rgba(120, 126, 63, 0.08)',
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {!isEditing && (ticket?.assignee || ticket?.approver || ticket?.real_estate_type || ticket?.rc_mk || ticket?.rc_zm) && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Дополнительная информация:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {ticket?.assignee && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Исполнитель:
                      </Typography>
                      <Typography variant="body2">
                        {ticket.assignee.username}
                      </Typography>
                    </Box>
                  )}
                  {ticket?.approver && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Согласующий:
                      </Typography>
                      <Typography variant="body2">
                        {ticket.approver.username}
                      </Typography>
                    </Box>
                  )}
                  {ticket?.real_estate_type && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Тип недвижимости:
                      </Typography>
                      <Typography variant="body2">
                        {realEstateTypes.find(type => type.value === ticket.real_estate_type)?.label || ticket.real_estate_type}
                      </Typography>
                    </Box>
                  )}
                  {ticket?.rc_mk && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        РЦ МК:
                      </Typography>
                      <Typography variant="body2">
                        {rcOptions.find(option => option.label === ticket.rc_mk)?.label || ticket.rc_mk}
                      </Typography>
                    </Box>
                  )}
                  {ticket?.rc_zm && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        РЦ ЗМ:
                      </Typography>
                      <Typography variant="body2">
                        {rcOptions.find(option => option.label === ticket.rc_zm)?.label || ticket.rc_zm}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </form>
        
        {/* Разделитель */}
        <Divider sx={{ my: 2 }} />
        
        {/* Секция комментариев - ВНЕ основной формы */}
        {ticket && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <CommentsSection cardId={ticket.id} />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        {/* Кнопка удаления слева */}
        <Button 
          onClick={handleDeleteClick} 
          variant="outlined" 
          color="error"
          sx={{ mr: 'auto' }}
        >
          Удалить тикет
        </Button>
        
        {/* Основные кнопки справа */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose}>
            {isEditing ? 'Отмена' : 'Закрыть'}
          </Button>
          {isEditing ? (
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Сохранить
            </Button>
          ) : (
            editButton
          )}
        </Box>
      </DialogActions>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Вы точно уверены, что хотите удалить тикет "{ticket?.title}"?
            <br />
            <strong>Это действие нельзя отменить.</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Отмена
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default EditTicketModal; 