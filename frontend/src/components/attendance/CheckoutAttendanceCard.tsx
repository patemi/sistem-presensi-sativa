'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, Clock, CheckCircle2, AlertCircle, Sparkles, 
  MessageSquare, Coffee, ChevronRight, Check
} from 'lucide-react';

interface TodayAttendanceStatus {
  date: string;
  shiftType: 'PAGI' | 'SIANG' | string;
  shiftStart: string;
  shiftEnd: string;
  isPastShiftEnd: boolean;
  hasCheckedOut: boolean;
  attendance?: any;
  needsCheckoutNotice: boolean;
}

export default function CheckoutAttendanceCard({ onCheckoutSuccess }: { onCheckoutSuccess?: () => void }) {
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isPastEndLive, setIsPastEndLive] = useState(false);
  
  // Form State
  const [mentalHealthLog, setMentalHealthLog] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  // Fetch status kepulangan & shift dari backend
  const fetchStatus = async () => {
    try {
      const res = await api.get('/attendance/today');
      setStatus(res.data);
      if (res.data.hasCheckedOut && res.data.attendance) {
        setSuccessData({
          summary: {
            check_out_time: res.data.attendance.check_out_time,
            overtime_minutes: res.data.attendance.overtime_minutes,
            mental_health_log: res.data.attendance.mental_health_log,
            shift_label: res.data.shiftType === 'SIANG' ? 'SIANG (10:30 - 19:00)' : 'PAGI (08:30 - 17:00)',
          },
        });
      }
    } catch (err: any) {
      console.error('Error fetching today attendance status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Live timer & real-time shift end comparison
  useEffect(() => {
    const checkLiveTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );

      if (status?.shiftEnd) {
        const [h, m] = status.shiftEnd.split(':').map(Number);
        const shiftEndObj = new Date(now);
        shiftEndObj.setHours(h || 17, m || 0, 0, 0);
        setIsPastEndLive(now.getTime() >= shiftEndObj.getTime());
      }
    };

    checkLiveTime();
    const interval = setInterval(checkLiveTime, 1000);
    return () => clearInterval(interval);
  }, [status?.shiftEnd]);

  // Handle submit kepulangan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!mentalHealthLog.trim()) {
      setErrorMsg('Kolom "Ceritakan harimu / Unek-unek hari ini" wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const res = await api.patch('/attendance/checkout', {
        check_out_time: now.toISOString(),
        mental_health_log: mentalHealthLog.trim(),
      });

      setSuccessData(res.data);
      await fetchStatus();
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Gagal menyimpan kepulangan. Silakan coba kembali.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 animate-pulse text-center">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto mb-3" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md mx-auto" />
      </div>
    );
  }

  const isCheckedOut = status?.hasCheckedOut || !!successData;
  const isWaitingCheckout = isPastEndLive && !isCheckedOut;

  return (
    <div className="w-full bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm transition-all">
      {/* Header Info Shift & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Shift Kerja Hari Ini
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {status?.shiftType === 'SIANG' ? 'SIANG (10:30 - 19:00)' : 'PAGI (08:30 - 17:00)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Jam Operasional Shift: <strong className="text-slate-800 dark:text-slate-200">{status?.shiftStart || '08:30'} — {status?.shiftEnd || '17:00'} WIB</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Status Abu-Abu: "Menunggu Submit Kepulangan" jika jam saat ini sudah melebihi jam selesai shift namun belum checkout */}
          {isWaitingCheckout && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold shadow-sm animate-pulse">
              <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
              <span>Menunggu Submit Kepulangan</span>
            </span>
          )}

          {isCheckedOut && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold shadow-sm">
              <Check className="h-3.5 w-3.5" />
              <span>Kepulangan Tercatat</span>
            </span>
          )}

          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-sky-500" />
            <span>{currentTimeStr || '17:00 WIB'}</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isCheckedOut ? (
          /* ========================================================
             TAMPILAN SUDAH CHECKOUT / PULANG
             ======================================================== */
          <motion.div
            key="success-box"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Kepulangan & Unek-unek Hari Ini Berhasil Tersimpan!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                  Terima kasih atas dedikasi dan kerja keras Anda hari ini di Klinik Sativa. Selamat beristirahat!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#111c27] border border-emerald-200 dark:border-emerald-900/50">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Waktu Submit Pulang</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {successData?.summary?.check_out_time
                        ? new Date(successData.summary.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                        : '-'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#111c27] border border-emerald-200 dark:border-emerald-900/50">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Waktu Lembur (Overtime)</span>
                    <span className={`font-bold ${successData?.summary?.overtime_minutes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {successData?.summary?.overtime_minutes > 0
                        ? `+${successData.summary.overtime_minutes} Menit (Dihitung Otomatis)`
                        : '0 Menit (Tepat Waktu)'}
                    </span>
                  </div>
                </div>

                {successData?.summary?.mental_health_log && (
                  <div className="mt-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Catatan / Unek-unek Anda:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 italic">
                      &ldquo;{successData.summary.mental_health_log}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================
             FORM INPUT KEPULANGAN & DETEKSI STRES
             ======================================================== */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isWaitingCheckout && (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>
                    Shift Anda telah berakhir pada pukul <strong>{status?.shiftEnd} WIB</strong>. Silakan segera submit kepulangan.
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                  Status: Menunggu Submit
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Ceritakan harimu / Unek-unek hari ini <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wajib Diisi Sebelum Pulang
                </span>
              </div>

              <textarea
                value={mentalHealthLog}
                onChange={(e) => setMentalHealthLog(e.target.value)}
                placeholder="Ceritakan bagaimana perasaanmu, kendala pasien, suasana kerja, atau hal apapun yang kamu rasakan hari ini..."
                rows={4}
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:bg-white text-slate-900 dark:text-white text-xs sm:text-sm rounded-2xl p-4 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-none shadow-sm"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                * Cerita Anda membantu tim klinik menjaga iklim kerja yang sehat, adil, dan saling mendukung.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !mentalHealthLog.trim()}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-500 hover:via-indigo-500 hover:to-sky-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Submit Kepulangan</span>
                </>
              )}
            </button>
          </form>
        )}
      </AnimatePresence>
    </div>
  );
}
