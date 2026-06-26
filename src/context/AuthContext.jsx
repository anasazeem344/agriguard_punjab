import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  const store = localStorage.getItem('token') ? localStorage : sessionStorage;
  const token = store.getItem('token');
  const userRaw = store.getItem('user');
  if (!token || !userRaw) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => readStoredAuth());

  // remember = true -> persists across browser restarts (localStorage)
  // remember = false -> cleared when the browser/tab closes (sessionStorage)
  const login = (token, user, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem('token');
    other.removeItem('user');
    store.setItem('token', token);
    store.setItem('user', JSON.stringify(user));
    setAuth({ token, user });
  };

  const updateUser = (user) => {
    const store = localStorage.getItem('token') ? localStorage : sessionStorage;
    store.setItem('user', JSON.stringify(user));
    setAuth((prev) => ({ ...prev, user }));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setAuth({ token: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
