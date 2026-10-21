'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ScrollToTop from '@/components/ui/ScrollToTop';
import AuthGuard from '@/components/layout/AuthGuard';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Droplets, History, ArrowLeft, Calendar, 
  MapPin, LogIn, Clock, CheckCircle2, AlertCircle,
  Briefcase, Check
} from 'lucide-react';

export default function HistoryPage() {
  return (
    <AuthGuard allowedRoles={['karyawan']}>
      <HistoryContent />
    </AuthGuard>
  );
}

function HistoryContent() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.get('/checkin/my-history');
        setHistoryList(res.data);
      } catch (err) {
        console.error('Failed to load history list', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Calculate summary stats
  const totalEntries = historyList.length;
  const onTimeCount = historyList.filter(item => item.lateMinutes === 0).length;
  const lateCount = historyList.filter(item => item.lateMinutes > 0).length;

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-400/10 dark:bg-[rgba(160,212,228,0.12)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 dark:bg-[rgba(31,62,83,0.35)] rounded-full blur-[140px] pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full bg-white/95 dark:bg-[#102636]/90 border-b border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-30 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/checkin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-sky-500" />
            <span>Kembali ke Presensi</span>
          </button>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <SwitchLanguage />

            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 z-10 flex-1 flex flex-col justify-start">
        {/* Title Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 mb-3 shadow-sm">
            <History className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            RIWAYAT PRESENSI SAYA
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed max-w-sm mx-auto">
            Catatan jam kehadiran dan kepulangan Anda di klinik Sativa. Data evaluasi perasaan diproses anonim demi privasi Anda.
          </p>
        </div>

        {/* Ringkasan Statistik 3 Card */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Hadir
            </p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {totalEntries}
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Hari Tercatat</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Tepat Waktu
            </p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {onTimeCount}
            </p>
            <p className="text-[9px] sm:text-[10px] text-emerald-500/80 mt-0.5">Sesuai Shift</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Terlambat
            </p>
            <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {lateCount}
            </p>
            <p className="text-[9px] sm:text-[10px] text-amber-500/80 mt-0.5">Hari</p>
          </div>
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="h-9 w-9 border-3 border-slate-300 dark:border-slate-700 border-t-sky-500 rounded-full animate-spin mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Memuat log kehadiran...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <Clock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Belum Ada Riwayat Presensi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Presensi yang Anda lakukan hari ini akan otomatis tercatat dan tersusun rapi di halaman ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyList.map((item: any) => {
              const dateStr = new Date(item.checkInTime).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const timeIn = new Date(item.checkInTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const timeOut = item.checkOutTime 
                ? new Date(item.checkOutTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              const isComplete = item.attendanceStatus === 'hadir';
              const isLate = item.lateMinutes > 0;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-sky-300 dark:hover:border-slate-700"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isLate ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Terlambat {item.lateMinutes} Menit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Tepat Waktu
                        </span>
                      )}
                      
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isComplete
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        {isComplete ? 'Selesai' : 'Sedang Berjalan'}
                      </span>
                    </div>
                  </div>

                  {/* Jam Masuk vs Jam Pulang Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                        <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Jam Masuk</span>
                      </p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {timeIn} WIB
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.officeLabel || 'Klinik Sativa'} ({Math.round(item.distanceMeters || 0)}m)
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                        <LogOut className="h-3.5 w-3.5 text-sky-500" />
                        <span>Jam Pulang</span>
                      </p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {timeOut ? `${timeOut} WIB` : '-'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {timeOut ? 'Presensi tuntas' : 'Belum checkout'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-white/10 py-5 text-center z-10 bg-white/70 dark:bg-transparent">
        <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium tracking-wide">
          &copy; {new Date().getFullYear()} SATIVA &bull; Sistem Presensi & Evaluasi Iklim Tim Klinik Kecantikan
        </p>
      </footer>

      <ScrollToTop />
    </div>
  );
}
