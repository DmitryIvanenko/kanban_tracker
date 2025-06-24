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
  Chip
} from '@mui/material';
import { getUsers, createCard } from '../services/api';

const CreateTicketModal = ({ open, onClose, onSuccess, columnId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      const newTag = currentTag.trim();
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

    console.log('CreateTicketModal: начало обработки формы');
    console.log('CreateTicketModal: title:', title);
    console.log('CreateTicketModal: description:', description);
    console.log('CreateTicketModal: storyPoints:', storyPoints);
    console.log('CreateTicketModal: columnId:', columnId);
    console.log('CreateTicketModal: assigneeId:', assigneeId);
    console.log('CreateTicketModal: approverId:', approverId);
    console.log('CreateTicketModal: tags:', tags);

    if (!title.trim()) {
      console.log('CreateTicketModal: ошибка - пустое название');
      setError('Название обязательно');
      return;
    }

    if (!storyPoints || isNaN(Number(storyPoints))) {
      console.log('CreateTicketModal: ошибка - некорректные Story Points');
      setError('Story Points должны быть числом');
      return;
    }

    const cardData = {
      title: title.trim(),
      description: description.trim(),
      story_points: parseInt(storyPoints),
      column_id: columnId,
      assignee_id: assigneeId || null,
      approver_id: approverId || null,
      tags
    };

    console.log('CreateTicketModal: отправка данных тикета:', cardData);
    
    try {
      console.log('CreateTicketModal: выполняю запрос к API...');
      const response = await createCard(cardData);
      console.log('CreateTicketModal: ответ сервера:', response);
      
      // Очищаем форму
      setTitle('');
      setDescription('');
      setStoryPoints('');
      setAssigneeId('');
      setApproverId('');
      setTags([]);
      setCurrentTag('');
      
      console.log('CreateTicketModal: закрываю модальное окно');
      onClose();
      console.log('CreateTicketModal: вызываю onSuccess');
      onSuccess(response);
    } catch (error) {
      console.error('CreateTicketModal: ошибка при создании тикета:', error);
      console.error('CreateTicketModal: response data:', error.response?.data);
      console.error('CreateTicketModal: response status:', error.response?.status);
      console.error('CreateTicketModal: message:', error.message);
      setError(error.response?.data?.detail || 'Ошибка при создании тикета');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="create-ticket-dialog-title"
      aria-describedby="create-ticket-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="create-ticket-dialog-title">Создать тикет</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent id="create-ticket-dialog-description">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              label="Название"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            />
            <TextField
              required
              label="Story Points"
              type="number"
              fullWidth
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              error={!!error && (!storyPoints || isNaN(Number(storyPoints)))}
              helperText={error && (!storyPoints || isNaN(Number(storyPoints))) ? error : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Исполнитель</InputLabel>
              <Select
                value={assigneeId}
                label="Исполнитель"
                onChange={(e) => setAssigneeId(e.target.value)}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" color="primary">
            Создать
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateTicketModal; 