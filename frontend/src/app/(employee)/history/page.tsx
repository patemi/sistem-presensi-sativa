'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AuthGuard from '@/components/layout/AuthGuard';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Droplets, History, ArrowLeft, Calendar, 
  MapPin, LogIn, Clock
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

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[rgba(160,212,228,0.2)] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[rgba(31,62,83,0.5)] rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <nav className="w-full bg-white dark:bg-[#102636] border-b border-slate-200 dark:border-white/10 shadow-sm md:shadow-2xl z-30 sticky top-0 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/checkin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white shadow-sm uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-white/5 border border-sky-200 dark:border-[#a0d4e4]/30 flex items-center justify-center shadow-sm">
              <Droplets className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
            </div>
            <span className="font-extrabold text-xl tracking-widest text-slate-900 dark:text-white uppercase drop-shadow-md hidden sm:inline">
              {t('common.app_name')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <SwitchLanguage />

            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm"
              title={t('common.logout')}
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="w-full max-w-2xl mx-auto px-4 py-12 z-10 flex-1 flex flex-col justify-start">
        {/* Title details */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-sky-50 dark:bg-[rgba(160,212,228,0.1)] border border-sky-200 dark:border-[#a0d4e4]/30 text-sky-600 dark:text-[#a0d4e4] mb-4 shadow-sm">
            <History className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white heading-display drop-shadow-md">
            RIWAYAT PRESENSI
          </h1>
          <p className="text-slate-500 dark:text-[#a0d4e4] text-xs mt-2 leading-relaxed opacity-80 max-w-sm">
            Catatan kehadiran fisik Anda. Data kesehatan mental dianonimkan dan tidak ditampilkan di sini.
          </p>
        </div>

        {loading ? (
          /* LOADING */
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-10 w-10 border-4 border-slate-300 dark:border-[rgba(160,212,228,0.2)] border-t-sky-500 dark:border-t-[#a0d4e4] rounded-full animate-spin mb-4" />
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs font-semibold uppercase tracking-wider animate-pulse">
              Memuat data...
            </p>
          </div>
        ) : historyList.length === 0 ? (
          /* NO DATA */
          <div className="py-20 text-center glass-card border border-slate-200 dark:border-[rgba(255,255,255,0.1)] shadow-sm md:shadow-xl rounded-3xl flex flex-col items-center">
            <Clock className="h-12 w-12 text-slate-400 dark:text-[rgba(160,212,228,0.4)] mb-4" />
            <p className="text-slate-500 dark:text-[#a0d4e4] text-sm font-semibold opacity-80">{t('history.no_data')}</p>
          </div>
        ) : (
          /* TIMELINE LIST */
          <div className="relative border-l border-slate-200 dark:border-[rgba(160,212,228,0.2)] pl-6 space-y-8 ml-3">
            {historyList.map((item: any, index: number) => {
              const date = new Date(item.checkInTime).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
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
                : '-';

              const isComplete = item.attendanceStatus === 'hadir';
              const isLate = item.lateMinutes > 0;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <span className="absolute -left-[31px] top-4 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#102636] border border-sky-400 dark:border-[#a0d4e4]/50 group-hover:border-sky-500 transition-colors duration-300 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-[#a0d4e4]" />
                  </span>

                  {/* Entry card */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-sky-300 dark:hover:border-[rgba(160,212,228,0.3)] transition-all duration-300 shadow-sm md:shadow-lg group-hover:transform group-hover:-translate-y-1">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.05)] pb-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-[#a0d4e4]">
                        <Calendar className="h-4 w-4" />
                        <span className="uppercase tracking-wider">{date}</span>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        {isLate && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 dark:bg-orange-900/40 border border-amber-200 dark:border-orange-500/40 text-[10px] font-bold text-amber-700 dark:text-orange-300 uppercase tracking-widest shadow-sm">
                            TELAT {item.lateMinutes}m
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                          isComplete 
                            ? 'bg-emerald-50 dark:bg-green-900/40 border border-emerald-200 dark:border-green-500/40 text-emerald-700 dark:text-green-300' 
                            : 'bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300'
                        }`}>
                          {isComplete ? 'HADIR' : 'TIDAK LENGKAP'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Clock-in */}
                      <div className="bg-slate-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 dark:text-[#a0d4e4] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5 opacity-80">
                          <LogIn className="h-3.5 w-3.5" />
                          Clock-In
                        </p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">{timeIn} WIB</p>
                        <p className="text-[10px] text-slate-500 dark:text-[rgba(255,255,255,0.6)] flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.officeLabel} ({item.distanceMeters.toFixed(0)}m)
                        </p>
                      </div>

                      {/* Clock-out */}
                      <div className="bg-slate-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 dark:text-[#a0d4e4] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5 opacity-80">
                          <LogOut className="h-3.5 w-3.5" />
                          Clock-Out
                        </p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">{timeOut}{item.checkOutTime ? ' WIB' : ''}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[rgba(255,255,255,0.6)]">
                          {item.checkOutTime ? 'Geofence terverifikasi' : 'Belum absen pulang'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-white/10 py-6 text-center z-10 bg-white/60 dark:bg-transparent">
        <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold tracking-widest uppercase">
          &copy; SATIVA &bull; Privacy Preserved &bull; Geofence Active
        </p>
      </footer>
    </div>
  );
}
