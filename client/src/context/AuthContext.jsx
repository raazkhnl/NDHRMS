import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('psc_token'));
  const [nidData, setNidData] = useState(() => {
    const raw = localStorage.getItem('psc_nid_data');
    return raw ? JSON.parse(raw) : null;
  });
  const [examData, setExamDataState] = useState(() => {
    const raw = localStorage.getItem('psc_exam_data');
    return raw ? JSON.parse(raw) : null;
  });

  const candidate = nidData
    ? { nidNumber: nidData.nidNumber, nameEnglish: nidData.nameEnglish }
    : null;

  const login = useCallback((newToken, newNidData) => {
    localStorage.setItem('psc_token', newToken);
    localStorage.setItem('psc_nid_data', JSON.stringify(newNidData));
    setToken(newToken);
    setNidData(newNidData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('psc_token');
    localStorage.removeItem('psc_nid_data');
    localStorage.removeItem('psc_exam_data');
    setToken(null);
    setNidData(null);
    setExamDataState(null);
  }, []);

  const setExamData = useCallback((data) => {
    if (data) {
      localStorage.setItem('psc_exam_data', JSON.stringify(data));
    } else {
      localStorage.removeItem('psc_exam_data');
    }
    setExamDataState(data);
  }, []);

  // Rehydrate — effectively already handled via useState init,
  // but we re-run to sync across tabs if needed.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'psc_token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{ candidate, token, nidData, examData, login, logout, setExamData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
