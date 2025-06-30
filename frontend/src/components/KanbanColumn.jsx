import React, { useState, useEffect } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Avatar
} from '@mui/material';
import { getCard } from '../services/api';
import EditTicketModal from './EditTicketModal';

// Функция для получения цвета типа недвижимости
const getRealEstateTypeColor = (realEstateType) => {
  const colorMap = {
    'офис': '#fba097',
    'здание': '#ffc5a1',
    'встроенные помещения': '#ece7ac',
    'производственная недвижимость': '#c6efbf',
    'складские помещения': '#c4dbf7',
    'торговая недвижимость': '#7b66b5',
    'отели': '#8c4c9a',
    'иная недвижимость': '#f3efe6'
  };
  
  return colorMap[realEstateType] || '#f5f5f5'; // По умолчанию серый цвет
};

const KanbanColumn = ({ column, swimlanePrefix = "" }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = async (card) => {
    try {
      console.log('KanbanColumn: клик по карточке:', card);
      // Получаем полные данные карточки
      const response = await getCard(card.id);
      console.log('KanbanColumn: получены полные данные карточки:', response);
      setSelectedCard(response);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Ошибка при получении данных карточки:', error);
    }
  };

  const handleEditSuccess = async (updatedCard) => {
    console.log('🔧 KanbanColumn handleEditSuccess вызван:', updatedCard);
    setIsEditModalOpen(false);
    setSelectedCard(null);
    // Обновляем данные, перезагружая страницу
    console.log('🔧 KanbanColumn: вызываю window.location.reload()');
    window.location.reload();
  };

  if (!column) return null;
  
  // Валидация данных: cards_count должен всегда присутствовать
  if (column.cards_count === undefined || column.cards_count === null) {
    console.error('⚠️ KanbanColumn: cards_count отсутствует в данных колонки:', column);
  }
  
  const cards = column.cards || [];
  console.log('KanbanColumn render:', { columnId: column.id, cardsCount: cards.length, cards });



  return (
    <Paper
      sx={{
        width: 300,
        minHeight: 500,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#eae6e3'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {column.title}
        </Typography>
        {column.wip_limit && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${column.cards_count}/${column.wip_limit}`}
              size="small"
              color={
                column.cards_count >= column.wip_limit ? 'error' :
                column.cards_count >= column.wip_limit * 0.8 ? 'warning' : 'success'
              }
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        )}
      </Box>

      <Droppable droppableId={swimlanePrefix ? `${swimlanePrefix}-col_${column.id}` : `col_${column.id}`}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
              transition: 'background-color 0.2s ease'
            }}
          >
            {cards.map((card, index) => {
              console.log('Рендеринг карточки:', card);
              console.log('Теги карточки:', card.tags);
              console.log('Тип тегов:', typeof card.tags);
              console.log('Теги карточки (JSON):', JSON.stringify(card.tags));
              const draggableId = `card-${card.id}`;
              console.log('Draggable ID:', draggableId);
              return (
                <Draggable key={draggableId} draggableId={draggableId} index={index}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => handleCardClick(card)}
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        position: 'relative',
                        '&:active': { cursor: 'grabbing' },
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 3
                        },
                        // Цветовая подсветка левой части карточки
                        borderLeft: card.real_estate_type 
                          ? `6px solid ${getRealEstateTypeColor(card.real_estate_type)}`
                          : '6px solid transparent'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {card.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {card.assignee && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 1,
                                  bgcolor: '#6a329f',
                                  color: '#ffffff'
                                }}>
                                  {typeof card.assignee === 'string' 
                                    ? card.assignee[0]?.toUpperCase() || '?' 
                                    : card.assignee.username?.[0]?.toUpperCase() || '?'
                                  }
                                </Avatar>
                                <Typography variant="body2">
                                  {typeof card.assignee === 'string' 
                                    ? card.assignee 
                                    : card.assignee.username || 'Не назначен'
                                  }
                                </Typography>
                              </Box>
                            )}
                            <Chip
                              label={`${card.story_points} SP`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          {card.tags && card.tags.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {card.tags.map((tag) => (
                                <Chip
                                  key={tag.id}
                                  label={tag.name}
                                  size="small"
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
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>

      <EditTicketModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCard(null);
        }}
        onSuccess={handleEditSuccess}
        ticket={selectedCard}
      />
    </Paper>
  );
};

export default React.memo(KanbanColumn); 