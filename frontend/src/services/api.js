import axios from 'axios';

const API_URL = 'http://localhost:8000';  // Всегда используем localhost для браузера

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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