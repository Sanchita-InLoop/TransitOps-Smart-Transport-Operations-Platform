/**
 * context/AuthContext.jsx
 * Stores the JWT token + decoded user (id, role, name) globally.
 * Any component can call useAuth() to read state or call login/logout.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

function parseToken(token) {
  try {
    // JWT payload is base64url — decode the middle segment.
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('transitops_token'));
  const [user,  setUser]    = useState(() => {
    const t = localStorage.getItem('transitops_token');
    return t ? parseToken(t) : null;
  });
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading]     = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('transitops_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('transitops_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, authError, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
