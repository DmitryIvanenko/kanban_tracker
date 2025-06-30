import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import KanbanColumn from './KanbanColumn';
import CreateTicketModal from './CreateTicketModal';
import { getColumns, moveCard } from '../services/api';
import AddIcon from '@mui/icons-material/Add';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

const KanbanBoard = () => {
  console.log('🚀 KanbanBoard mount');
  
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rcZmFilter, setRcZmFilter] = useState('Показать все');
  const [wipLimitError, setWipLimitError] = useState(null);
  // Убираем isDragging из state - используем только ref
  // const [isDragging, setIsDragging] = useState(false);
  
  // Refs для доступа к актуальному состоянию без зависимостей
  const isDraggingRef = useRef(false);
  const columnsRef = useRef([]);
  
  // Отладочный useEffect для отслеживания mount/unmount
  useEffect(() => {
    console.log('🟢 KanbanBoard MOUNT - компонент смонтирован');
    return () => {
      console.log('🔴 KanbanBoard UNMOUNT - компонент размонтирован!');
    };
  }, []);
  
  // Синхронизируем ref с state
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Опции фильтра
  const filterOptions = [
    { value: 'Показать все', label: 'Показать все' },
    { value: 'CENTR', label: 'Центр' },
    { value: 'UG', label: 'Юг' },
    { value: 'URAL', label: 'Урал' },
    { value: 'SIBIR', label: 'Сибирь' }
  ];

  // Функция для конвертации английской константы в русское значение
  const convertConstantToRussian = (constant) => {
    const option = filterOptions.find(opt => opt.value === constant);
    return option ? option.label : constant;
  };

  // Функция для фильтрации карточек
  const filterCards = (cards, filter) => {
    if (filter === 'Показать все') {
      return cards;
    }
    const russianValue = convertConstantToRussian(filter);
    return cards.filter(card => card.rc_zm === russianValue);
  };

  // Функция для получения карточек не попавших в фильтр
  const getFilteredOutCards = (cards, filter) => {
    if (filter === 'Показать все') {
      return [];
    }
    const russianValue = convertConstantToRussian(filter);
    return cards.filter(card => !card.rc_zm || card.rc_zm !== russianValue);
  };

  // Создаем отфильтрованные колонки для каждого swimlane - перенесена в рендер для избежания лишних зависимостей

  const fetchColumns = useCallback(async (forceFetch = false) => {
    try {
      // Проверяем isDragging через ref чтобы не добавлять его в зависимости
      if (!forceFetch && isDraggingRef.current) {
        return;
      }
      
      const columnsData = await getColumns();
      setColumns(columnsData);
    } catch (error) {
      console.error('❌ Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Убираем все зависимости

  useEffect(() => {
    fetchColumns();
  }, []);

  // Отслеживание изменений в состоянии columns
  useEffect(() => {
    console.log('📊 Columns updated:', columns.length, 'columns');
  }, [columns]); // Убираем isDragging из зависимостей

  const onDragStart = useCallback((result) => {
    console.log('🎯 onDragStart');
    isDraggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(async (result) => {
    console.log('🎯 onDragEnd start');
    
    const { destination, source, draggableId } = result;

    if (!destination) {
      console.log('❌ No destination');
      isDraggingRef.current = false;
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('❌ No movement');
      isDraggingRef.current = false;
      return;
    }

    // Упрощенная логика drag & drop
    const parseDroppableId = (id) => {
      const parts = id.split('-');
      const isFilteredOut = parts.includes('out');
      const columnId = parseInt(parts[parts.length - 1].replace('col_', ''));
      return { columnId, isFilteredOut };
    };

    const sourceInfo = parseDroppableId(source.droppableId);
    const destInfo = parseDroppableId(destination.droppableId);
    const cardId = parseInt(draggableId.replace('card-', ''));
    
    // 1. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - обновляем UI локально
    console.log('⚡ Optimistic update');
    
    // Находим исходную и целевую колонки
    const sourceColumnIndex = columnsRef.current.findIndex(col => col.id === sourceInfo.columnId);
    const destColumnIndex = columnsRef.current.findIndex(col => col.id === destInfo.columnId);
    
    if (sourceColumnIndex !== -1 && destColumnIndex !== -1) {
      const sourceColumn = columnsRef.current[sourceColumnIndex];
      const cardIndex = sourceColumn.cards.findIndex(card => card.id === cardId);
      
      if (cardIndex !== -1) {
        const movedCard = sourceColumn.cards[cardIndex];
        
        // Создаем полностью новое состояние с правильным неизменяемым обновлением
        const newColumns = columnsRef.current.map((column, index) => {
          if (index === sourceColumnIndex) {
            // Исходная колонка: убираем карточку
            const newCards = column.cards.filter(card => card.id !== cardId);
            return {
              ...column,
              cards: newCards,
              cards_count: newCards.length
            };
          } else if (index === destColumnIndex) {
            // Целевая колонка: добавляем карточку
            const newCards = [...column.cards];
            newCards.splice(destination.index, 0, movedCard);
            return {
              ...column,
              cards: newCards,
              cards_count: newCards.length
            };
          } else {
            // Остальные колонки без изменений
            return column;
          }
        });
        
        // Обновляем состояние локально для мгновенного UI отклика
        setColumns(newColumns);
        console.log('✅ UI updated with cards_count:', {
          sourceCount: newColumns[sourceColumnIndex].cards_count,
          destCount: newColumns[destColumnIndex].cards_count
        });
      }
    }
    
    // 2. ОТПРАВЛЯЕМ ЗАПРОС НА СЕРВЕР (в фоне, без блокировки UI)
    try {
      const moveData = {
        from_column: sourceInfo.columnId,
        to_column: destInfo.columnId,
        new_position: destination.index
      };
      
      console.log('📡 API request');
      const response = await moveCard(cardId, moveData);
      console.log('✅ Server confirmed');
      
    } catch (err) {
      console.error('❌ API error:', err);
      
      // При ошибке откатываем оптимистичное обновление
      console.log('🔄 Rollback');
      try {
        const columnsData = await getColumns();
        setColumns(columnsData);
        console.log('✅ Rollback complete');
      } catch (fetchError) {
        console.error('❌ Rollback failed:', fetchError);
      }
      
      // Проверяем, является ли это ошибкой WIP лимита
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('Исчерпан WIP лимит')) {
        setWipLimitError(err.response.data.detail);
      } else {
        setError('Ошибка при перемещении карточки: ' + (err.response?.data?.detail || err.message));
      }
    }
    console.log('🎯 onDragEnd complete');
    isDraggingRef.current = false;
  }, []); // Полностью убираем все зависимости

  const handleCardCreated = useCallback(async (newCard) => {
    try {
      const columnsData = await getColumns();
      setColumns(columnsData);
    } catch (error) {
      console.error('❌ Update after create error:', error);
      setError('Ошибка при обновлении колонок');
    }
  }, []); // Убираем зависимость от fetchColumns

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

  // Создаем отфильтрованные колонки без сложной мемоизации
  const getFilteredColumns = () => {
    return columns.map(column => {
      const filteredCards = filterCards(column.cards, rcZmFilter);
      const filteredOutCards = getFilteredOutCards(column.cards, rcZmFilter);
      
      return {
        ...column,
        filteredCards,
        filteredOutCards
      };
    });
  };

  const filteredColumns = getFilteredColumns();
  const hasFilteredOutCards = rcZmFilter !== 'Показать все' && 
    filteredColumns.some(col => col.filteredOutCards.length > 0);

  // Подготавливаем колонки для рендера
  const preparedFilteredColumns = filteredColumns.map(column => ({
    ...column,
    cards: column.filteredCards
  }));

  const preparedFilteredOutColumns = filteredColumns.map(column => ({
    ...column,
    cards: column.filteredOutCards
  }));
  
  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
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
              Отфильтрованные тикеты ({filterOptions.find(opt => opt.value === rcZmFilter)?.label || rcZmFilter})
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
            {preparedFilteredColumns.map((column) => (
              <KanbanColumn
                key={`filtered-${column.id}`}
                column={column}
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
              {preparedFilteredOutColumns.map((column) => (
                <KanbanColumn
                  key={`filtered-out-${column.id}`}
                  column={column}
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

        {/* Модальное окно для ошибки WIP лимита */}
        <Dialog
          open={!!wipLimitError}
          onClose={() => setWipLimitError(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            WIP лимит исчерпан
          </DialogTitle>
          <DialogContent>
            <Typography>
              {wipLimitError}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWipLimitError(null)} variant="contained">
              Понятно
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DragDropContext>
  );
};

export default KanbanBoard; 