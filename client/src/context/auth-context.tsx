import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@mtg-binder/shared';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, avatarId?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'mtg_binder_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  async function fetchUser() {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { user: userData, token: newToken } = response.data.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
  }

  async function register(email: string, password: string, displayName: string, avatarId?: string, inviteCode?: string) {
    const response = await api.post('/auth/register', { email, password, displayName, avatarId, inviteCode });
    const { user: userData, token: newToken } = response.data.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
  }

  async function forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email });
  }

  async function resetPassword(token: string, password: string) {
    await api.post('/auth/reset-password', { token, password });
  }

  function updateUser(userData: User) {
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
