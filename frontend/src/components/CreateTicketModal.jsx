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
  Typography
} from '@mui/material';
import { api } from '../services/api';

const CreateTicketModal = ({ open, onClose, onSuccess, columnId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    };
    fetchUsers();
  }, []);

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

    console.log('Отправка данных тикета:', {
      title,
      description,
      story_points: parseInt(storyPoints),
      column_id: columnId,
      assignee_id: assigneeId || null
    });
    
    try {
      const response = await api.post('/api/cards', {
        title: title.trim(),
        description: description.trim(),
        story_points: parseInt(storyPoints),
        column_id: columnId,
        assignee_id: assigneeId || null
      });
      console.log('Ответ сервера:', response.data);
      onClose();
      onSuccess(response.data);
    } catch (error) {
      console.error('Ошибка при создании тикета:', error.response?.data || error.message);
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
            <FormControl fullWidth margin="dense">
              <InputLabel>Исполнитель</InputLabel>
              <Select
                value={assigneeId}
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
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
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