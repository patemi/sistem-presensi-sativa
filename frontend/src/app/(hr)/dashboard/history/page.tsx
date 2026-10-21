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
import Link from 'next/link';
import { 
  Calendar, Clock, Search, RefreshCw, LogOut, 
  Droplets, Building, FileSpreadsheet, ArrowLeft,
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  TrendingUp, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function HrHistoryPage() {
  return (
    <AuthGuard allowedRoles={['hr']}>
      <HrHistoryContent />
    </AuthGuard>
  );
}

function HrHistoryContent() {
  const { user, logout } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'attendance' | 'psychological'>('attendance');
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');

  // Divisions list state
  const [divisionsList, setDivisionsList] = useState<{ id: string; name: string }[]>([]);

  const fetchHistoryData = async (division = selectedDivision, period = selectedPeriod) => {
    setLoading(true);
    try {
      const params = {
        divisionId: division,
        period: period,
      };

      const [attRes, corrRes, trendRes] = await Promise.all([
        api.get('/analytics/attendance-today', { params }),
        api.get('/analytics/correlation', { params }),
        api.get('/analytics/division-sentiment', { params })
      ]);

      setAttendanceData(attRes.data);
      setCorrelationData(corrRes.data);
      setSentimentTrends(trendRes.data);
    } catch (err) {
      console.error('Failed to load history data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/auth/divisions');
      setDivisionsList(res.data);
    } catch (err) {
      console.error('Failed to load divisions', err);
    }
  };

  useEffect(() => {
    fetchHistoryData(selectedDivision, selectedPeriod);
  }, [selectedDivision, selectedPeriod]);

  useEffect(() => {
    fetchDivisions();
  }, []);

  // Filter present & absent lists based on search term
  const filteredPresentList = attendanceData?.presentList.filter((item: any) =>
    item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.divisionName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAbsentList = attendanceData?.absentList.filter((item: any) =>
    item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.divisionName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Worksheet: Log Presensi
      const attendanceRows = filteredPresentList.map((item: any) => ({
        'Nama Karyawan': item.fullName,
        'Divisi': item.divisionName,
        'Waktu Check-in': new Date(item.checkInTime).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
        'Waktu Check-out': item.checkOutTime ? new Date(item.checkOutTime).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US') : 'Belum Check-out',
        'Keterlambatan (menit)': item.lateMinutes,
        'Status Presensi': item.attendanceStatus === 'hadir' ? 'Hadir Sah' : 'Belum Lengkap',
        'Lokasi Kantor': item.officeLabel,
        'Jarak GPS (m)': Math.round(item.distanceMeters),
      }));

      const wsAttendance = XLSX.utils.json_to_sheet(attendanceRows.length > 0 ? attendanceRows : [{ Message: 'Tidak ada data presensi pada periode ini' }]);
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Log Presensi');

      // 2. Worksheet: Analisis Psikologis Divisi
      const wellbeingRows = correlationData.map((item: any) => ({
        'Nama Divisi': item.divisionName,
        'Jumlah Karyawan': item.employeeCount,
        'Tingkat Kehadiran Bulanan (%)': item.monthlyAttendanceRate,
        'Tingkat Keterlambatan (%)': item.tardinessRate,
        'Rata-rata Skor Mood': item.isRestricted ? '🔒 Anonim (<5)' : item.avgMoodScore ?? '-',
        'Tema Utama Jurnal': item.isRestricted ? 'Restricted' : (Array.isArray(item.dominantThemes) ? item.dominantThemes.join(', ') : '-'),
        'Tingkat Risiko': item.riskLevel,
        'Rekomendasi Sistem': item.recommendation,
      }));

      const wsWellbeing = XLSX.utils.json_to_sheet(wellbeingRows.length > 0 ? wellbeingRows : [{ Message: 'Tidak ada data divisi' }]);
      XLSX.utils.book_append_sheet(wb, wsWellbeing, 'Analisis Psikologis Divisi');

      // Generate filename
      const todayDate = new Date().toISOString().slice(0, 10);
      const filename = `Laporan_SATIVA_${selectedPeriod}_${todayDate}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Failed to export excel file', err);
      alert('Gagal mengekspor laporan ke Excel');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[rgba(160,212,228,0.1)] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[rgba(31,62,83,0.4)] rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="w-full bg-white dark:bg-[#102636] border-b border-slate-200 dark:border-white/10 shadow-sm md:shadow-2xl z-30 sticky top-0 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center hover:scale-105 transition-transform"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
            </Link>
            <div>
              <span className="font-extrabold text-lg tracking-widest text-slate-900 dark:text-white uppercase block leading-none drop-shadow-md">
                {t('common.app_name')}
              </span>
              <span className="text-[9px] font-bold text-sky-600 dark:text-[#a0d4e4] tracking-widest uppercase block mt-1.5 opacity-80">
                Log Riwayat & Ekspor
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-[#a0d4e4]/30 text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider"
            >
              <Calendar className="h-4 w-4 text-sky-600 dark:text-[#a0d4e4]" />
              {t('hr.nav_today')}
            </Link>
            
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

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 z-10 flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white heading-display drop-shadow-md">
              {t('hr.history_title')}
            </h1>
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs mt-2 leading-relaxed max-w-2xl opacity-80">
              {t('hr.history_subtitle')}
            </p>
          </div>

          {/* Excel Export Button */}
          <button
            onClick={exportToExcel}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-105 border border-emerald-400/30 uppercase tracking-widest shrink-0"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-200" />
            <span>{t('hr.export_excel')}</span>
          </button>
        </div>

        {/* Global Filters Panel */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm backdrop-blur-md">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-sky-600 dark:text-[#a0d4e4] opacity-60" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama karyawan atau divisi..."
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-slate-400 dark:placeholder-white/30"
            />
          </div>

          {/* Select Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Filter Divisi */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-slate-600 dark:text-[#a0d4e4] uppercase tracking-wider shrink-0">{t('hr.filter_division')}:</span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">{t('hr.all_divisions')}</option>
                {divisionsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Periode Waktu */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-slate-600 dark:text-[#a0d4e4] uppercase tracking-wider shrink-0">{t('hr.filter_period')}:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="today">{t('hr.period_today')}</option>
                <option value="month">{t('hr.period_month')}</option>
                <option value="year">{t('hr.period_year')}</option>
                <option value="all">{t('hr.period_all')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-2 text-sm font-extrabold tracking-wider transition-all duration-300 relative uppercase ${
              activeTab === 'attendance'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-[#a0d4e4]/50 hover:text-slate-700 dark:hover:text-[#a0d4e4]'
            }`}
          >
            {t('hr.tab_attendance')}
            {activeTab === 'attendance' && (
              <span className="absolute bottom-[-17px] left-0 w-full h-1 bg-sky-500 dark:bg-[#a0d4e4] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('psychological')}
            className={`pb-2 text-sm font-extrabold tracking-wider transition-all duration-300 relative uppercase ${
              activeTab === 'psychological'
                ? 'text-sky-600 dark:text-[#a0d4e4]'
                : 'text-slate-400 dark:text-white/50 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            {t('hr.tab_analytics')}
            {activeTab === 'psychological' && (
              <span className="absolute bottom-[-17px] left-0 w-full h-1 bg-sky-500 dark:bg-[#a0d4e4] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
            )}
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center glass-card rounded-3xl shadow-sm md:shadow-xl">
            <div className="h-10 w-10 border-4 border-slate-300 dark:border-white/20 border-t-sky-500 dark:border-t-white rounded-full animate-spin mb-4" />
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs font-semibold uppercase tracking-wider animate-pulse">
              Memuat log riwayat...
            </p>
          </div>
        ) : activeTab === 'attendance' ? (
          /* TAB 1: LOG RIWAYAT PRESENSI */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm md:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between tracking-wider">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-green-400" />
                  Rekap Log Presensi <span className="text-sky-700 dark:text-[#a0d4e4] bg-sky-50 dark:bg-[rgba(255,255,255,0.05)] px-2.5 py-0.5 rounded-md">{filteredPresentList.length} Entri</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#a0d4e4] font-bold uppercase tracking-wider">
                  Periode: {selectedPeriod.toUpperCase()}
                </span>
              </h3>

              {filteredPresentList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-white/50 text-xs font-medium">
                  Tidak ada log presensi pada filter ini.
                </div>
              ) : (
                <div>
                  {/* Tampilan Mobile: Kartu Log Presensi Tanpa Perlu Digeser */}
                  <div className="md:hidden space-y-3">
                    {filteredPresentList.map((item: any, idx: number) => (
                      <div
                        key={`m-hist-${idx}`}
                        className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {item.fullName}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-[#a0d4e4] font-medium">
                              {item.divisionName}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                            item.attendanceStatus === 'hadir'
                              ? 'bg-emerald-50 dark:bg-green-900/30 text-emerald-700 dark:text-green-300 border-emerald-200 dark:border-green-500/30'
                              : 'bg-amber-50 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300 border-amber-200 dark:border-yellow-500/30'
                          }`}>
                            {item.attendanceStatus === 'hadir' ? 'Hadir Sah' : 'Belum Lengkap'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Check-in</span>
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white">
                              <span>{new Date(item.checkInTime).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              {item.lateMinutes > 0 && (
                                <span className="text-[10px] text-amber-700 dark:text-yellow-400 font-bold px-1 py-0.2 rounded bg-amber-50 dark:bg-yellow-900/30">
                                  +{item.lateMinutes}m
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Check-out</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">
                              {item.checkOutTime
                                ? new Date(item.checkOutTime).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Lokasi Kantor</span>
                            <span className="text-slate-700 dark:text-white/80 font-medium truncate block">{item.officeLabel}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Jarak GPS</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{Math.round(item.distanceMeters)}m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tampilan Desktop: Tabel Lengkap */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#a0d4e4] uppercase text-[9px] tracking-wider font-bold">
                          <th className="pb-3 pr-4">Nama Karyawan</th>
                          <th className="pb-3 px-4">Divisi</th>
                          <th className="pb-3 px-4">Jam Check-in</th>
                          <th className="pb-3 px-4">Jam Check-out</th>
                          <th className="pb-3 px-4">Lokasi Kantor</th>
                          <th className="pb-3 px-4">Jarak GPS</th>
                          <th className="pb-3 pl-4">Status Presensi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredPresentList.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-white">{item.fullName}</td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-[#a0d4e4] font-medium">{item.divisionName}</td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-white/80 font-mono">
                              {new Date(item.checkInTime).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              {item.lateMinutes > 0 && (
                                <span className="ml-2 text-[10px] text-amber-700 dark:text-yellow-400 font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-yellow-900/30">
                                  +{item.lateMinutes}m
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-white/80 font-mono">
                              {item.checkOutTime
                                ? new Date(item.checkOutTime).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-white/70">{item.officeLabel}</td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-white/70 font-mono">{Math.round(item.distanceMeters)}m</td>
                            <td className="py-3.5 pl-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                item.attendanceStatus === 'hadir'
                                  ? 'bg-emerald-50 dark:bg-green-900/30 text-emerald-700 dark:text-green-300 border-emerald-200 dark:border-green-500/30'
                                  : 'bg-amber-50 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300 border-amber-200 dark:border-yellow-500/30'
                              }`}>
                                {item.attendanceStatus === 'hadir' ? 'Hadir Sah' : 'Belum Lengkap'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: ANALISIS PSIKOLOGIS DIVISI */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm md:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 tracking-wider">
                Rekap Analisis Iklim Psikologis & Korelasi Divisi
              </h3>

              {/* Tampilan Mobile: Kartu Analisis Psikologis Divisi Tanpa Geser */}
              <div className="md:hidden space-y-3">
                {correlationData.map((item: any) => (
                  <div
                    key={`m-div-corr-${item.divisionId}`}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.divisionName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-[#a0d4e4]">
                          {item.employeeCount} Anggota
                        </p>
                      </div>
                      <div>
                        {item.isRestricted ? (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/30">
                            🔒 Anonim (&lt;5 org)
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                            Mood: {item.avgMoodScore ? item.avgMoodScore.toFixed(2) : '-'} / 5.0
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Kehadiran Bulanan</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{item.monthlyAttendanceRate}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Keterlambatan</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-yellow-400">{item.tardinessRate}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Tema Utama Jurnal</p>
                      {item.isRestricted ? (
                        <span className="text-slate-400 dark:text-white/40 italic text-xs">Terlindungi</span>
                      ) : Array.isArray(item.dominantThemes) && item.dominantThemes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.dominantThemes.map((t: string, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-sky-700 dark:text-[#a0d4e4] font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-white/40 italic text-xs">Belum ada data</span>
                      )}
                    </div>

                    {item.recommendation && (
                      <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Rekomendasi Sistem</p>
                        <p className="text-slate-700 dark:text-white/90 text-xs leading-relaxed">
                          {item.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tampilan Desktop: Tabel Lengkap */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#a0d4e4] uppercase text-[9px] tracking-wider font-bold">
                      <th className="pb-3 pr-4">Divisi</th>
                      <th className="pb-3 px-4">Anggota</th>
                      <th className="pb-3 px-4">Kehadiran Bulanan</th>
                      <th className="pb-3 px-4">Keterlambatan</th>
                      <th className="pb-3 px-4">Skor Mood Rata-rata</th>
                      <th className="pb-3 px-4">Tema Utama Jurnal</th>
                      <th className="pb-3 pl-4">Rekomendasi Sistem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {correlationData.map((item: any) => (
                      <tr key={item.divisionId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 pr-4 font-bold text-slate-900 dark:text-white">{item.divisionName}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-white/80">{item.employeeCount} org</td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{item.monthlyAttendanceRate}%</td>
                        <td className="py-4 px-4 text-amber-600 dark:text-yellow-400 font-medium">{item.tardinessRate}%</td>
                        <td className="py-4 px-4">
                          {item.isRestricted ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/30">
                              🔒 Anonim (&lt;5 org)
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {item.avgMoodScore ? item.avgMoodScore.toFixed(2) : '-'} / 5.0
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-white/80">
                          {item.isRestricted ? (
                            <span className="text-slate-400 dark:text-white/40 italic">Terlindungi</span>
                          ) : Array.isArray(item.dominantThemes) && item.dominantThemes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.dominantThemes.map((t: string, i: number) => (
                                <span key={i} className="text-[9px] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-sky-700 dark:text-[#a0d4e4]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-white/40 italic">Belum ada data</span>
                          )}
                        </td>
                        <td className="py-4 pl-4 text-slate-700 dark:text-white/90 text-[11px] leading-relaxed max-w-xs">
                          {item.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-4 text-center z-10 glass-panel bg-transparent mt-8">
        <p className="text-[#a0d4e4] text-[10px] font-bold tracking-widest uppercase opacity-60">
          &copy; {new Date().getFullYear()} {t('common.app_name')} v4 &bull; {t('landing.footer_text')}
        </p>
      </footer>

      <ScrollToTop />
    </div>
  );
}
