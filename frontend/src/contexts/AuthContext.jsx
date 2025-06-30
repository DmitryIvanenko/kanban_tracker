import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, register as apiRegister } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Ошибка при проверке аутентификации:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiLogin({ username, password });
      
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        
        // Получаем данные пользователя
        const userResponse = await getCurrentUser();
        setUser(userResponse);
        
        return { success: true };
      } else {
        return { success: false, error: 'Неверные учетные данные' };
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка при входе в систему' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiRegister(userData);
      return { success: true, data: response };
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка при регистрации' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Функции для проверки ролей
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isCurator = () => {
    return user?.role === 'curator';
  };

  const isCuratorOrAdmin = () => {
    return user?.role === 'curator' || user?.role === 'admin';
  };

  const hasRole = (requiredRole) => {
    return user?.role === requiredRole;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    getCurrentUser,
    // Функции проверки ролей
    isAdmin,
    isCurator,
    isCuratorOrAdmin,
    hasRole
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