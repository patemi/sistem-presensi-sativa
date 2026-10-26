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
import EditPasswordModal from '@/components/profile/EditPasswordModal';
import FaceAttendanceModal, { CLINIC_LOCATION } from '@/components/attendance/FaceAttendanceModal';
import { useNotification } from '@/lib/context/NotificationContext';
import { 
  Smile, Frown, Meh, SmilePlus, LogIn, 
  Send, Calendar, Clock, LogOut, CheckCircle, 
  Droplets, History, MapPin, ShieldAlert, Sparkles,
  Lock, Unlock, Check, ArrowRight, User, CalendarDays, KeyRound, ScanFace, ShieldCheck,
  LayoutDashboard, ArrowLeft
} from 'lucide-react';

export default function CheckinPage() {
  return (
    // Catatan: HR dan Admin juga wajib melakukan presensi (tidak ada diskriminasi kewajiban absen)
    <AuthGuard allowedRoles={['karyawan', 'hr', 'owner']}>
      <CheckinContent />
    </AuthGuard>
  );
}

function CheckinContent() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [checkinInfo, setCheckinInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mainTab, setMainTab] = useState<'presensi' | 'jadwal'>('presensi');
  
  // Real-time live clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentTimeRaw, setCurrentTimeRaw] = useState<Date>(new Date());

  // Password Edit Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Biometric Face & Strict GPS Modal
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceModalMode, setFaceModalMode] = useState<'checkin' | 'checkout'>('checkin');

  // Shift & Target Check-out Locking State
  const [targetCheckOut, setTargetCheckOut] = useState<string>('17:00');
  const [targetCheckIn, setTargetCheckIn] = useState<string>('08:30');
  const [canCheckout, setCanCheckout] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeRaw(now);
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );

      // Check if current time >= targetCheckOut
      if (targetCheckOut) {
        const [outH, outM] = targetCheckOut.split(':').map(Number);
        const targetDate = new Date(now);
        targetDate.setHours(outH || 17, outM || 0, 0, 0);
        setCanCheckout(now.getTime() >= targetDate.getTime());
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [targetCheckOut]);

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

  // Fetch Attendance status & shift schedule for today
  const loadTodayAttendance = async () => {
    try {
      const res = await api.get('/attendance/today');
      const data = res.data;
      if (data?.attendance) {
        if (data.attendance.check_in_time) {
          setCheckedInToday(true);
          setCheckinInfo({
            submittedAt: data.attendance.check_in_time,
            checkInTime: data.attendance.check_in_time,
            checkOutTime: data.attendance.check_out_time,
            officeLabel: CLINIC_LOCATION.name,
            attendanceStatus: data.attendance.check_out_time ? 'hadir' : 'belum_lengkap',
          });
        }
        if (data.attendance.check_out_time) {
          setCheckedOutToday(true);
        }
      }

      if (data?.shiftEnd) {
        setTargetCheckOut(data.shiftEnd);
      }
      if (data?.shiftStart) {
        setTargetCheckIn(data.shiftStart);
      }
      if (data?.isPastShiftEnd !== undefined) {
        setCanCheckout(data.isPastShiftEnd);
      }
    } catch (err) {
      console.warn('Gagal memuat status attendance, fallback ke checkin today-status', err);
      try {
        const fallback = await api.get('/checkin/today-status');
        if (fallback.data?.hasCheckedIn) {
          setCheckedInToday(true);
          setCheckinInfo(fallback.data.checkin);
          if (fallback.data.hasCheckedOut) {
            setCheckedOutToday(true);
          }
        }
      } catch (e) {
        console.error('Failed to load check-in status', e);
      }
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const handleOpenFaceCheckIn = () => {
    setFaceModalMode('checkin');
    setIsFaceModalOpen(true);
  };

  const handleOpenFaceCheckOut = () => {
    if (!canCheckout) {
      showNotification({
        type: 'warning',
        title: 'Presensi Pulang Terkunci',
        message: `Tombol absen pulang terkunci. Anda baru dapat melakukan presensi kepulangan setelah jam ${targetCheckOut} WIB sesuai jadwal shift kerja Anda.`,
        badge: 'Jadwal Shift Kerja',
        confirmText: 'Saya Mengerti',
      });
      return;
    }
    setFaceModalMode('checkout');
    setIsFaceModalOpen(true);
  };

  const handleFaceSuccess = (result: any) => {
    loadTodayAttendance();
    if (faceModalMode === 'checkin') {
      setCheckedInToday(true);
      if (result?.target_check_out) {
        setTargetCheckOut(result.target_check_out);
      }
      if (result?.can_checkout !== undefined) {
        setCanCheckout(result.can_checkout);
      }
    } else {
      setCheckedOutToday(true);
    }
  };

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
          {/* Logo Brand & Tombol Panah Kembali ke Dashboard */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Tombol Panah Kembali ke Dashboard (Pojok Kiri Atas) */}
            {(user?.role === 'hr' || user?.role === 'owner') && (
              <button
                type="button"
                onClick={() => router.push(user.role === 'owner' ? '/owner-dashboard' : '/dashboard')}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all shadow-sm hover:-translate-x-0.5 cursor-pointer shrink-0"
                title="Kembali ke Dashboard"
                aria-label="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white block leading-none">
                SATIVA
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                Klinik Kecantikan &bull; Portal Presensi Biometrik
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
        {/* User Badge Info Bar with Edit Password Button */}
        <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {user?.role === 'hr' ? 'HR / Admin' : user?.role === 'owner' ? 'Owner' : 'Staf Klinik'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">

            {/* Tombol Edit Password User */}
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              title="Ubah kata sandi akun Anda"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Edit Password</span>
            </button>

            {/* Current Live Clock Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-sky-300">
              <Clock className="h-3.5 w-3.5 text-sky-500 animate-spin" />
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
                    Presensi masuk biometrik dan kepulangan Anda hari ini telah tercatat sah di sistem Orella Aesthetic Clinic. Selamat beristirahat!
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
                        {CLINIC_LOCATION.name} (&lt; 1m)
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
                   STATE 2: SUDAH MASUK, TAMPILKAN STATUS DAN LOGIKA TOMBOL PULANG
                   ======================================================== */
                <motion.div 
                  key="state2"
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Status Kehadiran Berhasil */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs shadow-sm">
                    <div className="flex items-center gap-3 text-emerald-900 dark:text-emerald-200">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
                          Kehadiran Berhasil
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Tercatat jam masuk: <strong>{formatTime(checkinInfo?.submittedAt || checkinInfo?.checkInTime)}</strong>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-[10px]">
                      Aktif Bekerja
                    </span>
                  </div>

                  {/* Info Jadwal & Kunci Tombol Absen Pulang */}
                  <div className="bg-white dark:bg-[#111c27] rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200 dark:border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className={`p-2 rounded-xl ${canCheckout ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {canCheckout ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                      </div>
                    </div>

                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1.5">
                      {canCheckout ? 'Waktunya Presensi Pulang & Refleksi' : 'Presensi Pulang Belum Waktunya'}
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                      {canCheckout ? (
                        <>
                          Waktu saat ini sudah mencapai atau melewati target selesai shift (<strong>{targetCheckOut} WIB</strong>). Silakan lakukan verifikasi wajah & bagikan unek-unek Anda.
                        </>
                      ) : (
                        <>
                          Tombol presensi pulang dikunci hingga jam kerja Anda selesai pada{' '}
                          <strong className="text-slate-800 dark:text-slate-200">{targetCheckOut} WIB</strong>. Tombol akan aktif otomatis saat waktu tercapai.
                        </>
                      )}
                    </p>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 max-w-sm mx-auto mb-6 flex items-center justify-around text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Jam Masuk Target</p>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetCheckIn} WIB</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Target Check-Out</p>
                        <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{targetCheckOut} WIB</p>
                      </div>
                    </div>

                    {/* Tombol Absen Pulang (Terkunci jika now < target_check_out) */}
                    <button
                      type="button"
                      onClick={handleOpenFaceCheckOut}
                      disabled={!canCheckout}
                      className={`w-full max-w-md mx-auto py-4 px-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        canCheckout
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700/60 shadow-none'
                      }`}
                    >
                      {canCheckout ? (
                        <>
                          <ScanFace className="w-5 h-5" />
                          <span>Verifikasi Wajah & Absen Pulang</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Terkunci hingga {targetCheckOut} WIB</span>
                        </>
                      )}
                    </button>
                  </div>
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
                    Verifikasi Biometrik Wajah & Lokasi Klinik Ketat
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                    Kamera akan mencocokkan wajah Anda menggunakan <strong>face-api.js</strong> dan memverifikasi posisi Anda di <strong>{CLINIC_LOCATION.name}</strong> (radius toleransi area gedung klinik &lt; 25 meter).
                  </p>
                </div>

                {/* Tombol Presensi Masuk Biometrik Utama */}
                <button
                  type="button"
                  onClick={handleOpenFaceCheckIn}
                  className="w-full bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:via-indigo-500 hover:to-teal-400 text-white font-extrabold text-sm sm:text-base rounded-2xl py-4 sm:py-5 shadow-xl flex items-center justify-center gap-2 uppercase tracking-wider transition-all cursor-pointer"
                >
                  <ScanFace className="h-5 w-5" />
                  <span>Buka Kamera & Presensi Datang</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Modal Edit Password */}
      <EditPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Modal Face Recognition & Strict GPS */}
      <FaceAttendanceModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        mode={faceModalMode}
        targetCheckOut={targetCheckOut}
        onSuccess={handleFaceSuccess}
      />

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
