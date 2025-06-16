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
  Tooltip
} from '@mui/material';
import { api } from '../services/api';

const EditTicketModal = ({ open, onClose, onSuccess, ticket }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setStoryPoints(ticket.story_points?.toString() || '');
      setAssigneeId(ticket.assignee_id || '');
      
      // Получаем название колонки
      const fetchColumnTitle = async () => {
        try {
          const response = await api.get(`/api/columns/${ticket.column_id}`);
          setColumnTitle(response.data.title);
        } catch (error) {
          console.error('Ошибка при получении информации о колонке:', error);
        }
      };
      fetchColumnTitle();
    }
  }, [ticket]);

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

    try {
      const response = await api.put(`/api/cards/${ticket.id}`, {
        title: title.trim(),
        description: description.trim(),
        story_points: parseInt(storyPoints),
        assignee_id: assigneeId || null
      });
      
      onClose();
      onSuccess(response.data);
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing ? 'Редактирование тикета' : 'Просмотр тикета'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              disabled={!isEditing || isDoneColumn}
            />
            
            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={4}
              disabled={!isEditing || isDoneColumn}
            />
            
            <TextField
              label="Story Points"
              type="number"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              fullWidth
              disabled={!isEditing || isDoneColumn}
            />
            
            <FormControl fullWidth>
              <InputLabel id="assignee-label">Исполнитель</InputLabel>
              <Select
                labelId="assignee-label"
                label="Исполнитель"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!isEditing || isDoneColumn}
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
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Закрыть</Button>
          {isEditing ? (
            <Button type="submit" variant="contained" color="primary">
              Сохранить
            </Button>
          ) : (
            editButton
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTicketModal; 