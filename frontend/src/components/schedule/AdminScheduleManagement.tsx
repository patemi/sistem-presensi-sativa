'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Calendar, Clock, ArrowRightLeft, Check, X, 
  Sparkles, Users, Plus, RefreshCw, AlertCircle, 
  CheckCircle2, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleItem {
  id: string;
  user_id: string;
  date: string;
  shift_type: 'PAGI' | 'SIANG';
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
  requester_email?: string;
  target_user_name?: string;
  target_user_email?: string;
}

export default function AdminScheduleManagement() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('2026-10');
  const [activeTab, setActiveTab] = useState<'calendar' | 'bulk_setup' | 'swaps'>('calendar');

  // Bulk Generator State
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [defaultShiftType, setDefaultShiftType] = useState<'PAGI' | 'SIANG' | 'ALTERNATE'>('ALTERNATE');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approval state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [approvalAlert, setApprovalAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, swapRes, empRes] = await Promise.all([
        api.get(`/schedule?month=${filterMonth}`),
        api.get('/schedule/swap-requests?all=true'),
        api.get('/auth/employees'),
      ]);

      setSchedules(schedRes.data || []);
      setSwapRequests(swapRes.data || []);
      setEmployees(empRes.data?.employees || []);
    } catch (err: any) {
      console.error('Failed to load admin schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  /**
   * FITUR HR SETUP JADWAL (NEST.JS):
   * Generate & Bulk-create jadwal 1 bulan penuh
   */
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg(null);

    const [yearStr, monthStr] = filterMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12

    // Target employees
    const targetEmployees = selectedUserId === 'all'
      ? employees
      : employees.filter((e) => e.id === selectedUserId);

    if (targetEmployees.length === 0) {
      setBulkMsg({ type: 'error', text: 'Tidak ada karyawan yang dipilih.' });
      return;
    }

    // Days in selected month
    const daysInMonth = new Date(year, month, 0).getDate();
    const payload: { user_id: string; date: string; shift_type: 'PAGI' | 'SIANG' }[] = [];

    targetEmployees.forEach((emp, empIdx) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let shift: 'PAGI' | 'SIANG' = 'PAGI';
        if (defaultShiftType === 'PAGI') {
          shift = 'PAGI';
        } else if (defaultShiftType === 'SIANG') {
          shift = 'SIANG';
        } else {
          // ALTERNATE: ganjil-genap bergantian agar adil
          shift = (day + empIdx) % 2 === 0 ? 'PAGI' : 'SIANG';
        }

        payload.push({
          user_id: emp.id,
          date: dateStr,
          shift_type: shift,
        });
      }
    });

    setBulkLoading(true);
    try {
      const res = await api.post('/schedule/bulk-create', payload);
      setBulkMsg({
        type: 'success',
        text: `Berhasil generate & upload ${res.data?.count || payload.length} jadwal kerja untuk ${targetEmployees.length} staf klinik pada bulan ${filterMonth}!`,
      });
      fetchData();
      setTimeout(() => setActiveTab('calendar'), 1800);
    } catch (err: any) {
      setBulkMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal menyimpan jadwal bulk create.',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  /**
   * FITUR TUKAR SHIFT / LIBUR (NEST.JS):
   * Approve swap request via TypeORM Transaction (QueryRunner)
   */
  const handleApproveSwap = async (swapId: string) => {
    setActionLoadingId(swapId);
    setApprovalAlert(null);
    try {
      const res = await api.patch(`/schedule/swap-request/${swapId}/approve-hr`);
      setApprovalAlert({
        type: 'success',
        text: res.data?.message || 'Pertukaran shift berhasil disetujui HR dan jadwal langsung ditukar secara real-time!',
      });
      fetchData();
    } catch (err: any) {
      setApprovalAlert({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal menyetujui tukar shift.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSwap = async (swapId: string) => {
    const reason = prompt('Masukkan alasan penolakan (opsional):') || '';
    setActionLoadingId(swapId);
    setApprovalAlert(null);
    try {
      await api.patch(`/schedule/swap-request/${swapId}/reject`, { reason });
      setApprovalAlert({
        type: 'success',
        text: 'Permohonan tukar shift berhasil ditolak.',
      });
      fetchData();
    } catch (err: any) {
      setApprovalAlert({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal menolak tukar shift.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingSwaps = swapRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Manajemen Jadwal Shift & Tukar Shift
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Setup jadwal operasional klinik (PAGI 08:30-17:00 / SIANG 10:30-19:00) dan kelola transaksi tukar shift staf.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
          />

          <button
            onClick={() => setActiveTab('bulk_setup')}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Setup / Bulk Upload</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'calendar'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Daftar Jadwal Klinik ({schedules.length})
        </button>

        <button
          onClick={() => setActiveTab('swaps')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'swaps'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Pengajuan Tukar Shift</span>
          {pendingSwaps.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {pendingSwaps.length} Menunggu ACC
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bulk_setup')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'bulk_setup'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Setup Jadwal 1 Bulan (HR Generator)</span>
        </button>
      </div>

      {approvalAlert && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2 ${
            approvalAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{approvalAlert.text}</span>
        </div>
      )}

      {/* Tab 1: Daftar Jadwal */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Memuat data jadwal klinik...</div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Belum Ada Jadwal di Bulan {filterMonth}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                Anda dapat melakukan bulk upload atau generate jadwal shift 1 bulan penuh secara otomatis untuk seluruh staf.
              </p>
              <button
                onClick={() => setActiveTab('bulk_setup')}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buka Setup Jadwal 1 Bulan</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                    <th className="py-3 px-4 font-semibold">Nama Karyawan</th>
                    <th className="py-3 px-4 font-semibold">Divisi</th>
                    <th className="py-3 px-4 font-semibold">Tipe Shift</th>
                    <th className="py-3 px-4 font-semibold">Jam Operasional</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {schedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {new Date(sch.date + 'T00:00:00').toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {sch.user_name}
                        </span>
                        <span className="text-[10px] text-slate-400">{sch.user_email}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{sch.division_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            sch.shift_type === 'SIANG'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {sch.shift_type === 'SIANG' ? 'SIANG (10:30-19:00)' : 'PAGI (08:30-17:00)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {sch.shift_start} — {sch.shift_end} WIB
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Permohonan Tukar Shift */}
      {activeTab === 'swaps' && (
        <div className="bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Permohonan Tukar Shift / Libur Staf
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saat disetujui (ACC), sistem secara otomatis mengeksekusi Transaksi Database (QueryRunner) untuk menukar jadwal shift kedua karyawan secara real-time.
            </p>
          </div>

          {swapRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Belum ada permohonan tukar shift dari staf.
            </div>
          ) : (
            <div className="space-y-4">
              {swapRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {req.requester_name}
                      </span>
                      <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {req.target_user_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'HR_APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                        }`}
                      >
                        {req.status === 'HR_APPROVED' ? 'Disetujui HR (Jadwal Ditukar)' : req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>
                        Shift Pemohon: <strong>{req.requester_date}</strong> ({req.requester_name})
                      </div>
                      <div>
                        Shift Target: <strong>{req.target_date}</strong> ({req.target_user_name})
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      Alasan: &ldquo;{req.reason}&rdquo;
                    </p>
                  </div>

                  {/* Tombol Approval HR */}
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleApproveSwap(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{actionLoadingId === req.id ? 'Memproses...' : 'ACC / Setujui Tukar Shift'}</span>
                        </button>

                        <button
                          onClick={() => handleRejectSwap(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-semibold">
                        Selesai ({req.status})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Setup Jadwal Bulk Create */}
      {activeTab === 'bulk_setup' && (
        <div className="bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Setup & Generate Jadwal Shift Karyawan 1 Bulan Penuh
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Fitur otomatis untuk generate jadwal kerja seluruh tim klinik ke endpoint <code>POST /schedule/bulk-create</code> secara instan.
            </p>
          </div>

          {bulkMsg && (
            <div
              className={`p-4 rounded-2xl mb-5 text-xs font-medium flex items-center gap-2 ${
                bulkMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{bulkMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleBulkGenerate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Bulan & Tahun Jadwal
              </label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                required
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Target Karyawan
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none font-medium"
              >
                <option value="all">Semua Staf Klinik ({employees.length} Karyawan)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.division?.name || 'Karyawan'}) &bull; {emp.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Pola Pembagian Shift
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDefaultShiftType('ALTERNATE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    defaultShiftType === 'ALTERNATE'
                      ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 text-sky-900 dark:text-white ring-1 ring-sky-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block">Bergantian Adil</span>
                  <span className="text-[11px] opacity-75">Pagi & Siang rotasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultShiftType('PAGI')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    defaultShiftType === 'PAGI'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-white ring-1 ring-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block">Semua Shift Pagi</span>
                  <span className="text-[11px] opacity-75">08:30 - 17:00 WIB</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultShiftType('SIANG')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    defaultShiftType === 'SIANG'
                      ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-500 text-amber-900 dark:text-white ring-1 ring-amber-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block">Semua Shift Siang</span>
                  <span className="text-[11px] opacity-75">10:30 - 19:00 WIB</span>
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={bulkLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {bulkLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate & Simpan Jadwal 1 Bulan ke Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
