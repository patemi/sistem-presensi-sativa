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
    // Restore session if valid and not expired
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const parts = savedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            decodeURIComponent(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
          );
          const nowInSeconds = Math.floor(Date.now() / 1000);
          if (payload.exp && typeof payload.exp === 'number' && payload.exp < nowInSeconds) {
            throw new Error('Token expired');
          }

          setToken(savedToken);
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          // Sync cookies for server-side middleware (1 day max-age)
          document.cookie = `token=${savedToken}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `user_role=${parsedUser.role}; path=/; max-age=86400; SameSite=Lax`;
          setLoading(false);
          return;
        }
      } catch {
        // Expired or corrupt session: clean up completely
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
        document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
      }
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
      
      // Redirect based on role with full navigation to guarantee cookie transmission
      const targetPath =
        loggedUser.role === 'karyawan'
          ? '/checkin'
          : loggedUser.role === 'hr'
          ? '/dashboard'
          : '/owner-dashboard';
      window.location.href = targetPath;
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
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
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
