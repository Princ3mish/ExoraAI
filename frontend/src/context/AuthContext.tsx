import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

interface UserUsage {
  meetingsThisMonth: number;
  meetingsLimit: number | null;
  contactsTotal: number;
  contactsLimit: number | null;
  voiceCallsThisMonth: number;
  voiceCallsLimit: number | null;
}

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  name?: string;
  phoneNumber?: string;
  telegramLinked?: boolean;
  credits?: number;
  plan?: string;
  usage?: UserUsage;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Assuming /api/auth/me returns the user profile
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
        } catch (error) {
          console.error('Session initialization failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      localStorage.removeItem('token');
      setUser(null);
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  // Phase S4 — re-fetch user profile to sync credits after Stripe purchase
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
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
