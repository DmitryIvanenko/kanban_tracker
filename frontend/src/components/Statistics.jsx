import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import { getUsers, getStatistics } from '../services/api';

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_tickets: 0,
    tickets_by_column: {},
    tickets_by_assignee: {},
    average_story_points: 0
  });
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignees, setAssignees] = useState([]);

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const usersData = await getUsers();
        setAssignees(usersData);
      } catch (err) {
        console.error('Ошибка при загрузке исполнителей:', err);
      }
    };
    fetchAssignees();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Загрузка статистики...');
        const params = {};
        if (selectedAssignee) params.assignee_id = selectedAssignee;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        const statsData = await getStatistics(params);
        console.log('Получены данные статистики:', statsData);
        setStats(statsData);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
        setError(err.response?.data?.detail || 'Не удалось загрузить статистику');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedAssignee, startDate, endDate]);

  const handleAssigneeChange = (event) => {
    setSelectedAssignee(event.target.value);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Статистика
      </Typography>

      {/* Фильтры */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Исполнитель</InputLabel>
          <Select
            value={selectedAssignee}
            label="Исполнитель"
            onChange={handleAssigneeChange}
          >
            <MenuItem value="">Все исполнители</MenuItem>
            {assignees.map((assignee) => (
              <MenuItem key={assignee.id} value={assignee.id}>
                {assignee.username}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Дата начала"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />

        <TextField
          label="Дата окончания"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Общая статистика */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Общая информация
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Всего тикетов"
                    secondary={stats.total_tickets || 0}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Среднее количество Story Points"
                    secondary={(stats.average_story_points || 0).toFixed(1)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Статистика по колонкам */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статистика по колонкам
              </Typography>
              <List>
                {Object.entries(stats.tickets_by_column || {}).map(([column, count]) => (
                  <React.Fragment key={column}>
                    <ListItem>
                      <ListItemText
                        primary={column}
                        secondary={`${count} тикетов`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Статистика по исполнителям */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статистика по исполнителям
              </Typography>
              <List>
                {Object.entries(stats.tickets_by_assignee || {}).map(([assignee, count]) => (
                  <React.Fragment key={assignee}>
                    <ListItem>
                      <ListItemText
                        primary={assignee}
                        secondary={`${count} тикетов`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistics; 