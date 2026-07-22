import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (error.response?.status !== 401) {
        setAuthError({ type: 'unknown', message: error.message || 'Falha ao verificar sessão' });
      }
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  // Access token expirou e o refresh (cookie httpOnly) também falhou —
  // disparado pelo interceptor em @/api/apiClient.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    return data.user;
  };

  const logout = async (shouldRedirect = true) => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      if (shouldRedirect) window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authChecked,
        authError,
        checkUserAuth,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
