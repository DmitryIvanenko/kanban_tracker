import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import KanbanColumn from './KanbanColumn';
import CreateTicketModal from './CreateTicketModal';
import { getColumns, moveCard } from '../services/api';
import AddIcon from '@mui/icons-material/Add';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

const KanbanBoard = () => {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rcZmFilter, setRcZmFilter] = useState('Показать все');

  // Опции фильтра
  const filterOptions = [
    'Показать все',
    'Центр',
    'Юг',
    'Урал',
    'Сибирь'
  ];

  // Функция для фильтрации карточек
  const filterCards = (cards, filter) => {
    if (filter === 'Показать все') {
      return cards;
    }
    return cards.filter(card => card.rc_zm === filter);
  };

  // Функция для получения карточек не попавших в фильтр
  const getFilteredOutCards = (cards, filter) => {
    if (filter === 'Показать все') {
      return [];
    }
    return cards.filter(card => !card.rc_zm || card.rc_zm !== filter);
  };

  // Создаем отфильтрованные колонки для каждого swimlane
  const getFilteredColumns = (filter) => {
    return columns.map(column => {
      const filteredCards = filterCards(column.cards, filter);
      const filteredOutCards = getFilteredOutCards(column.cards, filter);
      
      return {
        ...column,
        filteredCards,
        filteredOutCards
      };
    });
  };

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

    // Обновленная логика drag & drop для работы с swimlanes
    const parseDroppableId = (id) => {
      // Формат: "swimlane-filtered-col_1" или "swimlane-filtered-out-col_1"
      const parts = id.split('-');
      const isFilteredOut = parts.includes('out');
      const columnId = parseInt(parts[parts.length - 1].replace('col_', ''));
      return { columnId, isFilteredOut };
    };

    const sourceInfo = parseDroppableId(source.droppableId);
    const destInfo = parseDroppableId(destination.droppableId);

    const sourceColumn = columns.find(c => c.id === sourceInfo.columnId);
    const destColumn = columns.find(c => c.id === destInfo.columnId);

    if (!sourceColumn || !destColumn) {
      console.error('Не найдены колонки:', { sourceInfo, destInfo });
      return;
    }

    // Получаем карточки из правильного swimlane
    const sourceCards = Array.from(sourceInfo.isFilteredOut ? 
      getFilteredOutCards(sourceColumn.cards, rcZmFilter) : 
      filterCards(sourceColumn.cards, rcZmFilter)
    );

    const destCards = sourceInfo.columnId === destInfo.columnId && sourceInfo.isFilteredOut === destInfo.isFilteredOut
      ? sourceCards
      : Array.from(destInfo.isFilteredOut ? 
          getFilteredOutCards(destColumn.cards, rcZmFilter) : 
          filterCards(destColumn.cards, rcZmFilter)
        );

    const [removed] = sourceCards.splice(source.index, 1);
    destCards.splice(destination.index, 0, removed);

    // Пересчитываем все карточки для колонки
    const updateColumnCards = (column, newFilteredCards, newFilteredOutCards) => {
      // Объединяем все карточки обратно
      const allCards = [...newFilteredCards, ...newFilteredOutCards];
      return { ...column, cards: allCards };
    };

    // Обновляем колонки с новыми позициями
    const newColumns = columns.map(column => {
      if (column.id === sourceInfo.columnId) {
        const currentFiltered = sourceInfo.isFilteredOut ? 
          filterCards(column.cards, rcZmFilter) : 
          (sourceInfo.columnId === destInfo.columnId && !destInfo.isFilteredOut ? destCards : filterCards(column.cards, rcZmFilter));
        const currentFilteredOut = sourceInfo.isFilteredOut ? 
          (sourceInfo.columnId === destInfo.columnId && destInfo.isFilteredOut ? destCards : sourceCards) : 
          getFilteredOutCards(column.cards, rcZmFilter);
        return updateColumnCards(column, currentFiltered, currentFilteredOut);
      } else if (column.id === destInfo.columnId && sourceInfo.columnId !== destInfo.columnId) {
        const currentFiltered = destInfo.isFilteredOut ? 
          filterCards(column.cards, rcZmFilter) : 
          destCards;
        const currentFilteredOut = destInfo.isFilteredOut ? 
          destCards : 
          getFilteredOutCards(column.cards, rcZmFilter);
        return updateColumnCards(column, currentFiltered, currentFilteredOut);
      }
      return column;
    });

    setColumns(newColumns);

    try {
      const cardId = parseInt(draggableId.replace('card-', ''));
      const moveData = {
        from_column: sourceInfo.columnId,
        to_column: destInfo.columnId,
        new_position: destination.index
      };
      
      const response = await moveCard(cardId, moveData);
      console.log('Ответ сервера:', response);
      
      // Обновляем колонки после успешного перемещения
      await fetchColumns();
    } catch (err) {
      console.error('Ошибка при обновлении позиции карточки:', err);
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

  const filteredColumns = getFilteredColumns(rcZmFilter);
  const hasFilteredOutCards = rcZmFilter !== 'Показать все' && 
    filteredColumns.some(col => col.filteredOutCards.length > 0);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Фильтр по РЦ ЗМ</InputLabel>
            <Select
              value={rcZmFilter}
              label="Фильтр по РЦ ЗМ"
              onChange={(e) => setRcZmFilter(e.target.value)}
              startAdornment={<FilterAltIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {filterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

        {/* Верхний swimlane - отфильтрованные карточки */}
        <Box sx={{ mb: hasFilteredOutCards ? 4 : 0 }}>
          {rcZmFilter !== 'Показать все' && (
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Отфильтрованные тикеты ({rcZmFilter})
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
            {filteredColumns.map((column) => (
              <KanbanColumn
                key={`filtered-${column.id}`}
                column={{
                  ...column,
                  cards: column.filteredCards
                }}
                swimlanePrefix="swimlane-filtered"
              />
            ))}
          </Box>
        </Box>

        {/* Нижний swimlane - неотфильтрованные карточки */}
        {hasFilteredOutCards && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
              Остальные тикеты
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
              {filteredColumns.map((column) => (
                <KanbanColumn
                  key={`filtered-out-${column.id}`}
                  column={{
                    ...column,
                    cards: column.filteredOutCards
                  }}
                  swimlanePrefix="swimlane-filtered-out"
                />
              ))}
            </Box>
          </Box>
        )}

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