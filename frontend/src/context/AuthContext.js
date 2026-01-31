// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return a safe default instead of throwing - this can happen during initial render
    console.warn('useAuth called outside AuthProvider');
    return {
      admin: null,
      token: null,
      login: () => {},
      loginWithCredentials: async () => ({ ok: false }),
      logout: () => {},
      isAuthenticated: false,
      isLoading: false,
      setAdmin: () => {}
    };
  }
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => {
    try {
      const raw = localStorage.getItem('adminData');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('adminToken') || null;
    } catch (e) {
      return null;
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // login that the UI uses (token + admin object)
  const login = useCallback((tokenData, adminData) => {
    setToken(tokenData);
    setAdmin(adminData);
    try {
      localStorage.setItem('adminToken', tokenData);
      localStorage.setItem('adminData', JSON.stringify(adminData));
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  // convenience wrapper: call backend and then login(token, admin)
  const loginWithCredentials = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      const newToken = res.token || res.accessToken || null;
      const adminData = res.admin || res.user || null;
      if (!newToken) throw new Error('Login did not return a token');
      login(newToken, adminData);
      return { ok: true, data: res };
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
    } catch (e) {}
    
    // Safe navigation
    try {
      navigate('/admin/login', { replace: true });
    } catch (e) {
      // Fallback if navigate fails
      window.location.href = '/admin/login';
    }
  }, [navigate]);

  // On mount, mark loading false (we already read localStorage synchronously above)
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      admin,
      token,
      login, // token + admin setter (used in AdminLoginPage)
      loginWithCredentials, // optional helper if you prefer calling auth from context
      logout,
      isAuthenticated,
      isLoading,
      setAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
