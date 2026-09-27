import { createContext, useContext, useState } from 'react';
import { api } from './api.js';

// Single piece of global state in the app: the session. Context is the right
// size for it — Redux/MobX would be ceremony for one key.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const persist = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const login = async (email, password, portal) =>
    persist(await api('/api/auth/login', { method: 'POST', body: { email, password, portal } }));

  // Forced on first sign-in of organizer-created accounts; the server issues a
  // fresh token without the change-pending claim.
  const changePassword = async (currentPassword, newPassword) =>
    persist(await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }));

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
