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
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kanban Tracker
          </Typography>
          <Button
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Доска
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/statistics')}
            sx={{ mr: 2 }}
          >
            Статистика
          </Button>
          {user && (
            <Typography variant="body1" sx={{ mr: 2, color: 'inherit' }}>
              {user.username}
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout}>
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