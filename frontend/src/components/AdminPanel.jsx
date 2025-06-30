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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import { Save as SaveIcon, Person as PersonIcon } from '@mui/icons-material';
import { getAdminUsers, updateUserRole, getAvailableRoles } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      setAlert({ type: 'error', message: 'У вас нет прав доступа к этой странице' });
      setLoading(false);
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        getAdminUsers(),
        getAvailableRoles()
      ]);
      
      setUsers(usersData);
      setRoles(rolesData.roles);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setAlert({ 
        type: 'error', 
        message: 'Ошибка при загрузке данных: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser.id) {
      setAlert({ type: 'warning', message: 'Нельзя изменить собственную роль' });
      return;
    }

    try {
      setUpdating(userId);
      await updateUserRole(userId, { user_id: userId, role: newRole });
      
      // Обновляем локальное состояние
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      setAlert({ 
        type: 'success', 
        message: 'Роль пользователя успешно обновлена' 
      });
    } catch (error) {
      console.error('Ошибка при обновлении роли:', error);
      setAlert({ 
        type: 'error', 
        message: 'Ошибка при обновлении роли: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'curator':
        return 'warning';
      case 'user':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
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

  if (!isAdmin()) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          У вас нет прав доступа к этой странице. Требуется роль администратора.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          Администрирование пользователей
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
                  <TableCell>ID</TableCell>
                  <TableCell>Имя пользователя</TableCell>
                  <TableCell>Telegram</TableCell>
                  <TableCell>Текущая роль</TableCell>
                  <TableCell>Новая роль</TableCell>
                  <TableCell>Дата регистрации</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user.username}
                        {user.id === currentUser.id && (
                          <Chip size="small" label="Вы" color="primary" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{user.telegram}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleLabel(user.role)} 
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.id === currentUser.id ? (
                        <Tooltip title="Нельзя изменить собственную роль">
                          <span>
                            <FormControl size="small" disabled>
                              <InputLabel>Роль</InputLabel>
                              <Select value={user.role} label="Роль">
                                {roles.map((role) => (
                                  <MenuItem key={role.value} value={role.value}>
                                    {role.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </span>
                        </Tooltip>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Роль</InputLabel>
                            <Select
                              value={user.role}
                              label="Роль"
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={updating === user.id}
                            >
                              {roles.map((role) => (
                                <MenuItem key={role.value} value={role.value}>
                                  {role.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {updating === user.id && (
                            <CircularProgress size={20} />
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active ? 'Активен' : 'Неактивен'} 
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Описание ролей:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Пользователь</strong> - базовый доступ к системе, может создавать и редактировать свои задачи
            </Typography>
            <Typography variant="body2">
              <strong>Куратор</strong> - расширенные права, может управлять задачами других пользователей
            </Typography>
            <Typography variant="body2">
              <strong>Администратор</strong> - полный доступ к системе, включая управление ролями пользователей
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminPanel; 