'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  FileSpreadsheet, Save, RefreshCw, Sparkles, CheckCircle2, 
  AlertTriangle, Info, Calendar, UserCheck, ShieldAlert, ChevronRight
} from 'lucide-react';

interface ClinicScheduleMatrixProps {
  onSaved?: () => void;
}

// Preset template jadwal shift klinik Oktober sesuai gambar Excel dari klinik Orella/Sativa
const OCTOBER_PRESET_SCHEDULE: Record<string, string[]> = {
  'Nur': [
    'OFF', 'S', 'S', 'P', 'P', 'P', 'OFF', 'S', 'S', 'S',
    'P', 'P', 'P', 'OFF', 'S', 'S', 'S', 'P', 'OFF', 'S',
    'S', 'P', 'P', 'S', 'P', 'S', 'P', 'P', 'P', 'S', 'S'
  ],
  'Monica': [
    'S', 'S', 'S', 'S', 'S', 'P', 'OFF', 'S', 'S', 'S',
    'S', 'S', 'P', 'P', 'OFF', 'S', 'S', 'P', 'S', 'P',
    'OFF', 'S', 'P', 'S', 'S', 'S', 'P', 'OFF', 'P', 'P', 'S'
  ],
  'April': [
    'P', 'P', 'P', 'P', 'OFF', 'S', 'S', 'P', 'P', 'P',
    'S', 'OFF', 'S', 'P', 'P', 'P', 'P', 'S', 'P', 'S',
    'P', 'OFF', 'S', 'P', 'S', 'S', 'S', 'P', 'OFF', 'P', 'S'
  ],
  'Octavia': [
    'S', 'P', 'P', 'S', 'P', 'OFF', 'P', 'P', 'P', 'S',
    'P', 'P', 'OFF', 'S', 'P', 'P', 'P', 'S', 'P', 'OFF',
    'S', 'P', 'P', 'P', 'P', 'OFF', 'S', 'P', 'S', 'S', 'P'
  ],
  'Alifah': [
    'OFF', 'S', 'S', 'P', 'P', 'P', 'P', 'OFF', 'P', 'P',
    'P', 'P', 'P', 'P', 'OFF', 'S', 'S', 'P', 'P', 'P',
    'OFF', 'P', 'S', 'P', 'P', 'P', 'S', 'S', 'P', 'S', 'S'
  ],
  'Rindi': [
    'P', 'P', 'S', 'P', 'P', 'OFF', 'P', 'LONG', 'P', 'S',
    'P', 'P', 'OFF', 'LONG', 'P', 'S', 'P', 'P', 'P', 'OFF',
    'P', 'P', 'P', 'S', 'P', 'P', 'LONG', 'LONG', 'OFF', 'P', 'P'
  ],
  'Novita': [
    'S', 'S', 'P', 'S', 'P', 'LONG', 'P', 'OFF', 'P', 'P',
    'S', 'P', 'LONG', 'OFF', 'S', 'P', 'S', 'S', 'P', 'LONG',
    'S', 'P', 'P', 'P', 'S', 'P', 'OFF', 'OFF', 'LONG', 'S', 'S'
  ]
};

export default function ClinicScheduleMatrix({ onSaved }: ClinicScheduleMatrixProps) {
  const [filterMonth, setFilterMonth] = useState('2026-10');
  const [employees, setEmployees] = useState<any[]>([]);
  // matrix: { [userId]: { [day]: 'P' | 'S' | 'LONG' | 'OFF' } }
  const [matrix, setMatrix] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const [yearStr, monthStr] = filterMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();

  // Hari-hari dalam bulan (1 s.d. 31)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Ambil nama hari bahasa Indonesia
  const getDayInfo = (day: number) => {
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = d.getUTCDay(); // 0: Min, 1: Sen, 2: Sel, 3: Rab, 4: Kam, 5: Jum, 6: Sab
    const names = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const isSunday = dayOfWeek === 0;
    const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
    const isWeekendForbidden = isSunday || isFriSat;
    return {
      dayOfWeek,
      name: names[dayOfWeek],
      isSunday,
      isFriSat,
      isWeekendForbidden,
    };
  };

  // Fetch karyawan dan jadwal yang sudah tersimpan di database
  const loadData = async () => {
    setLoading(true);
    setAlertInfo(null);
    try {
      const [empRes, schedRes] = await Promise.all([
        api.get('/auth/employees'),
        api.get(`/schedule?month=${filterMonth}`),
      ]);

      const empList: any[] = empRes.data?.employees || empRes.data || [];
      setEmployees(empList);

      const existingSchedules: any[] = schedRes.data || [];
      const newMatrix: Record<string, Record<number, string>> = {};

      empList.forEach((emp) => {
        newMatrix[emp.id] = {};
        for (let d = 1; d <= daysInMonth; d++) {
          newMatrix[emp.id][d] = 'P'; // default
        }
      });

      existingSchedules.forEach((sch) => {
        const schDay = parseInt(sch.date.split('-')[2], 10);
        if (newMatrix[sch.user_id]) {
          const code = sch.shift_code || (sch.shift_type === 'SIANG' ? 'S' : sch.shift_type === 'LONG' ? 'LONG' : sch.shift_type === 'OFF' ? 'OFF' : 'P');
          newMatrix[sch.user_id][schDay] = code;
        }
      });

      setMatrix(newMatrix);
    } catch (err: any) {
      console.error('Failed to load matrix data:', err);
      setAlertInfo({
        type: 'error',
        text: err.response?.data?.message || 'Gagal memuat data matriks jadwal klinik.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterMonth]);

  // Hitung jumlah hari libur (OFF) yang telah diambil oleh karyawan dalam bulan ini
  const countOffDays = (userId: string) => {
    const userRow = matrix[userId] || {};
    let count = 0;
    Object.values(userRow).forEach((shift) => {
      if (shift === 'OFF') count++;
    });
    return count;
  };

  // Ubah shift pada sel tertentu (dengan validasi weekday & kuota 4x)
  const handleCellChange = (userId: string, day: number, nextShift: string) => {
    const dayInfo = getDayInfo(day);

    if (nextShift === 'OFF') {
      // Aturan A: Dilarang libur di Jumat, Sabtu, Minggu
      if (dayInfo.isWeekendForbidden) {
        setAlertInfo({
          type: 'warning',
          text: `⚠️ Dilarang mengambil libur (OFF) pada hari ${dayInfo.name.toUpperCase()} (Tgl ${day})! Hari libur karyawan klinik hanya boleh diambil di weekday (Senin s.d. Kamis).`,
        });
        return;
      }

      // Aturan B: Maksimal 4x sebulan
      const currentOff = countOffDays(userId);
      const isAlreadyOff = matrix[userId]?.[day] === 'OFF';
      if (!isAlreadyOff && currentOff >= 4) {
        setAlertInfo({
          type: 'warning',
          text: `⚠️ Kuota libur tercapai: Karyawan telah mengambil 4 hari libur dalam bulan ini. Maksimal libur adalah 4x sebulan!`,
        });
        return;
      }
    }

    setAlertInfo(null);
    setMatrix((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [day]: nextShift,
      },
    }));
  };

  // Toggle shift cell secara cepat: P -> S -> LONG -> OFF -> P
  const handleCellClick = (userId: string, day: number) => {
    const current = matrix[userId]?.[day] || 'P';
    const sequence = ['P', 'S', 'LONG', 'OFF'];
    const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
    let nextShift = sequence[nextIdx];

    const dayInfo = getDayInfo(day);
    // Jika next shift adalah OFF tapi hari terlarang (Jumat/Sabtu/Minggu), skip ke 'P'
    if (nextShift === 'OFF' && dayInfo.isWeekendForbidden) {
      nextShift = 'P';
    }

    handleCellChange(userId, day, nextShift);
  };

  // Muat preset jadwal klinik Oktober sesuai tabel Excel asli (Image 3)
  const handleLoadOctoberPreset = () => {
    if (employees.length === 0) return;

    const newMatrix = { ...matrix };
    let loadedCount = 0;

    employees.forEach((emp) => {
      // Cari kecocokan nama staf
      const empName = emp.fullName || emp.name || '';
      let matchedKey = Object.keys(OCTOBER_PRESET_SCHEDULE).find((k) =>
        empName.toLowerCase().includes(k.toLowerCase())
      );

      if (matchedKey && OCTOBER_PRESET_SCHEDULE[matchedKey]) {
        const shifts = OCTOBER_PRESET_SCHEDULE[matchedKey];
        newMatrix[emp.id] = {};
        for (let d = 1; d <= daysInMonth; d++) {
          newMatrix[emp.id][d] = shifts[d - 1] || 'P';
        }
        loadedCount++;
      }
    });

    setMatrix(newMatrix);
    setAlertInfo({
      type: 'success',
      text: `Berhasil memuat pola template jadwal shift klinik Oktober untuk ${loadedCount} staf klinik (Nur, Monica, April, Octavia, Alifah, Rindi, Novita)! Silakan periksa atau klik Simpan untuk menerapkan.`,
    });
  };

  // Simpan seluruh data matriks ke backend via POST /schedule/bulk-create
  const handleSaveMatrix = async () => {
    setSaving(true);
    setAlertInfo(null);

    const payload: { user_id: string; date: string; shift_type: string }[] = [];

    Object.entries(matrix).forEach(([userId, days]) => {
      Object.entries(days).forEach(([dayNum, shift]) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        payload.push({
          user_id: userId,
          date: dateStr,
          shift_type: shift,
        });
      });
    });

    if (payload.length === 0) {
      setAlertInfo({ type: 'warning', text: 'Tidak ada jadwal yang dapat disimpan.' });
      setSaving(false);
      return;
    }

    try {
      const res = await api.post('/schedule/bulk-create', payload);
      setAlertInfo({
        type: 'success',
        text: `Sukses! ${res.data?.count || payload.length} data jadwal shift klinik untuk bulan ${filterMonth} berhasil disimpan ke database.`,
      });
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error('Gagal menyimpan bulk matriks jadwal:', err);
      setAlertInfo({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Gagal menyimpan seluruh jadwal shift klinik.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Style badge shift
  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'OFF':
        return 'bg-red-500 text-white font-extrabold border-red-600 shadow-sm';
      case 'LONG':
        return 'bg-amber-400 text-amber-950 font-black border-amber-500 shadow-sm';
      case 'S':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold';
      case 'P':
      default:
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800 font-bold';
    }
  };

  return (
    <div className="bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Matriks Shift Jadwal Klinik (Excel Grid View)</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  Setup HR Terpadu
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                P (Pagi: 08:30-17:00), S (Siang: 10:30-19:00), LONG (08:30-20:00 closing), OFF (Maks 4x di weekday).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Bulan:</span>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleLoadOctoberPreset}
            disabled={loading || saving}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Muat preset jadwal dari contoh Excel Oktober untuk Nur, Monica, April, Octavia, Alifah, Rindi, Novita"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Muat Pola Excel Oktober</span>
          </button>

          <button
            onClick={handleSaveMatrix}
            disabled={saving || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? 'Menyimpan Matriks...' : 'Simpan Semua Jadwal (Bulk Save)'}</span>
          </button>
        </div>
      </div>

      {/* Legend & Rule Alert Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Legend */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300">Keterangan Shift:</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-100 text-sky-800 border border-sky-300 font-bold">P</span>
            <span className="text-slate-600 dark:text-slate-400">Pagi (08:30-17:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold">S</span>
            <span className="text-slate-600 dark:text-slate-400">Siang (10:30-19:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400 text-amber-950 border border-amber-500 font-black">LONG</span>
            <span className="text-slate-600 dark:text-slate-400">Full Closing (08:30-20:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] bg-red-500 text-white border border-red-600 font-black">OFF</span>
            <span className="text-slate-600 dark:text-slate-400">Libur (Maks 4x)</span>
          </div>
        </div>

        {/* Aturan shift klinik */}
        <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Aturan Libur Klinik:</span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
              Karyawan hanya boleh mengambil libur sebulan <strong>maksimal 4x</strong>, diambil di <strong>weekday (Senin s.d. Kamis)</strong>. Dilarang libur di hari Jumat, Sabtu, atau Minggu!
            </p>
          </div>
        </div>
      </div>

      {/* Alert info bar */}
      {alertInfo && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
            alertInfo.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
              : alertInfo.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {alertInfo.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
          {alertInfo.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
          {alertInfo.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
          <span>{alertInfo.text}</span>
        </div>
      )}

      {/* The Interactive Spreadsheet Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs select-none">
            {/* Header: Bulan & Baris Nomor Hari */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 shadow-sm">
              {/* Row 1: Day of Week Name (kamis, jumat, sabtu, MINGGU...) */}
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-tight">
                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 px-4 py-2 text-left text-slate-700 dark:text-slate-300 min-w-[160px] border-r border-slate-200 dark:border-slate-800">
                  OKTOBER
                </th>
                <th className="px-2 py-2 text-slate-500 dark:text-slate-400 min-w-[70px] border-r border-slate-200 dark:border-slate-800 text-center">
                  Kuota
                </th>
                {daysArray.map((day) => {
                  const info = getDayInfo(day);
                  const headerBg = info.isSunday
                    ? 'bg-rose-200/80 text-rose-900 dark:bg-rose-950/90 dark:text-rose-300'
                    : info.isFriSat
                    ? 'bg-sky-200/70 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400';

                  return (
                    <th
                      key={`dayname-${day}`}
                      className={`px-1.5 py-1.5 min-w-[38px] border-r border-slate-200 dark:border-slate-800 ${headerBg}`}
                    >
                      {info.name.slice(0, 3)}
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Day Numbers (1, 2, 3, 4, 5...) */}
              <tr className="border-b border-slate-300 dark:border-slate-700 font-extrabold text-[11px]">
                <th className="sticky left-0 z-30 bg-slate-200/90 dark:bg-slate-800 px-4 py-2 text-left text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                  Nama Staf Klinik
                </th>
                <th className="bg-slate-200/70 dark:bg-slate-800/80 px-2 py-2 text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 text-center text-[10px]">
                  OFF
                </th>
                {daysArray.map((day) => {
                  const info = getDayInfo(day);
                  const numBg = info.isSunday
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200'
                    : info.isFriSat
                    ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';

                  return (
                    <th
                      key={`daynum-${day}`}
                      className={`px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 ${numBg}`}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    Tidak ada data karyawan klinik
                  </td>
                </tr>
              ) : (
                employees.map((emp, empIdx) => {
                  const offCount = countOffDays(emp.id);
                  const isOverQuota = offCount > 4;
                  const isRindiHR = emp.role === 'hr' || (emp.fullName || '').toLowerCase().includes('rindi');

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isRindiHR ? 'bg-sky-50/30 dark:bg-sky-950/20 font-medium' : ''
                      }`}
                    >
                      {/* Fixed Left Column: Nama Karyawan & Role */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-[#111c27] px-4 py-2.5 text-left border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {emp.fullName || emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{emp.division?.name || 'Klinik Orella'}</span>
                          {isRindiHR && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-[9px]">
                              HR
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total OFF Counter */}
                      <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOverQuota
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                              : offCount === 4
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                          title={`Total libur bulan ini: ${offCount} hari (Batas maks: 4)`}
                        >
                          {offCount}/4
                        </span>
                      </td>

                      {/* 31 Hari Jadwal Sel */}
                      {daysArray.map((day) => {
                        const shift = matrix[emp.id]?.[day] || 'P';
                        const info = getDayInfo(day);
                        const cellBg = info.isSunday
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : info.isFriSat
                          ? 'bg-sky-50/30 dark:bg-sky-950/15'
                          : '';

                        return (
                          <td
                            key={`cell-${emp.id}-${day}`}
                            className={`p-1 border-r border-slate-200/80 dark:border-slate-800/80 ${cellBg}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(emp.id, day)}
                              className={`w-full py-1.5 px-1 rounded text-[11px] transition-all transform active:scale-95 cursor-pointer ${getShiftBadge(
                                shift
                              )}`}
                              title={`Klik untuk ubah shift: ${emp.fullName || emp.name} - Tgl ${day} (${info.name}) -> Saat ini: ${shift}`}
                            >
                              {shift}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer tips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-sky-500 shrink-0" />
          <span>
            <strong>Tips:</strong> Klik pada kotak shift untuk beralih antara <strong>P (Pagi)</strong>, <strong>S (Siang)</strong>, <strong>LONG (Full)</strong>, atau <strong>OFF (Libur)</strong> secara instan.
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Total Terdaftar: {employees.length} staf klinik
        </div>
      </div>
    </div>
  );
}
