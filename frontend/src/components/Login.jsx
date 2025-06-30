import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [telegram, setTelegram] = useState('');
  const [error, setErrorState] = useState('');
  const [loading, setLoading] = useState(false);

  // Функция для работы с персистентными ошибками
  const setError = useCallback((errorMessage) => {
    if (errorMessage) {
      // Сохраняем ошибку в sessionStorage для персистентности
      sessionStorage.setItem('loginError', errorMessage);
    } else {
      // Очищаем ошибку из sessionStorage
      sessionStorage.removeItem('loginError');
    }
    
    setErrorState(errorMessage);
  }, []);

  // Восстанавливаем ошибку при загрузке компонента
  React.useEffect(() => {
    const savedError = sessionStorage.getItem('loginError');
    if (savedError) {
      setErrorState(savedError);
    }
  }, []);


  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const result = await login(username, password);
        if (result.success) {
          setError(''); // Очищаем ошибку только при успешном входе
          navigate('/');
        } else {
          const errorMessage = result.error || 'Неверное имя пользователя или пароль';
          setError(errorMessage);
        }
      } else {
        const result = await register({ username, password, telegram });
        if (result.success) {
          setError(''); // Очищаем ошибку при успешной регистрации
          const loginResult = await login(username, password);
          if (loginResult.success) {
            navigate('/');
          } else {
            const errorMessage = loginResult.error || 'Ошибка при входе после регистрации';
            setError(errorMessage);
          }
        } else {
          const errorMessage = result.error || 'Ошибка при регистрации';
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Неожиданная ошибка в handleSubmit:', error);
      setError('Произошла неожиданная ошибка. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {isLogin ? 'Вход' : 'Регистрация'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Имя пользователя"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
              onFocus={() => {
                if (error) setError(''); // Очищаем ошибку при фокусе на поле
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              onFocus={() => {
                if (error) setError(''); // Очищаем ошибку при фокусе на поле
              }}
            />
            {!isLogin && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="telegram"
                label="Telegram (@username или chat_id)"
                name="telegram"
                placeholder="@username или 123456789"
                value={telegram}
                onChange={(e) => {
                  setTelegram(e.target.value);
                }}
                onFocus={() => {
                  if (error) setError(''); // Очищаем ошибку при фокусе на поле
                }}
                helperText="Укажите ваш Telegram username (например, @myname) или chat_id (только цифры)"
              />
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !username || !password || (!isLogin && !telegram)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading 
                ? (isLogin ? 'Вход...' : 'Регистрация...') 
                : (isLogin ? 'Войти' : 'Зарегистрироваться')
              }
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setTelegram(''); // Очищаем поле Telegram при переключении
                  setLoading(false); // Сбрасываем состояние загрузки
                }}
              >
                {isLogin
                  ? 'Нет аккаунта? Зарегистрироваться'
                  : 'Уже есть аккаунт? Войти'}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 