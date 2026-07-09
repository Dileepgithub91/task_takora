import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken, clearToken } from '../api/client.js';

const AuthContext = createContext(null);

function readCachedUser() {
  try {
    const raw = localStorage.getItem('takoraUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  if (user) localStorage.setItem('takoraUser', JSON.stringify(user));
  else localStorage.removeItem('takoraUser');
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => (getToken() ? readCachedUser() : null));
  const [loading, setLoading] = useState(true);

  function setUser(userValue) {
    if (typeof userValue === 'function') {
      setUserState(previous => {
        const next = userValue(previous);
        writeCachedUser(next);
        return next;
      });
      return;
    }

    setUserState(userValue);
    writeCachedUser(userValue);
  }

  useEffect(() => {
    async function load() {
      try {
        const token = getToken();

        if (!token) {
          setUser(null);
          return;
        }

        const data = await api('/auth/me');
        setUser(data.user);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(data.token);
    setUser(data.user);
  }

  async function forgotPassword(email) {
    return api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      timeoutMs: 30000
    });
  }

  async function resetPassword(token, password) {
    return api(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, forgotPassword, resetPassword, setUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
