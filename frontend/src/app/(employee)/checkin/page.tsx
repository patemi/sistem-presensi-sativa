'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AuthGuard from '@/components/layout/AuthGuard';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, Frown, Meh, SmilePlus, LogIn, 
  Send, Calendar, Clock, LogOut, CheckCircle, 
  Droplets, History, MapPin, ShieldAlert
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

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        (error) => {
          resolve({ latitude: -6.2088, longitude: 106.8456 });
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
        checkOutTime: null,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Check-in gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mood === 0) {
      setErrorMsg('Silakan pilih mood Anda terlebih dahulu');
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
      setErrorMsg(err.response?.data?.message || err.message || 'Check-out gagal');
    } finally {
      setLoading(false);
    }
  };

  const getMoodConfig = (score: number) => {
    switch (score) {
      case 1:
        return { icon: Frown, color: 'text-red-400 bg-red-900/30 border-red-500/50', label: 'Sangat Buruk' };
      case 2:
        return { icon: Frown, color: 'text-orange-400 bg-orange-900/30 border-orange-500/50', label: 'Buruk' };
      case 3:
        return { icon: Meh, color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50', label: 'Biasa Saja' };
      case 4:
        return { icon: Smile, color: 'text-teal-400 bg-teal-900/30 border-teal-500/50', label: 'Baik' };
      case 5:
        return { icon: SmilePlus, color: 'text-green-400 bg-green-900/30 border-green-500/50', label: 'Sangat Baik' };
      default:
        return { icon: Smile, color: 'text-white/50 bg-white/5 border-white/20', label: '' };
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-50 dark:bg-[#0d1d29] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[rgba(160,212,228,0.15)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[rgba(31,62,83,0.4)] rounded-full blur-[140px] pointer-events-none" />

      {/* Header / Navbar */}
      <nav className="w-full bg-white/95 dark:bg-[#102636]/80 border-b border-slate-200 dark:border-white/10 shadow-sm md:shadow-2xl z-30 sticky top-0 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.05 }}
              className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-white/5 flex items-center justify-center shadow-sm border border-sky-200 dark:border-[#a0d4e4]/30"
            >
              <Droplets className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
            </motion.div>
            <span className="font-extrabold text-xl tracking-widest text-slate-900 dark:text-white uppercase drop-shadow-md">
              {t('common.app_name')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/history')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white shadow-sm uppercase tracking-wider"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('checkin.view_history')}</span>
            </motion.button>
            
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

      {/* Main Body container */}
      <main className="w-full max-w-xl mx-auto px-4 py-12 z-10 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {checkedInToday ? (
            checkedOutToday ? (
              /* STATE 3: COMPLETED BOTH CHECK-IN & CHECK-OUT */
              <motion.div 
                key="state3"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card rounded-3xl p-8 text-center shadow-sm md:shadow-2xl border border-slate-200 dark:border-white/15"
              >
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 dark:bg-green-900/30 border border-emerald-200 dark:border-green-500/50 text-emerald-600 dark:text-green-400 mb-6 shadow-sm">
                  <CheckCircle className="h-10 w-10" />
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 heading-display">
                  PRESENSI SELESAI
                </h1>
                <p className="text-slate-500 dark:text-[#a0d4e4] text-sm leading-relaxed mb-8 opacity-80">
                  Anda telah melakukan absen masuk dan pulang hari ini. Selamat beristirahat!
                </p>

                {/* Attendance card detail */}
                <div className="glass-panel rounded-2xl p-6 mb-8 space-y-4 max-w-sm mx-auto text-left shadow-sm border border-slate-200 dark:border-white/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-[#a0d4e4] font-semibold uppercase tracking-wider">Status Absensi</span>
                    <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] bg-emerald-50 dark:bg-green-900/50 text-emerald-700 dark:text-green-300 border border-emerald-200 dark:border-green-500/30 shadow-inner">
                      HADIR
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-[#a0d4e4] font-semibold uppercase tracking-wider">Kantor</span>
                    <span className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 drop-shadow-sm">
                      <MapPin className="h-4 w-4 text-sky-600 dark:text-[#a0d4e4]" />
                      {checkinInfo?.officeLabel || '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-[#a0d4e4] font-semibold uppercase tracking-wider">Clock-In</span>
                    <span className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 drop-shadow-sm">
                      <LogIn className="h-4 w-4 text-sky-600 dark:text-[#a0d4e4]" />
                      {formatTime(checkinInfo?.submittedAt || checkinInfo?.checkInTime)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-[#a0d4e4] font-semibold uppercase tracking-wider">Clock-Out</span>
                    <span className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 drop-shadow-sm">
                      <LogOut className="h-4 w-4 text-sky-600 dark:text-[#a0d4e4]" />
                      {formatTime(checkinInfo?.checkOutTime)}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/history')}
                  className="w-full max-w-sm mx-auto glass-button text-slate-800 dark:text-white font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm border border-slate-200 dark:border-white/15"
                >
                  <History className="h-5 w-5" />
                  Riwayat Presensi
                </motion.button>
              </motion.div>
            ) : (
              /* STATE 2: CHECKED-IN, BUT NEED TO CHECK-OUT (WELLBEING FEEDBACK) */
              <motion.div 
                key="state2"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card rounded-3xl p-8 shadow-sm md:shadow-2xl border border-slate-200 dark:border-white/15"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-sky-50 dark:bg-[rgba(160,212,228,0.1)] border border-sky-200 dark:border-[#a0d4e4]/30 text-sky-600 dark:text-[#a0d4e4] mb-6 shadow-sm">
                    <LogOut className="h-10 w-10 animate-pulse" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 heading-display">
                    ABSEN PULANG
                  </h1>
                  <p className="text-slate-500 dark:text-[#a0d4e4] text-sm leading-relaxed opacity-80">
                    Waktunya pulang! Bagikan kondisi mental Anda hari ini sebelum mengakhiri shift. Data Anda dianonimkan.
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-6 flex items-start gap-2.5 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 text-xs font-medium backdrop-blur-sm">
                    <ShieldAlert className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleCheckout} className="space-y-6">
                  {/* Mood scale input */}
                  <div>
                    <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-bold mb-4 uppercase tracking-wider text-center">
                      Bagaimana mood Anda di akhir kerja ini?
                    </label>
                    
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const cfg = getMoodConfig(score);
                        const isSelected = mood === score;
                        const Icon = cfg.icon;
                        return (
                          <motion.button
                            key={score}
                            type="button"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setMood(score); setErrorMsg(''); }}
                            className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border text-center transition-all duration-200 ${
                              isSelected
                                ? `${cfg.color} shadow-md`
                                : 'bg-slate-100 dark:bg-[rgba(255,255,255,0.02)] border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Icon className={`h-8 w-8 mb-2 ${isSelected ? '' : 'opacity-60'}`} />
                            <span className="text-[10px] font-bold tracking-tight leading-none block h-5 flex items-center justify-center uppercase">
                              {score}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                    
                    {mood > 0 && (
                      <p className={`text-xs font-bold mt-4 text-center transition-all uppercase tracking-wider ${getMoodConfig(mood).color.split(' ')[0]}`}>
                        Terpilih: {getMoodConfig(mood).label}
                      </p>
                    )}
                  </div>

                  {/* Journal description and textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-bold uppercase tracking-wider">
                        Catatan (Opsional)
                      </label>
                    </div>

                    <textarea
                      value={journal}
                      onChange={(e) => setJournal(e.target.value)}
                      placeholder="Tuliskan keluh kesah atau pencapaian hari ini. Catatan ini dianonimkan (tanpa nama) dan dikumpulkan bersama rekan satu divisi."
                      rows={4}
                      className="w-full bg-white dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl p-4 outline-none transition-all duration-300 placeholder-slate-400 dark:placeholder-[rgba(255,255,255,0.3)] resize-none shadow-sm"
                    />
                  </div>

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || mood === 0}
                    className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold text-sm rounded-2xl py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-widest transition-all"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        Kirim & Clock-Out
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )
          ) : (
            /* STATE 1: FORM STATE (NEED TO CLOCK IN) */
            <motion.div 
              key="state1"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-3xl p-8 shadow-sm md:shadow-2xl border border-slate-200 dark:border-white/15"
            >
              {/* Header info */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-sky-50 dark:bg-[rgba(160,212,228,0.1)] border border-sky-200 dark:border-[#a0d4e4]/30 text-sky-600 dark:text-[#a0d4e4] mb-6 shadow-sm">
                  <Clock className="h-10 w-10 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white heading-display mb-2 drop-shadow-md">
                  SELAMAT PAGI
                </h1>
                <p className="text-sky-700 dark:text-[#a0d4e4] font-medium opacity-90 mb-4">{user?.fullName}</p>
                
                <div className="flex items-center justify-center text-xs text-slate-600 dark:text-[#a0d4e4] mb-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[rgba(255,255,255,0.05)] px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 backdrop-blur-sm shadow-inner">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold tracking-wide uppercase">{todayStr}</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-6 flex items-start gap-2.5 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 text-xs font-medium backdrop-blur-sm">
                  <ShieldAlert className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCheckin} className="space-y-6">
                <div className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-[rgba(255,255,255,0.02)] border border-slate-200 dark:border-white/5 backdrop-blur-sm mb-6">
                  <MapPin className="h-10 w-10 mx-auto text-sky-600 dark:text-[#a0d4e4] mb-3 opacity-80" />
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Presensi Lokasi</h3>
                  <p className="text-slate-500 dark:text-[#a0d4e4] text-xs leading-relaxed opacity-70 px-4">
                    Sistem akan memverifikasi bahwa Anda berada dalam radius kantor (maksimal 100 meter). Pastikan GPS perangkat Anda aktif.
                  </p>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold text-sm rounded-2xl py-5 shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none uppercase tracking-widest border border-sky-400/30 transition-all"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Clock-In Sekarang
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
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
