import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Paper
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [telegram, setTelegram] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Начало обработки формы:', { isLogin, username, password });
    
    if (isLogin) {
      console.log('Попытка входа с параметрами:', { username, password });
      const result = await login(username, password);
      console.log('Результат входа:', result);
      if (result.success) {
        console.log('Вход успешен, перенаправляем на главную страницу');
        navigate('/');
      } else {
        setError(result.error || 'Ошибка при входе');
      }
    } else {
      console.log('Попытка регистрации с параметрами:', { username, password, telegram });
      const result = await register({ username, password, telegram });
      console.log('Результат регистрации:', result);
      if (result.success) {
        console.log('Регистрация успешна, выполняем вход...');
        const loginResult = await login(username, password);
        console.log('Результат входа после регистрации:', loginResult);
        if (loginResult.success) {
          console.log('Вход после регистрации успешен, перенаправляем на главную страницу');
          navigate('/');
        } else {
          setError(loginResult.error || 'Ошибка при входе после регистрации');
        }
      } else {
        setError(result.error || 'Ошибка при регистрации');
      }
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
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
                onChange={(e) => setTelegram(e.target.value)}
                helperText="Укажите ваш Telegram username (например, @myname) или chat_id (только цифры)"
              />
            )}
            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setTelegram(''); // Очищаем поле Telegram при переключении
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