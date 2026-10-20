'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'karyawan' | 'hr' | 'owner';
  divisionId: string | null;
  organizationId: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    inviteCode: string;
    divisionId?: string;
    role?: 'karyawan' | 'hr' | 'owner';
  }) => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Restore session
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Sync cookies for server-side middleware
      document.cookie = `token=${savedToken}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `user_role=${parsedUser.role}; path=/; max-age=604800; SameSite=Lax`;
    }
    setLoading(false);
  }, []);

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      document.cookie = `user_role=${newUser.role}; path=/; max-age=604800; SameSite=Lax`;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user: loggedUser } = res.data;
      
      setToken(access_token);
      setUser(loggedUser);
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      document.cookie = `token=${access_token}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `user_role=${loggedUser.role}; path=/; max-age=604800; SameSite=Lax`;
      
      // Redirect based on role
      if (loggedUser.role === 'karyawan') {
        router.push('/checkin');
      } else if (loggedUser.role === 'hr') {
        router.push('/dashboard');
      } else {
        router.push('/owner-dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login gagal';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    fullName: string;
    email: string;
    password: string;
    inviteCode: string;
    divisionId?: string;
    role?: 'karyawan' | 'hr' | 'owner';
  }) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      // On success, redirect to login with a query param
      router.push('/login?registered=true');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registrasi gagal';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        updateUser,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
