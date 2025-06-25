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
import { getColumns, moveCard } from '../services/api';
import AddIcon from '@mui/icons-material/Add';

const KanbanBoard = () => {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchColumns = async () => {
    try {
      console.log('Загрузка колонок...');
      const columnsData = await getColumns();
      console.log('Полученные колонки:', columnsData);
      setColumns(columnsData);
    } catch (error) {
      console.error('Ошибка при загрузке колонок:', error);
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
      
      const moveData = {
        from_column: parseInt(source.droppableId.replace('col_', '')),
        to_column: parseInt(destination.droppableId.replace('col_', '')),
        new_position: destination.index
      };
      
      const response = await moveCard(cardId, moveData);
      
      console.log('Ответ сервера:', response);
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

  const handleCardCreated = async (newCard) => {
    console.log('KanbanBoard: handleCardCreated вызван, newCard:', newCard);
    console.log('KanbanBoard: тип newCard:', typeof newCard);
    console.log('KanbanBoard: newCard JSON:', JSON.stringify(newCard));
    try {
      console.log('KanbanBoard: обновляю колонки после создания карточки...');
      await fetchColumns();
      console.log('KanbanBoard: колонки успешно обновлены');
    } catch (error) {
      console.error('KanbanBoard: ошибка при обновлении колонок:', error);
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => setIsCreateModalOpen(true)}
            startIcon={<AddIcon />}
            sx={{ 
              bgcolor: '#fadfa8',
              color: '#000000',
              '&:hover': {
                bgcolor: '#f0d495',
              }
            }}
          >
            Создать тикет
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
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