import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import KanbanBoard from './components/KanbanBoard';
import Statistics from './components/Statistics.jsx';
import AdminPanel from './components/AdminPanel';
import CuratorPanel from './components/CuratorPanel';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    createButton: {
      main: '#e87c25',
      contrastText: '#ffffff',
    },
    tagColor: {
      main: '#787e3f',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const PrivateRoute = React.memo(({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
});

const AdminRoute = React.memo(({ children }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }
  
  return children;
});

const CuratorRoute = React.memo(({ children }) => {
  const { user, isCuratorOrAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!isCuratorOrAdmin()) {
    return <Navigate to="/" />;
  }
  
  return children;
});

function App() {
  // Мемоизируем Route элементы для стабильности
  const routes = useMemo(() => (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <KanbanBoard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <PrivateRoute>
            <Layout>
              <Statistics />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/curator"
        element={
          <CuratorRoute>
            <Layout>
              <CuratorPanel />
            </Layout>
          </CuratorRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminPanel />
            </Layout>
          </AdminRoute>
        }
      />
    </Routes>
  ), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          {routes}
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 