import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

  const login = useCallback(async (username, password) => {
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
  }, []);

  const register = useCallback(async (userData) => {
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
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  // Функции для проверки ролей
  const isAdmin = useCallback(() => {
    return user?.role === 'ADMIN';
  }, [user]);

  const isCurator = useCallback(() => {
    return user?.role === 'CURATOR';
  }, [user]);

  const isCuratorOrAdmin = useCallback(() => {
    return user?.role === 'CURATOR' || user?.role === 'ADMIN';
  }, [user]);

  const hasRole = useCallback((requiredRole) => {
    return user?.role === requiredRole;
  }, [user]);

  // Мемоизируем value объект для предотвращения пересоздания контекста
  const value = useMemo(() => ({
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
  }), [user, loading, login, register, logout, isAdmin, isCurator, isCuratorOrAdmin, hasRole]);

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