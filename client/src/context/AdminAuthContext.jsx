import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('psc_admin_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('psc_admin_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('psc_admin_token', newToken);
    localStorage.setItem('psc_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('psc_admin_token');
    localStorage.removeItem('psc_admin_user');
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role) => {
      if (!user?.roles) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'psc_admin_token') setToken(e.newValue);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, user, login, logout, hasRole }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
