'use client';

import React from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import CheckoutAttendanceCard from '@/components/attendance/CheckoutAttendanceCard';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ScrollToTop from '@/components/ui/ScrollToTop';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Droplets, LogOut, History, ArrowLeft, Calendar } from 'lucide-react';

export default function CheckoutPage() {
  return (
    <AuthGuard allowedRoles={['karyawan', 'hr']}>
      <CheckoutContent />
    </AuthGuard>
  );
}

function CheckoutContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      {/* Navbar */}
      <nav className="w-full bg-white/95 dark:bg-[#102636]/90 border-b border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider block leading-none">
                SATIVA
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                Presensi Pulang & Deteksi Stres
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/checkin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white shadow-sm transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali</span>
            </button>
            <ThemeToggle />
            <SwitchLanguage />
            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <CheckoutAttendanceCard onCheckoutSuccess={() => {}} />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
        &copy; {new Date().getFullYear()} SATIVA Klinik Kecantikan &bull; Sistem Presensi & Kesejahteraan Karyawan
      </footer>

      <ScrollToTop />
    </div>
  );
}
