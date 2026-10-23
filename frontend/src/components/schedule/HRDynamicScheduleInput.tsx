'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle2, AlertCircle, PlusCircle, Sparkles } from 'lucide-react';
import api from '@/lib/api';

interface HRDynamicScheduleInputProps {
  onScheduleCreated?: () => void;
}

export default function HRDynamicScheduleInput({ onScheduleCreated }: HRDynamicScheduleInputProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [shiftPreset, setShiftPreset] = useState<'PAGI' | 'SIANG' | 'LONG' | 'OFF' | 'CUSTOM'>('PAGI');
  const [targetCheckIn, setTargetCheckIn] = useState('08:30');
  const [targetCheckOut, setTargetCheckOut] = useState('17:00');

  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch employees list
  useEffect(() => {
    async function loadEmployees() {
      setFetchingEmployees(true);
      try {
        const res = await api.get('/auth/employees');
        const list = res.data?.employees || res.data || [];
        setEmployees(list);
        if (list.length > 0) {
          setSelectedUserId(list[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar karyawan:', err);
      } finally {
        setFetchingEmployees(false);
      }
    }

    loadEmployees();
  }, []);

  const handlePresetChange = (preset: 'PAGI' | 'SIANG' | 'LONG' | 'OFF' | 'CUSTOM') => {
    setShiftPreset(preset);
    setError('');
    if (preset === 'PAGI') {
      setTargetCheckIn('08:30');
      setTargetCheckOut('17:00');
    } else if (preset === 'SIANG') {
      setTargetCheckIn('10:30');
      setTargetCheckOut('19:00');
    } else if (preset === 'LONG') {
      setTargetCheckIn('08:30');
      setTargetCheckOut('20:00');
    } else if (preset === 'OFF') {
      setTargetCheckIn('-');
      setTargetCheckOut('-');
      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const day = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
        if (day === 0 || day === 5 || day === 6) {
          setError('⚠️ Peringatan Aturan Shift: Hari libur (OFF) hanya boleh diambil di weekday (Senin s.d. Kamis). Dilarang libur di Jumat, Sabtu, atau Minggu!');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUserId) {
      setError('Pilih karyawan terlebih dahulu');
      return;
    }
    if (!selectedDate) {
      setError('Pilih tanggal shift');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/schedule', {
        user_id: selectedUserId,
        date: selectedDate,
        target_check_in: targetCheckIn,
        target_check_out: targetCheckOut,
        shift_type: shiftPreset === 'CUSTOM' ? (targetCheckIn < '10:00' ? 'PAGI' : 'SIANG') : shiftPreset,
      });

      setSuccess(res.data?.message || 'Jadwal shift karyawan berhasil disimpan!');
      if (onScheduleCreated) {
        onScheduleCreated();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan jadwal shift karyawan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Input Jadwal Shift Karyawan (Dinamis)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Atur target jam masuk (check-in) dan jam pulang (check-out) per karyawan
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pilih Karyawan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Pilih Karyawan Klinik <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={fetchingEmployees || loading}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100"
            >
              {employees.length === 0 ? (
                <option value="">Memuat staf klinik...</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName || emp.name} ({emp.email}) - {emp.role?.toUpperCase()}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pilih Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Tanggal Shift <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Preset Shift Pagi / Siang / LONG / OFF */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Pilihan Shift Kerja Klinik
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handlePresetChange('PAGI')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                shiftPreset === 'PAGI'
                  ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-bold">P (Pagi)</div>
              <div className="text-[10px] opacity-75">08:30 - 17:00</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange('SIANG')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                shiftPreset === 'SIANG'
                  ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-bold">S (Siang)</div>
              <div className="text-[10px] opacity-75">10:30 - 19:00</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange('LONG')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                shiftPreset === 'LONG'
                  ? 'bg-amber-400 border-amber-500 text-amber-950 font-black ring-2 ring-amber-500/30'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="font-bold">LONG (Full)</div>
              <div className="text-[10px] opacity-75">08:30 - 20:00</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange('OFF')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                shiftPreset === 'OFF'
                  ? 'bg-rose-600 border-rose-700 text-white font-black ring-2 ring-rose-500/30'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="font-bold">OFF (Libur)</div>
              <div className="text-[10px] opacity-75">Maks 4x/Bulan</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetChange('CUSTOM')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all col-span-2 sm:col-span-1 ${
                shiftPreset === 'CUSTOM'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-bold">Kustom</div>
              <div className="text-[10px] opacity-75">Jam Bebas</div>
            </button>
          </div>
        </div>

        {/* Target Check-in & Target Check-out */}
        {shiftPreset === 'OFF' ? (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Karyawan dijadwalkan <strong>Libur (OFF)</strong>. Tidak ada target jam kerja untuk hari ini.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Target Check-In (Jam Masuk)
              </label>
              <input
                type="time"
                required
                value={targetCheckIn}
                onChange={(e) => setTargetCheckIn(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Target Check-Out (Jam Pulang)
              </label>
              <input
                type="time"
                required
                value={targetCheckOut}
                onChange={(e) => setTargetCheckOut(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan Jadwal...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Jadwal Shift (POST /schedule)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
