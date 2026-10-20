'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('karyawan' | 'hr' | 'owner')[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, token, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token || !user) {
        router.replace('/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Not authorized for this role, redirect to appropriate default page
        if (user.role === 'karyawan') {
          router.replace('/checkin');
        } else if (user.role === 'hr') {
          router.replace('/dashboard');
        } else {
          router.replace('/owner-dashboard');
        }
      }
    }
  }, [user, token, loading, allowedRoles, router]);

  const hasAccess = Boolean(user && token && (!allowedRoles || allowedRoles.includes(user.role)));

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0d1d29] flex flex-col items-center justify-center transition-colors duration-200">
        <div className="h-10 w-10 border-4 border-slate-200 dark:border-[#a0d4e4]/20 border-t-sky-500 dark:border-t-[#a0d4e4] rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-[#a0d4e4] text-xs font-semibold tracking-wider animate-pulse uppercase">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

