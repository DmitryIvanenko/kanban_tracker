import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      setCurrentUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Начало процесса входа в AuthContext');
      const response = await api.post('/api/auth/login', { username, password });
      console.log('Получен ответ от сервера:', response.data);
      
      if (response.data.access_token) {
        console.log('Токен получен, сохраняем в localStorage');
        localStorage.setItem('token', response.data.access_token);
        setIsAuthenticated(true);
        
        // Получаем информацию о пользователе
        console.log('Получаем информацию о пользователе');
        const userResponse = await api.get('/api/auth/me');
        console.log('Получена информация о пользователе:', userResponse.data);
        setCurrentUser(userResponse.data);
        
        return true;
      } else {
        console.error('Токен не получен в ответе:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Ошибка при входе:', {
        type: error.name,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  const register = async (username, password) => {
    try {
      console.log('AuthContext: Начало процесса регистрации');
      console.log('AuthContext: Отправка запроса на регистрацию:', { username });
      
      const response = await api.post('/api/auth/register', {
        username,
        password
      });
      
      console.log('AuthContext: Регистрация успешна:', response.data);
      return true;
    } catch (error) {
      console.error('AuthContext: Ошибка регистрации:');
      console.error('AuthContext: Тип ошибки:', error.constructor.name);
      console.error('AuthContext: Сообщение ошибки:', error.message);
      console.error('AuthContext: Данные ответа:', error.response?.data);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const value = {
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    checkAuth,
    currentUser
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 