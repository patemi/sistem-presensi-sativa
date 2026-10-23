'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  Calendar as CalendarIcon, Clock, ArrowRightLeft, 
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, 
  ChevronRight, Users, Plus, Lock, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleItem {
  id: string;
  user_id: string;
  date: string;
  shift_type: 'PAGI' | 'SIANG' | 'LONG' | 'OFF';
  shift_start: string;
  shift_end: string;
  shift_label: string;
  user_name: string;
  user_email: string;
  user_role: string;
  division_name: string;
}

interface SwapRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  requester_date: string;
  target_date: string;
  reason: string;
  status: 'PENDING' | 'PEER_APPROVED' | 'HR_APPROVED' | 'REJECTED';
  created_at: string;
  requester_name?: string;
  target_user_name?: string;
}

export default function EmployeeScheduleView() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [coworkers, setCoworkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('2026-10');
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'swaps'>('my');

  // Modal Ajukan Tukar Shift
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [requesterDate, setRequesterDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [reason, setReason] = useState('');
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapMsg, setSwapMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, swapRes, empRes] = await Promise.all([
        api.get(`/schedule?month=${filterMonth}`),
        api.get('/schedule/swap-requests'),
        api.get('/auth/employees'),
      ]);

      setSchedules(schedRes.data || []);
      setSwapRequests(swapRes.data || []);
      const emps = empRes.data?.employees || [];
      setCoworkers(emps.filter((e: any) => e.id !== user?.id));
    } catch (err: any) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  const handleCreateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapMsg(null);

    if (!targetUserId || !requesterDate || !targetDate || !reason.trim()) {
      setSwapMsg({ type: 'error', text: 'Semua kolom permohonan tukar shift wajib diisi.' });
      return;
    }

    setSwapSubmitting(true);
    try {
      await api.post('/schedule/swap-request', {
        target_user_id: targetUserId,
        requester_date: requesterDate,
        target_date: targetDate,
        reason: reason.trim(),
      });

      setSwapMsg({
        type: 'success',
        text: 'Permohonan tukar shift berhasil dikirim! Menunggu persetujuan HR.',
      });
      setReason('');
      setTargetUserId('');
      setRequesterDate('');
      setTargetDate('');
      fetchData();
      setTimeout(() => setShowSwapModal(false), 2000);
    } catch (err: any) {
      setSwapMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal mengajukan tukar shift.',
      });
    } finally {
      setSwapSubmitting(false);
    }
  };

  const mySchedules = schedules.filter((s) => s.user_id === user?.id);

  return (
    <div className="bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-sky-500" />
              <span>Jadwal Shift Kerja Klinik</span>
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              <Lock className="h-3 w-3" />
              Mode Baca (Read-Only)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lihat jadwal shift Anda atau ajukan pertukaran shift kerja dengan rekan klinik.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
          />

          <button
            onClick={() => {
              setSwapMsg(null);
              setShowSwapModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Ajukan Tukar Shift</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'my'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Jadwal Saya ({mySchedules.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'all'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Semua Tim Klinik ({schedules.length})
        </button>
        <button
          onClick={() => setActiveTab('swaps')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'swaps'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>Status Tukar Shift</span>
          {swapRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {swapRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Memuat jadwal shift...</div>
      ) : activeTab === 'my' ? (
        /* ========================================================
           TAB 1: JADWAL SAYA
           ======================================================== */
        mySchedules.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada jadwal shift untuk Anda di bulan ini. Jadwal akan di-setup oleh HR.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {mySchedules.map((sch) => (
              <div
                key={sch.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {new Date(sch.date + 'T00:00:00').toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        sch.shift_type === 'OFF'
                          ? 'bg-rose-500 text-white border border-rose-600'
                          : sch.shift_type === 'LONG'
                          ? 'bg-amber-400 text-amber-950 font-black border border-amber-500'
                          : sch.shift_type === 'SIANG'
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {sch.shift_type === 'OFF' ? 'LIBUR (OFF)' : sch.shift_type === 'LONG' ? 'LONG SHIFT' : sch.shift_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-sky-500" />
                    <span>
                      {sch.shift_type === 'OFF' ? 'Hari Libur Terjadwal' : `${sch.shift_start} — ${sch.shift_end} WIB`}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Status: Terjadwal</span>
                  <span className="font-semibold text-slate-400">Read-Only</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'all' ? (
        /* ========================================================
           TAB 2: SEMUA TIM KLINIK
           ======================================================== */
        schedules.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada data jadwal klinik untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Karyawan</th>
                  <th className="py-2.5 px-3 font-semibold">Divisi</th>
                  <th className="py-2.5 px-3 font-semibold">Shift</th>
                  <th className="py-2.5 px-3 font-semibold">Jam Kerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedules.map((sch) => (
                  <tr
                    key={sch.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                      sch.user_id === user?.id ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {new Date(sch.date + 'T00:00:00').toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        weekday: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sch.user_name}
                      </span>
                      {sch.user_id === user?.id && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold">
                          Saya
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{sch.division_name}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sch.shift_type === 'OFF'
                            ? 'bg-rose-500 text-white'
                            : sch.shift_type === 'LONG'
                            ? 'bg-amber-400 text-amber-950 font-black'
                            : sch.shift_type === 'SIANG'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {sch.shift_type === 'OFF' ? 'OFF' : sch.shift_type === 'LONG' ? 'LONG' : sch.shift_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {sch.shift_type === 'OFF' ? 'Libur' : `${sch.shift_start} — ${sch.shift_end}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ========================================================
           TAB 3: STATUS TUKAR SHIFT
           ======================================================== */
        swapRequests.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada permohonan tukar shift.
          </div>
        ) : (
          <div className="space-y-3">
            {swapRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {req.requester_name || 'Pemohon'} &rarr; {req.target_user_name || 'Rekan Target'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'HR_APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {req.status === 'HR_APPROVED' ? 'Disetujui HR (Jadwal Ditukar)' : req.status}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400">
                    Tanggal Ditukar: <strong>{req.requester_date}</strong> &harr; <strong>{req.target_date}</strong>
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 italic mt-1">
                    Alasan: &ldquo;{req.reason}&rdquo;
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 shrink-0">
                  Diajukan: {new Date(req.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Ajukan Tukar Shift */}
      <AnimatePresence>
        {showSwapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
                  <span>Pengajuan Tukar Shift Karyawan</span>
                </h3>
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  &times;
                </button>
              </div>

              {swapMsg && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
                    swapMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{swapMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateSwap} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pilih Rekan Kerja Target *
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Pilih Rekan Tim --</option>
                    {coworkers.map((cw) => (
                      <option key={cw.id} value={cw.id}>
                        {cw.fullName} ({cw.division?.name || 'Karyawan'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Tanggal Shift Saya *
                    </label>
                    <input
                      type="date"
                      value={requesterDate}
                      onChange={(e) => setRequesterDate(e.target.value)}
                      required
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Tanggal Shift Rekan *
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      required
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Alasan Tukar Shift *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Contoh: Ada keperluan keluarga mendadak, sudah konfirmasi lisan dengan rekan terkait..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSwapModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={swapSubmitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {swapSubmitting ? 'Mengirim...' : 'Kirim Permohonan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
