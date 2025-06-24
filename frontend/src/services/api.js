import axios from 'axios';

const API_URL = 'http://localhost:8000';  // Всегда используем localhost для браузера

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true  // Включаем credentials
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Добавляем CORS заголовки
  config.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
  config.headers['Access-Control-Allow-Credentials'] = 'true';
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Добавляем перехватчик для обработки ответов
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const register = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

export const login = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  } catch (error) {
    console.error('Ошибка при логине:', error.response?.data);
    throw error;
  }
};

export const getColumns = async () => {
  const response = await api.get('/api/columns');
  return response.data;
};

export const createCard = async (cardData) => {
  try {
    console.log('Отправляем запрос на создание карточки:', cardData);
    const response = await api.post('/api/cards', cardData);
    console.log('Ответ сервера:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании карточки:', error.response?.data || error.message);
    throw error;
  }
};

export const moveCard = async (cardId, moveData) => {
  const response = await api.post(`/api/cards/${cardId}/move`, moveData);
  return response.data;
};

export const getCardHistory = async (cardId) => {
  const response = await api.get(`/api/cards/${cardId}/history`);
  return response.data;
};

export const getCardComments = async (cardId) => {
  const response = await api.get(`/api/cards/${cardId}/comments`);
  return response.data;
};

export const createCardComment = async (cardId, commentData) => {
  const response = await api.post(`/api/cards/${cardId}/comments`, commentData);
  return response.data;
};

export const getCard = async (cardId) => {
  const response = await api.get(`/api/cards/${cardId}`);
  return response.data;
};

// Функция обновления карточки (КРИТИЧНО!)
export const updateCard = async (cardId, cardData) => {
  try {
    console.log('Обновляем карточку:', cardId, cardData);
    const response = await api.put(`/api/cards/${cardId}`, cardData);
    console.log('Карточка обновлена:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении карточки:', error.response?.data || error.message);
    throw error;
  }
};

// Функция удаления карточки
export const deleteCard = async (cardId) => {
  try {
    console.log('Удаляем карточку:', cardId);
    const response = await api.delete(`/api/cards/${cardId}`);
    console.log('Карточка удалена:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении карточки:', error.response?.data || error.message);
    throw error;
  }
};

// Функции для работы с пользователями
export const getUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

// Функция для получения типов недвижимости
export const getRealEstateTypes = async () => {
  const response = await api.get('/api/real-estate-types');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Функции для работы с колонками
export const getColumn = async (columnId) => {
  const response = await api.get(`/api/columns/${columnId}`);
  return response.data;
};

// Функции для статистики
export const getStatistics = async (params = {}) => {
  const response = await api.get('/api/statistics', { params });
  return response.data;
};

// Функции для отладки (можно использовать в development)
export const getDebugUsers = async () => {
  const response = await api.get('/api/debug/users');
  return response.data;
};

export const verifyPassword = async (password) => {
  const response = await api.get('/api/debug/verify-password', { 
    params: { password } 
  });
  return response.data;
};

// Алиас для updateCard (на случай если где-то используется editCard)
export const editCard = updateCard;

// Алиас для getUsers (на случай если где-то используется fetchUsers)
export const fetchUsers = getUsers; 