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
import { getUsers, createCard, getRealEstateTypes } from '../services/api';
import { validateAndSanitizeTitle, sanitizeUserInput } from '../utils/sanitizer';

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

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      const newTag = sanitizeUserInput(currentTag.trim(), 'STRICT');
      
      if (newTag && !tags.includes(newTag)) {
        if (tags.length >= 5) {
          setError('Максимальное количество тегов - 5');
          return;
        }
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

    console.log('CreateTicketModal: начало обработки формы');
    console.log('CreateTicketModal: title:', title);
    console.log('CreateTicketModal: description:', description);
    console.log('CreateTicketModal: storyPoints:', storyPoints);
    console.log('CreateTicketModal: columnId:', columnId);
    console.log('CreateTicketModal: assigneeId:', assigneeId);
    console.log('CreateTicketModal: realEstateType:', realEstateType);
    console.log('CreateTicketModal: tags:', tags);

    // Валидируем и санитизируем название
    const titleValidation = validateAndSanitizeTitle(title.trim());
    if (!titleValidation.isValid) {
      console.log('CreateTicketModal: ошибка - некорректное название:', titleValidation.message);
      setError(titleValidation.message);
      return;
    }

    if (!storyPoints || isNaN(Number(storyPoints))) {
      console.log('CreateTicketModal: ошибка - некорректные Story Points');
      setError('Story Points должны быть числом');
      return;
    }

    // Санитизируем описание
    const sanitizedDescription = sanitizeUserInput(description.trim(), 'BASIC');
    
    // Санитизируем теги
    const sanitizedTags = tags.map(tag => sanitizeUserInput(tag, 'STRICT'));

    const cardData = {
      title: titleValidation.sanitized,
      description: sanitizedDescription,
      story_points: parseInt(storyPoints),
      column_id: columnId,
      assignee_id: assigneeId || null,
      approver_id: approverId || null,
      real_estate_type: realEstateType || null,
      rc_mk: rcMk || null,
      rc_zm: rcZm || null,
      tags: sanitizedTags
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
      setRealEstateType('');
      setRcMk('');
      setRcZm('');
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
            <FormControl fullWidth>
              <InputLabel>Тип недвижимости</InputLabel>
              <Select
                value={realEstateType}
                label="Тип недвижимости"
                onChange={(e) => setRealEstateType(e.target.value)}
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