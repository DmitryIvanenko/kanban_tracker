import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';
import HistoryIcon from '@mui/icons-material/History';
import { getCardHistory } from '../services/api';

const KanbanCard = ({ ticket, index }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const handleHistoryClick = async () => {
    try {
      const historyData = await getCardHistory(ticket.id);
      setHistory(historyData);
      setIsHistoryOpen(true);
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Draggable draggableId={ticket.id.toString()} index={index}>
        {(provided) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              mb: 2,
              '&:last-child': { mb: 0 },
              backgroundColor: '#fff',
              '&:hover': {
                boxShadow: 3
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ flex: 1 }}>
                  {ticket.title}
                </Typography>
                <IconButton size="small" onClick={handleHistoryClick}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {ticket.description}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {ticket.assignee}
                  </Typography>
                </Box>
                
                <Chip
                  icon={<TimerIcon />}
                  label={`${ticket.story_points} SP`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        )}
      </Draggable>

      <Dialog 
        open={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>История тикета</DialogTitle>
        <DialogContent>
          <List>
            {history.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemText
                    primary={item.details}
                    secondary={formatDate(item.created_at)}
                  />
                </ListItem>
                {index < history.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KanbanCard; 