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
import { api, updateCard, deleteCard, getUsers, getColumn } from '../services/api';
import CommentsSection from './CommentsSection';

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

  useEffect(() => {
    if (ticket) {
      console.log('EditTicketModal: получен тикет:', ticket);
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setStoryPoints(ticket.story_points?.toString() || '');
      setAssigneeId(ticket.assignee_id || '');
      setApproverId(ticket.approver_id || '');
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
    const fetchUsersData = async () => {
      try {
        const usersData = await getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    };
    fetchUsersData();
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

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = currentTag.trim();
      if (!newTag) return;
      
      if (tags.length >= 5) {
        setError('Максимальное количество тегов - 5');
        return;
      }
      
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
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

    if (!title.trim()) {
      setError('Название обязательно');
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
      // Добавляем # к тегам перед отправкой
      const formattedTags = tags.map(tag => {
        const tagName = tag.startsWith('#') ? tag : `#${tag}`;
        return tagName.replace(/^#+/, '#'); // Убираем лишние # в начале
      });
      console.log('Отправляем теги на бэкенд:', formattedTags);
      
      const cardData = {
        title: title.trim(),
        description: description.trim(),
        story_points: parseInt(storyPoints),
        assignee_id: assigneeId || null,
        approver_id: approverId || null,
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

  const isDoneColumn = columnTitle === 'Done';
  const editButton = isDoneColumn ? (
    <Tooltip title="Тикет в колонке Done нельзя редактировать">
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
                      color="primary"
                      variant="outlined"
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
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            {!isEditing && (ticket?.assignee || ticket?.approver) && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Участники:
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