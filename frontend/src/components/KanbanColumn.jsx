import React, { useState, useEffect } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar
} from '@mui/material';
import { api } from '../services/api';
import CreateTicketModal from './CreateTicketModal';
import EditTicketModal from './EditTicketModal';
import AddIcon from '@mui/icons-material/Add';

const KanbanColumn = ({ column, onCardCreated }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
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

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async (updatedCard) => {
    setIsEditModalOpen(false);
    setSelectedCard(null);
    // Обновляем колонки после редактирования
    if (onCardCreated) {
      onCardCreated(updatedCard);
    }
  };

  if (!column) return null;
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
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="h6" gutterBottom>
        {column.title}
      </Typography>

      <Droppable droppableId={`col_${column.id}`}>
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
                        '&:active': { cursor: 'grabbing' },
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 3
                        }
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {card.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          {card.assignee && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                                {card.assignee.username[0].toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">
                                {card.assignee.username}
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

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setIsCreateModalOpen(true)}
        sx={{ mt: 2 }}
      >
        Добавить тикет
      </Button>

      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onCardCreated}
        columnId={column.id}
      />

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