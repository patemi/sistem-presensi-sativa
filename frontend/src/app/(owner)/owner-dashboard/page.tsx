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
  BarChart3, Calendar, Clock, AlertTriangle, 
  RefreshCw, TrendingUp, Sparkles, LogOut, Lock, 
  ArrowRightLeft, Droplets
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function OwnerDashboardPage() {
  return (
    <AuthGuard allowedRoles={['owner']}>
      <OwnerDashboardContent />
    </AuthGuard>
  );
}

function OwnerDashboardContent() {
  const { user, logout } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [attRes, corrRes, alertRes, trendRes] = await Promise.all([
        api.get('/analytics/attendance-today'),
        api.get('/analytics/correlation'),
        api.get('/analytics/alerts'),
        api.get('/analytics/division-sentiment')
      ]);

      setAttendanceData(attRes.data);
      setCorrelationData(corrRes.data);
      setAlerts(alertRes.data);
      setSentimentTrends(trendRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return '-';
    if (score <= -0.4) return 'Kecewa/Lelah';
    if (score >= 0.4) return 'Sangat Baik';
    return 'Netral/Cukup';
  };

  const getSentimentColor = (score: number | null) => {
    if (score === null) return 'text-slate-500 bg-slate-100 dark:bg-gray-100/10 border-slate-300 dark:border-gray-500/20';
    if (score <= -0.4) return 'text-rose-700 dark:text-red-400 bg-rose-50 dark:bg-red-900/30 border-rose-200 dark:border-red-500/30';
    if (score >= 0.4) return 'text-emerald-700 dark:text-green-400 bg-emerald-50 dark:bg-green-900/30 border-emerald-200 dark:border-green-500/30';
    return 'text-amber-700 dark:text-yellow-400 bg-amber-50 dark:bg-yellow-900/30 border-amber-200 dark:border-yellow-500/30';
  };

  const getChartData = () => {
    if (!sentimentTrends || sentimentTrends.length === 0) return [];
    const trend = sentimentTrends[0]; // Just showing the first division's trend as an example
    if (trend.isRestricted || !trend.trends || trend.trends.length === 0) {
      return [];
    }

    return trend.trends.map((t: any) => {
      const date = new Date(t.periodEnd).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
      return {
        name: date,
        Sentimen: Number(t.avgSentimentScore),
      };
    });
  };

  const chartData = getChartData();

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-sky-500/5 dark:bg-[rgba(160,212,228,0.1)] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 dark:bg-[rgba(31,62,83,0.4)] rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="w-full bg-white dark:bg-[#102636] border-b border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl z-30 sticky top-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-white/10 border border-sky-200 dark:border-white/10 flex items-center justify-center shadow-sm">
              <Droplets className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-widest text-slate-900 dark:text-white uppercase block leading-none">
                {t('common.app_name')}
              </span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-yellow-400 tracking-widest uppercase block mt-1.5">
                Executive Owner Panel
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden lg:block text-right mr-2 border-r border-slate-200 dark:border-white/10 pr-4">
                <p className="text-xs font-bold text-slate-800 dark:text-white">{user.fullName}</p>
                <p className="text-[9px] font-bold text-amber-600 dark:text-yellow-400 uppercase tracking-wider">
                  {t('common.role_owner')}
                </p>
              </div>
            )}
            
            <ThemeToggle />
            <SwitchLanguage />

            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-red-900/30 border border-rose-200 dark:border-red-500/30 text-rose-600 dark:text-red-400 hover:bg-rose-100 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm"
              title={t('common.logout')}
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Panel */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 z-10 flex-1 space-y-6">
        {/* Title and Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white heading-display">
              EXECUTIVE DASHBOARD
            </h1>
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs mt-2 leading-relaxed max-w-2xl">
              Ringkasan performa dan iklim psikologis organisasi (Read-only).
            </p>
          </div>

          {/* Quick Info Box */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">Mode Eksekutif</p>
              <p className="text-[9px] text-slate-500 dark:text-[#a0d4e4]">
                Akses khusus pemantauan ringkasan
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-xl border border-amber-300 dark:border-yellow-500/30 text-amber-700 dark:text-yellow-300 text-xs font-bold shadow-sm flex items-center gap-1.5 uppercase tracking-widest bg-amber-50 dark:bg-yellow-900/10">
              <BarChart3 className="h-4 w-4" />
              Read Only
            </div>
          </div>
        </div>

        {loading ? (
          /* LOADING SKELETON */
          <div className="h-96 flex flex-col items-center justify-center bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
            <div className="h-10 w-10 border-4 border-slate-200 dark:border-white/20 border-t-sky-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs font-semibold uppercase tracking-wider animate-pulse">
              Memuat ringkasan organisasi...
            </p>
          </div>
        ) : (
          <>
            {/* 3 TOP CARDS INDEX */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Attendance Rate */}
              <div className="bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 text-slate-100 dark:text-white/10 transform group-hover:scale-110 transition-transform duration-500">
                  <Calendar className="h-20 w-20" />
                </div>
                <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold uppercase tracking-wider">
                  {t('hr.attendance_rate')}
                </p>
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-2 heading-display">
                  {attendanceData?.summary.attendanceRate}%
                </h3>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10">
                    Total: {attendanceData?.summary.presentCount + attendanceData?.summary.absentCount} Karyawan
                  </span>
                </div>
              </div>

              {/* Card 2: Late Rate */}
              <div className="bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 text-slate-100 dark:text-white/10 transform group-hover:scale-110 transition-transform duration-500">
                  <Clock className="h-20 w-20" />
                </div>
                <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold uppercase tracking-wider">
                  {t('hr.late_rate')}
                </p>
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-2 heading-display">
                  {attendanceData?.summary.lateRate}%
                </h3>
                <p className="text-slate-600 dark:text-white/80 text-[10px] font-medium mt-4 bg-slate-100 dark:bg-white/5 inline-block px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                  Tingkat Keterlambatan Harian
                </p>
              </div>

              {/* Card 3: Active Alerts (AI) */}
              <div className="bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 text-slate-100 dark:text-white/10 transform group-hover:scale-110 transition-transform duration-500">
                  <AlertTriangle className="h-20 w-20" />
                </div>
                <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold uppercase tracking-wider">
                  Alerts Organisasi
                </p>
                <h3 className={`text-4xl font-extrabold mt-2 heading-display ${alerts.length > 0 ? 'text-amber-600 dark:text-yellow-400' : 'text-slate-900 dark:text-white'}`}>
                  {alerts.length}
                </h3>
                <div className="flex items-center mt-4">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                    alerts.length > 0 ? 'bg-amber-50 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300 border-amber-200 dark:border-yellow-500/30' : 'bg-emerald-50 dark:bg-green-900/30 text-emerald-700 dark:text-green-300 border-emerald-200 dark:border-green-500/30'
                  }`}>
                    {alerts.length > 0 ? 'Perlu Pemantauan' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            {/* PSYCHOLOGICAL CLIMATE DETAILS (AI DUAL-PATH) */}
            <div className="space-y-6 animate-fade-in pt-4">
              {/* Core Correlation Evaluation Center Table */}
              <div className="bg-white dark:bg-[#102636]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-wider">
                      <ArrowRightLeft className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
                      Ringkasan Kinerja & Iklim Divisi
                    </h3>
                    <p className="text-slate-500 dark:text-[#a0d4e4] text-xs mt-1.5">
                      Tabel analisis korelasi sentimen dan absensi per divisi.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#a0d4e4] uppercase font-bold tracking-widest text-[10px]">
                        <th className="pb-4 pr-4">{t('hr.col_team')}</th>
                        <th className="pb-4 px-4">{t('hr.col_attendance')}</th>
                        <th className="pb-4 px-4">{t('hr.col_late')}</th>
                        <th className="pb-4 px-4">{t('hr.col_sentiment')}</th>
                        <th className="pb-4 px-4">{t('hr.col_themes')}</th>
                        <th className="pb-4 pl-4">{t('hr.col_status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {correlationData.map((row: any) => (
                        <tr key={row.divisionId} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                          <td className="py-5 pr-4">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{row.divisionName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-[#a0d4e4] mt-1">{row.employeeCount} Karyawan</p>
                          </td>
                          <td className="py-5 px-4 text-slate-900 dark:text-white font-mono font-semibold">{row.monthlyAttendanceRate}%</td>
                          <td className="py-5 px-4 text-slate-600 dark:text-white/80 font-mono">{row.tardinessRate}%</td>
                          
                          {/* Privacy Guard Column Enforcement */}
                          {row.isRestricted ? (
                            <td colSpan={2} className="py-5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-white/60 shadow-sm uppercase tracking-wider">
                                <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-white/40 shrink-0" />
                                {t('hr.insufficient_data')}
                              </span>
                            </td>
                          ) : (
                            <>
                              <td className="py-5 px-4 font-semibold font-mono">
                                <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border shadow-sm flex flex-col items-center justify-center gap-1 w-max ${getSentimentColor(row.avgSentimentScore)}`}>
                                  <span className="text-sm">{row.avgSentimentScore.toFixed(2)}</span>
                                  <span className="uppercase tracking-wider text-[8px] opacity-80">{getSentimentLabel(row.avgSentimentScore)}</span>
                                </span>
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                  {row.dominantThemes.map((theme: string) => (
                                    <span key={theme} className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/90 font-bold text-[9px] uppercase tracking-wider border border-slate-200 dark:border-white/10 shadow-sm">
                                      {theme}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </>
                          )}

                          <td className="py-5 pl-4 text-slate-700 dark:text-white/80 font-medium leading-relaxed text-[11px] max-w-xs">
                            {row.isRestricted ? (
                              <p className="text-slate-400 dark:text-white/40 italic text-[10px] bg-slate-50 dark:bg-white/[0.02] p-2 rounded-lg border border-slate-200 dark:border-white/5">{row.recommendation}</p>
                            ) : (
                              <p className={`p-2.5 rounded-xl border ${
                                row.status === 'burnout' 
                                  ? 'bg-amber-50 dark:bg-yellow-900/20 border-amber-200 dark:border-yellow-500/20 text-amber-800 dark:text-yellow-200 font-bold' 
                                  : row.status === 'excellent' 
                                    ? 'bg-emerald-50 dark:bg-green-900/20 border-emerald-200 dark:border-green-500/20 text-emerald-800 dark:text-green-200' 
                                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/80'
                              }`}>
                                {row.recommendation}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-white/10 py-6 text-center z-10 bg-white/60 dark:bg-transparent mt-12">
        <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold tracking-widest uppercase">
          &copy; SATIVA &bull; Executive Portal
        </p>
      </footer>
    </div>
  );
}
