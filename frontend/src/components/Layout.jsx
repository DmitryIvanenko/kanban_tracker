import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: '#FEE600' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#000000' }}>
            CMD Tracker
          </Typography>
          <Button
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2, color: '#000000' }}
          >
            Доска
          </Button>
          {isAdmin() && (
            <Button
              color="inherit"
              onClick={() => navigate('/admin')}
              sx={{ mr: 2, color: '#000000' }}
            >
              Админка
            </Button>
          )}
          <Button
            color="inherit"
            onClick={() => navigate('/statistics')}
            sx={{ mr: 2, color: '#000000' }}
          >
            Статистика
          </Button>
          {user && (
            <Typography variant="body1" sx={{ mr: 2, color: '#000000' }}>
              {user.username}
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout} sx={{ color: '#000000' }}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout; 