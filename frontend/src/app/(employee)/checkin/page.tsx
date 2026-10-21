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
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutAttendanceCard from '@/components/attendance/CheckoutAttendanceCard';
import EmployeeScheduleView from '@/components/schedule/EmployeeScheduleView';
import { 
  Smile, Frown, Meh, SmilePlus, LogIn, 
  Send, Calendar, Clock, LogOut, CheckCircle, 
  Droplets, History, MapPin, ShieldAlert, Sparkles,
  Lock, Check, ArrowRight, User, CalendarDays
} from 'lucide-react';

export default function CheckinPage() {
  return (
    <AuthGuard allowedRoles={['karyawan']}>
      <CheckinContent />
    </AuthGuard>
  );
}

function CheckinContent() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [mood, setMood] = useState<number>(0);
  const [journal, setJournal] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [checkinInfo, setCheckinInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mainTab, setMainTab] = useState<'presensi' | 'jadwal'>('presensi');
  
  // Real-time live clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'SELAMAT PAGI';
    if (hour >= 11 && hour < 15) return 'SELAMAT SIANG';
    if (hour >= 15 && hour < 18) return 'SELAMAT SORE';
    return 'SELAMAT MALAM';
  };

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.get('/checkin/today-status');
        const data = res.data;
        if (data.hasCheckedIn) {
          setCheckedInToday(true);
          setCheckinInfo(data.checkin);
          if (data.hasCheckedOut) {
            setCheckedOutToday(true);
          }
        }
      } catch (err) {
        console.error('Failed to load check-in status', err);
      }
    }
    checkStatus();
  }, []);

  const getGeolocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: -6.2088, longitude: 106.8456 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve({ latitude: -7.5603728, longitude: 110.7666546 });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const coords = await getGeolocation();
      const res = await api.post('/checkin', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      setCheckedInToday(true);
      setCheckinInfo({
        submittedAt: res.data.checkInTime,
        attendanceStatus: res.data.attendanceStatus,
        officeLabel: res.data.officeLabel,
        distanceMeters: res.data.distanceMeters,
        lateMinutes: res.data.lateMinutes || 0,
        checkOutTime: null,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Presensi masuk gagal. Pastikan izin lokasi aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mood === 0) {
      setErrorMsg('Silakan pilih salah satu kondisi perasaan Anda hari ini sebelum pulang.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const coords = await getGeolocation();
      const res = await api.post('/checkin/checkout', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        moodScore: mood,
        noteText: journal,
      });

      setCheckedOutToday(true);
      setCheckinInfo((prev: any) => ({
        ...prev,
        checkOutTime: res.data.checkOutTime,
        attendanceStatus: res.data.attendanceStatus,
        distanceMeters: res.data.distanceMeters,
      }));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Presensi pulang gagal.');
    } finally {
      setLoading(false);
    }
  };

  const moodOptions = [
    { score: 1, icon: Frown, label: 'Lelah Berat', desc: 'Butuh istirahat', color: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 ring-rose-400' },
    { score: 2, icon: Frown, label: 'Kurang Baik', desc: 'Ada kendala', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 ring-amber-400' },
    { score: 3, icon: Meh, label: 'Biasa Saja', desc: 'Cukup lancar', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 ring-sky-400' },
    { score: 4, icon: Smile, label: 'Bersemangat', desc: 'Bekerja baik', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 ring-emerald-400' },
    { score: 5, icon: SmilePlus, label: 'Sangat Puas', desc: 'Hari produktif', color: 'text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 ring-teal-400' },
  ];

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Decorative ambient gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-400/10 dark:bg-[rgba(160,212,228,0.12)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 dark:bg-[rgba(31,62,83,0.35)] rounded-full blur-[140px] pointer-events-none" />

      {/* Modern Responsive Navbar */}
      <nav className="w-full bg-white/95 dark:bg-[#102636]/90 border-b border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-30 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white block leading-none">
                SATIVA
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                Klinik Kecantikan &bull; Portal Karyawan
              </span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/history')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white shadow-sm transition-all"
              title="Lihat riwayat presensi saya"
            >
              <History className="h-4 w-4 text-sky-500" />
              <span className="hidden sm:inline">Riwayat Presensi</span>
            </button>

            <ThemeToggle />
            <SwitchLanguage />

            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
              title="Keluar dari akun"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 z-10 flex-1 flex flex-col justify-center">
        {/* User Badge Info Bar */}
        <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.fullName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Staf Klinik &bull; {user?.email}
              </p>
            </div>
          </div>

          {/* Current Live Clock Badge */}
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-sky-300">
              <Clock className="h-3 w-3 text-sky-500 animate-spin" />
              <span>{currentTime || '08:00 WIB'}</span>
            </span>
          </div>
        </div>

        {/* Tab Switcher: Presensi vs Jadwal Shift (Read-Only) */}
        <div className="flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setMainTab('presensi')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'presensi'
                ? 'bg-white dark:bg-[#111c27] text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Presensi & Kepulangan</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('jadwal')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'jadwal'
                ? 'bg-white dark:bg-[#111c27] text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Jadwal Shift Kerja (Read-Only)</span>
          </button>
        </div>

        {mainTab === 'jadwal' ? (
          <EmployeeScheduleView />
        ) : (
          <AnimatePresence mode="wait">
            {checkedInToday ? (
            checkedOutToday ? (
              /* ========================================================
                 STATE 3: PRESENSI SELESAI (SUDAH MASUK & SUDAH PULANG)
                 ======================================================== */
              <motion.div 
                key="state3"
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-[#111c27] rounded-3xl p-6 sm:p-8 text-center shadow-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mb-5 shadow-sm">
                  <CheckCircle className="h-10 w-10" />
                </div>
                
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block mb-3">
                  Shift Hari Ini Selesai &bull; Terverifikasi
                </span>

                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                  TERIMA KASIH ATAS KERJA KERASNYA!
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 max-w-md mx-auto">
                  Presensi masuk dan pulang Anda hari ini telah tercatat rapi di sistem klinik Sativa. Selamat beristirahat!
                </p>

                {/* Detail Kartu Presensi */}
                <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-5 mb-6 space-y-3 max-w-md mx-auto text-left border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Tanggal Presensi:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{todayStr}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Lokasi Klinik:</span>
                    <span className="text-slate-900 dark:text-white font-bold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-sky-500" />
                      {checkinInfo?.officeLabel || 'Klinik Sativa Pusat'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">Jam Masuk</p>
                      <p className="text-base font-bold text-slate-900 dark:text-emerald-400">
                        {formatTime(checkinInfo?.submittedAt || checkinInfo?.checkInTime)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">Jam Pulang</p>
                      <p className="text-base font-bold text-slate-900 dark:text-sky-400">
                        {formatTime(checkinInfo?.checkOutTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/history')}
                  className="w-full max-w-md mx-auto px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <History className="h-4 w-4" />
                  <span>Buka Lembar Riwayat Presensi Lengkap</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </motion.div>
            ) : (
              /* ========================================================
                 STATE 2: SUDAH MASUK, WAKTUNYA PRESENSI PULANG & EVALUASI
                 ======================================================== */
              <motion.div 
                key="state2"
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Ringkasan Jam Masuk Hari Ini */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Jam Masuk Anda: <strong>{formatTime(checkinInfo?.submittedAt || checkinInfo?.checkInTime)}</strong></span>
                  </div>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Tercatat</span>
                </div>

                <CheckoutAttendanceCard 
                  onCheckoutSuccess={() => {
                    setCheckedOutToday(true);
                    setCheckinInfo((prev: any) => ({
                      ...prev,
                      checkOutTime: new Date().toISOString(),
                      attendanceStatus: 'hadir',
                    }));
                  }}
                />
              </motion.div>
            )
          ) : (
            /* ========================================================
               STATE 1: FORM UTAMA (BELUM PRESENSI MASUK)
               ======================================================== */
            <motion.div 
              key="state1"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-[#111c27] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              {/* Header Info Selamat Datang */}
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 mb-4 shadow-sm">
                  <Clock className="h-8 w-8" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
                  {getGreeting()}
                </h1>
                <p className="text-sky-600 dark:text-sky-400 font-bold text-sm">
                  {user?.fullName}
                </p>
                
                <div className="flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-sky-500" />
                    <span>{todayStr}</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Status Lokasi & Geofence Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6 text-center space-y-2">
                <div className="inline-flex p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold text-sm">
                  Verifikasi Lokasi Presensi Klinik
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                  Sistem otomatis memverifikasi GPS presensi Anda wajib berada di area Orella Aesthetic Clinic (radius ketat &lt; 2 meter). Pastikan Anda telah berada tepat di lokasi klinik.
                </p>
              </div>

              {/* Tombol Presensi Masuk Utama */}
              <form onSubmit={handleCheckin}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:via-indigo-500 hover:to-teal-400 text-white font-extrabold text-sm sm:text-base rounded-2xl py-4 sm:py-5 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none uppercase tracking-wider transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi GPS...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span>Presensi Masuk Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
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
