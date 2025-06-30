import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import { Save as SaveIcon, Dashboard as DashboardIcon, Clear as ClearIcon } from '@mui/icons-material';
import { getCuratorColumns, updateWipLimit } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CuratorPanel = () => {
  const { user: currentUser, isCuratorOrAdmin } = useAuth();
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [alert, setAlert] = useState(null);
  const [wipLimits, setWipLimits] = useState({});

  useEffect(() => {
    if (!isCuratorOrAdmin()) {
      setAlert({ type: 'error', message: 'У вас нет прав доступа к этой странице' });
      setLoading(false);
      return;
    }

    loadColumns();
  }, []);

  const loadColumns = async () => {
    try {
      setLoading(true);
      const columnsData = await getCuratorColumns();
      setColumns(columnsData);
      
      // Инициализируем локальные значения WIP лимитов
      const limits = {};
      columnsData.forEach(column => {
        limits[column.id] = column.wip_limit || '';
      });
      setWipLimits(limits);
    } catch (error) {
      console.error('Ошибка при загрузке колонок:', error);
      setAlert({ 
        type: 'error', 
        message: 'Ошибка при загрузке колонок: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWipLimitChange = (columnId, value) => {
    setWipLimits(prev => ({
      ...prev,
      [columnId]: value
    }));
  };

  const handleSaveWipLimit = async (columnId) => {
    try {
      setUpdating(columnId);
      
      const wipLimit = wipLimits[columnId];
      const limitValue = wipLimit === '' ? null : parseInt(wipLimit);
      
      if (limitValue !== null && (isNaN(limitValue) || limitValue < 1)) {
        setAlert({ type: 'error', message: 'WIP лимит должен быть положительным числом' });
        return;
      }

      await updateWipLimit(columnId, { column_id: columnId, wip_limit: limitValue });
      
      // Обновляем локальное состояние
      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === columnId 
            ? { ...column, wip_limit: limitValue }
            : column
        )
      );

      setAlert({ 
        type: 'success', 
        message: `WIP лимит ${limitValue ? 'установлен' : 'удален'} для колонки` 
      });
    } catch (error) {
      console.error('Ошибка при обновлении WIP лимита:', error);
      setAlert({ 
        type: 'error', 
        message: 'Ошибка при обновлении WIP лимита: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleClearLimit = (columnId) => {
    setWipLimits(prev => ({
      ...prev,
      [columnId]: ''
    }));
  };

  const getStatusColor = (column) => {
    if (!column.wip_limit) return 'default';
    
    const usage = column.cards_count / column.wip_limit;
    if (usage >= 1) return 'error';
    if (usage >= 0.8) return 'warning';
    return 'success';
  };

  const getStatusText = (column) => {
    if (!column.wip_limit) return 'Без лимита';
    
    const remaining = column.wip_limit - column.cards_count;
    if (remaining <= 0) return 'Лимит исчерпан';
    return `Осталось: ${remaining}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!isCuratorOrAdmin()) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          У вас нет прав доступа к этой странице. Требуется роль куратора или администратора.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon />
          Управление WIP лимитами
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          WIP (Work In Progress) лимиты ограничивают количество задач в колонке. 
          Рекомендуется устанавливать лимиты для колонок "В работе" и "На согласовании".
        </Typography>

        {alert && (
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert(null)}
            sx={{ mb: 3 }}
          >
            {alert.message}
          </Alert>
        )}

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Колонка</TableCell>
                  <TableCell>Текущие задачи</TableCell>
                  <TableCell>WIP лимит</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {columns.map((column) => (
                  <TableRow key={column.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: column.color,
                            borderRadius: 1,
                            border: '1px solid #ccc'
                          }}
                        />
                        <Typography variant="body1" fontWeight="medium">
                          {column.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" component="span">
                        {column.cards_count}
                      </Typography>
                      {column.wip_limit && (
                        <Typography variant="body2" color="text.secondary">
                          / {column.wip_limit}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={wipLimits[column.id] || ''}
                          onChange={(e) => handleWipLimitChange(column.id, e.target.value)}
                          placeholder="Не установлен"
                          disabled={updating === column.id}
                          sx={{ width: 120 }}
                          inputProps={{ min: 1 }}
                        />
                        {wipLimits[column.id] && (
                          <Tooltip title="Очистить">
                            <IconButton
                              size="small"
                              onClick={() => handleClearLimit(column.id)}
                              disabled={updating === column.id}
                            >
                              <ClearIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(column)} 
                        color={getStatusColor(column)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveWipLimit(column.id)}
                          disabled={updating === column.id || String(wipLimits[column.id]) === String(column.wip_limit || '')}
                        >
                          Сохранить
                        </Button>
                        {updating === column.id && (
                          <CircularProgress size={20} />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Рекомендации по WIP лимитам:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              • <strong>Новые задачи</strong> - лимит не рекомендуется (входящий поток)
            </Typography>
            <Typography variant="body2">
              • <strong>В работе</strong> - рекомендуемый лимит: 3-5 задач
            </Typography>
            <Typography variant="body2">
              • <strong>На согласовании</strong> - рекомендуемый лимит: 2-3 задачи
            </Typography>
            <Typography variant="body2">
              • <strong>Готово</strong> - лимит не нужен (завершенные задачи)
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default CuratorPanel; 