import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import KanbanColumn from './KanbanColumn';
import CreateTicketModal from './CreateTicketModal';
import { api } from '../services/api';
import AddIcon from '@mui/icons-material/Add';

const KanbanBoard = () => {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchColumns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/columns');
      console.log('=== НАЧАЛО ЗАГРУЗКИ КОЛОНОК ===');
      console.log('fetchColumns данные:', response.data);
      const columnsData = response.data.map(column => {
        console.log('Колонка:', column.id, 'Карточки:', column.cards);
        return {
          ...column,
          cards: column.cards || []
        };
      });
      console.log('Обработанные данные колонок:', columnsData.map(c => ({
        id: c.id,
        title: c.title,
        cardsCount: c.cards.length
      })));
      setColumns(columnsData);
      setError('');
      console.log('=== КОНЕЦ ЗАГРУЗКИ КОЛОНОК ===');
    } catch (error) {
      console.error('Ошибка при загрузке колонок:', error);
      setError('Ошибка при загрузке колонок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    console.log('=== НАЧАЛО ПЕРЕТАСКИВАНИЯ ===');
    console.log('onDragEnd вызван:', { destination, source, draggableId });

    if (!destination) {
      console.log('Нет destination, отмена перетаскивания');
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('Карточка не перемещена, отмена');
      return;
    }

    const sourceColumn = columns.find(c => c.id === parseInt(source.droppableId.replace('col_', '')));
    const destColumn = columns.find(c => c.id === parseInt(destination.droppableId.replace('col_', '')));
    console.log('Найдены колонки:', { 
      sourceColumnId: sourceColumn?.id, 
      sourceColumnCards: sourceColumn?.cards,
      destColumnId: destColumn?.id,
      destColumnCards: destColumn?.cards
    });

    const sourceCards = Array.from(sourceColumn.cards);
    const destCards = source.droppableId === destination.droppableId
      ? sourceCards
      : Array.from(destColumn.cards);
    console.log('Карточки до перемещения:', { 
      sourceCardsCount: sourceCards.length,
      destCardsCount: destCards.length
    });

    const [removed] = sourceCards.splice(source.index, 1);
    destCards.splice(destination.index, 0, removed);
    console.log('Карточки после перемещения:', { 
      sourceCardsCount: sourceCards.length,
      destCardsCount: destCards.length,
      movedCard: removed
    });

    const newColumns = columns.map(column =>
      column.id === parseInt(source.droppableId.replace('col_', ''))
        ? { ...column, cards: sourceCards }
        : column.id === parseInt(destination.droppableId.replace('col_', ''))
          ? { ...column, cards: destCards }
          : column
    );
    console.log('Новые колонки:', newColumns.map(c => ({
      id: c.id,
      title: c.title,
      cardsCount: c.cards.length
    })));

    setColumns(newColumns);

    try {
      const cardId = parseInt(draggableId.replace('card-', ''));
      console.log('Отправка запроса на обновление позиции карточки:', {
        cardId,
        fromColumn: parseInt(source.droppableId.replace('col_', '')),
        toColumn: parseInt(destination.droppableId.replace('col_', '')),
        newPosition: destination.index
      });
      
      const response = await api.post(`/api/cards/${cardId}/move`, {
        from_column: parseInt(source.droppableId.replace('col_', '')),
        to_column: parseInt(destination.droppableId.replace('col_', '')),
        new_position: destination.index
      });
      
      console.log('Ответ сервера:', response.data);
      console.log('Позиция карточки успешно обновлена');
      
      // Обновляем колонки после успешного перемещения
      await fetchColumns();
    } catch (err) {
      console.error('Ошибка при обновлении позиции карточки:', err);
      console.log('Восстанавливаем исходное состояние...');
      fetchColumns(); // Восстанавливаем исходное состояние при ошибке
    }
    console.log('=== КОНЕЦ ПЕРЕТАСКИВАНИЯ ===');
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      const firstColumnId = columns[0].id;
      if (!firstColumnId) {
        throw new Error('Нет доступных колонок');
      }

      const columnId = firstColumnId;
      console.log('Отправка запроса на создание тикета:', {
        ...ticketData,
        column_id: columnId
      });
      
      const response = await api.post('/api/cards', {
        ...ticketData,
        column_id: columnId
      });

      console.log('Создан новый тикет:', response.data);
      
      // Обновляем колонки после создания тикета
      await fetchColumns();
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Ошибка при создании тикета:', err);
      setError('Не удалось создать тикет');
    }
  };

  const handleCardCreated = async (newCard) => {
    console.log('handleCardCreated вызван, newCard:', newCard);
    try {
      await fetchColumns();
    } catch (error) {
      console.error('Ошибка при обновлении колонок:', error);
      setError('Ошибка при обновлении колонок');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Канбан Доска
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsCreateModalOpen(true)}
            startIcon={<AddIcon />}
          >
            Создать тикет
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', minHeight: 'calc(100vh - 200px)' }}>
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCardCreated={handleCardCreated}
            />
          ))}
        </Box>

        <CreateTicketModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCardCreated}
          columnId={columns[0]?.id}
        />
      </Box>
    </DragDropContext>
  );
};

export default KanbanBoard; 