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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  BarChart3, Calendar, Clock, AlertTriangle, 
  CheckCircle2, XCircle, Search, HelpCircle, 
  RefreshCw, TrendingUp, Sparkles, LogOut, Lock, 
  ShieldCheck, ArrowRightLeft, Smile, AlertCircle,
  Droplets, User, UserPlus, FolderPlus, Mail, Send,
  Eye, EyeOff, X, Check, Building, Briefcase, FileSpreadsheet,
  LayoutDashboard, Settings, ChevronRight, Users, Shield, Menu,
  Copy
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function HrDashboardPage() {
  return (
    <AuthGuard allowedRoles={['hr']}>
      <HrDashboardContent />
    </AuthGuard>
  );
}

function HrDashboardContent() {
  const { user, logout, updateUser } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Sidebar navigation state
  const [sidebarNav, setSidebarNav] = useState<'overview' | 'attendance' | 'psychological' | 'management'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [cronTriggering, setCronTriggering] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Profile Form state
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePass, setShowProfilePass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Admin Form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Division Form state
  const [divisionNameInput, setDivisionNameInput] = useState('');
  const [divisionLoading, setDivisionLoading] = useState(false);
  const [divisionMsg, setDivisionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite Employee Form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDivisionId, setInviteDivisionId] = useState('');
  const [sendEmailNowCheckbox, setSendEmailNowCheckbox] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state (Division)
  const [selectedDivision, setSelectedDivision] = useState<string>('all');

  // Divisions list state
  const [divisionsList, setDivisionsList] = useState<{ id: string; name: string }[]>([]);

  // Employee Directory & Tracking State
  const [employeesData, setEmployeesData] = useState<{
    stats: { total: number; joined: number; sent: number; pending: number };
    employees: any[];
  }>({
    stats: { total: 0, joined: 0, sent: 0, pending: 0 },
    employees: [],
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'joined' | 'sent' | 'pending'>('all');
  const [employeeDivisionFilter, setEmployeeDivisionFilter] = useState<string>('all');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [resendSuccessAlert, setResendSuccessAlert] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await api.get('/auth/employees');
      setEmployeesData(res.data);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleResendInvite = async (employeeId: string, employeeName: string) => {
    setResendingId(employeeId);
    setResendSuccessAlert(null);
    try {
      const res = await api.post(`/auth/resend-invite/${employeeId}`);
      const newCode = res.data?.newInviteCode;
      setResendSuccessAlert(
        res.data?.message || 
        `Undangan baru dengan kode ${newCode || ''} berhasil dikirimkan ke email ${employeeName}!`
      );
      await fetchEmployees();
      setTimeout(() => setResendSuccessAlert(null), 8000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim undangan');
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const fetchDashboardData = async (division = selectedDivision) => {
    setLoading(true);
    try {
      const params = {
        divisionId: division,
        period: 'today',
      };

      const [attRes, corrRes, alertRes, trendRes] = await Promise.all([
        api.get('/analytics/attendance-today', { params }),
        api.get('/analytics/correlation', { params }),
        api.get('/analytics/alerts'),
        api.get('/analytics/division-sentiment', { params })
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

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/auth/divisions');
      setDivisionsList(res.data);
      if (res.data.length > 0 && !inviteDivisionId) {
        setInviteDivisionId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load divisions', err);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedDivision);
  }, [selectedDivision]);

  useEffect(() => {
    fetchDivisions();
    fetchEmployees();
  }, []);

  const handleTriggerCron = async () => {
    setCronTriggering(true);
    setCronResult(null);
    try {
      const res = await api.post('/analytics/trigger-cron');
      setCronResult(res.data);
      await fetchDashboardData();
    } catch (err: any) {
      alert('Gagal menjalankan agregasi: ' + (err.response?.data?.message || err.message));
    } finally {
      setCronTriggering(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await api.patch('/auth/profile', {
        fullName: profileName,
        email: profileEmail,
        password: profilePassword || undefined,
      });
      updateUser({ fullName: res.data.fullName, email: res.data.email });
      setProfileMsg({ type: 'success', text: 'Profil HR berhasil diperbarui!' });
      setProfilePassword('');
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Gagal memperbarui profil' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminMsg(null);
    try {
      await api.post('/auth/add-admin', {
        fullName: adminName,
        email: adminEmail,
        password: adminPassword,
      });
      setAdminMsg({ type: 'success', text: `Admin HR baru (${adminEmail}) berhasil ditambahkan!` });
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.response?.data?.message || 'Gagal menambahkan admin' });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divisionNameInput.trim()) return;
    setDivisionLoading(true);
    setDivisionMsg(null);
    try {
      const res = await api.post('/auth/divisions', {
        name: divisionNameInput,
      });
      setDivisionMsg({ type: 'success', text: `Divisi "${res.data.name}" berhasil dibuat!` });
      setDivisionNameInput('');
      await fetchDivisions();
      await fetchDashboardData();
    } catch (err: any) {
      setDivisionMsg({ type: 'error', text: err.response?.data?.message || 'Gagal membuat divisi' });
    } finally {
      setDivisionLoading(false);
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteDivisionId) {
      setInviteMsg({ type: 'error', text: 'Pilih divisi terlebih dahulu' });
      return;
    }
    setInviteLoading(true);
    setInviteMsg(null);
    setInviteResult(null);
    try {
      const res = await api.post('/auth/invite-employee', {
        fullName: inviteName,
        email: inviteEmail,
        divisionId: inviteDivisionId,
        sendEmailNow: sendEmailNowCheckbox,
      });
      setInviteResult(res.data);
      setInviteMsg({
        type: 'success',
        text: sendEmailNowCheckbox
          ? `Undangan & kode unik berhasil dikirimkan ke email ${inviteEmail}!`
          : `Karyawan berhasil didaftarkan dengan kode unik unik (Email status: Belum Dikirim).`,
      });
      await fetchEmployees();
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.response?.data?.message || 'Gagal mendaftarkan karyawan' });
    } finally {
      setInviteLoading(false);
    }
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return '-';
    if (score <= -0.4) return 'Kecewa/Lelah';
    if (score >= 0.4) return 'Sangat Baik';
    return 'Netral/Cukup';
  };

  const getSentimentBadgeClass = (score: number | null) => {
    if (score === null) return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700';
    if (score <= -0.4) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/60';
    if (score >= 0.4) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60';
    return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60';
  };

  const filteredPresentList = attendanceData?.presentList.filter((item: any) =>
    item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.divisionName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAbsentList = attendanceData?.absentList.filter((item: any) =>
    item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.divisionName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredEmployeesList = (employeesData?.employees || []).filter((emp: any) => {
    const matchesStatus = employeeStatusFilter === 'all' || emp.inviteStatus === employeeStatusFilter;
    const matchesDivision = employeeDivisionFilter === 'all' || emp.divisionId === employeeDivisionFilter;
    const query = employeeSearchTerm.toLowerCase().trim();
    const matchesSearch = !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.inviteCode?.toLowerCase().includes(query) ||
      emp.division?.name?.toLowerCase().includes(query);
    return matchesStatus && matchesDivision && matchesSearch;
  });

  const getChartData = () => {
    if (!sentimentTrends || sentimentTrends.length === 0) return [];
    const trend = sentimentTrends[0];
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* MOBILE NAVBAR */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0f1823] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500">
            <Droplets className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-white">SATIVA HR</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* CLEAN SAAS SIDEBAR */}
      <aside className={cn(
        "w-full md:w-64 bg-white dark:bg-[#0c141d] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between p-4 z-40 shrink-0 sticky top-0 md:h-screen transition-all duration-200 shadow-sm md:shadow-none",
        mobileMenuOpen ? "block" : "hidden md:flex"
      )}>
        <div>
          {/* Brand Header */}
          <div className="hidden md:flex items-center space-x-3 pb-5 border-b border-slate-200 dark:border-slate-800/80 mb-5 px-2">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 shadow-sm">
              <Droplets className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                SATIVA
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-1">
                Klinik Kecantikan &bull; HR Portal
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
            Menu Utama
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => { setSidebarNav('overview'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                sidebarNav === 'overview'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <BarChart3 className={cn("h-4 w-4 shrink-0", sidebarNav === 'overview' ? "text-sky-500" : "text-slate-400")} />
              <span>Overview Ringkasan</span>
            </button>

            <button
              onClick={() => { setSidebarNav('attendance'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                sidebarNav === 'attendance'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Calendar className={cn("h-4 w-4 shrink-0", sidebarNav === 'attendance' ? "text-sky-500" : "text-slate-400")} />
              <span>Absensi Kehadiran</span>
            </button>

            <button
              onClick={() => { setSidebarNav('psychological'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                sidebarNav === 'psychological'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Sparkles className={cn("h-4 w-4 shrink-0", sidebarNav === 'psychological' ? "text-sky-500" : "text-slate-400")} />
              <span>Psikologis & Sentimen</span>
            </button>

            <button
              onClick={() => { setSidebarNav('management'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                sidebarNav === 'management'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Building className={cn("h-4 w-4 shrink-0", sidebarNav === 'management' ? "text-sky-500" : "text-slate-400")} />
              <span>Manajemen Organisasi</span>
            </button>

            <Link
              href="/dashboard/history"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 transition-colors duration-150 mt-4"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Log Riwayat & Ekspor</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 mt-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800/60 flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-xs shrink-0">
              {user?.fullName?.substring(0, 2).toUpperCase() || 'HR'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  user?.email === 'rindimia79@gmail.com'
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/60'
                    : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/60'
                }`}>
                  {user?.email === 'rindimia79@gmail.com' ? 'Superadmin HR' : 'HR Admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <SwitchLanguage />
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white dark:bg-[#0e1622] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 transition-colors duration-200 shadow-sm md:shadow-none">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {sidebarNav === 'overview' && 'Overview Evaluasi Klinik'}
              {sidebarNav === 'attendance' && 'Absensi & Kehadiran Karyawan'}
              {sidebarNav === 'psychological' && 'Iklim Psikologis & Sentimen Tim'}
              {sidebarNav === 'management' && 'Pusat Manajemen HR & Klinik'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {sidebarNav === 'overview' && 'Analisis korelasi absensi tim dan tren iklim mental kolektif real-time.'}
              {sidebarNav === 'attendance' && 'Log kehadiran harian karyawan terdaftar beserta status absensi.'}
              {sidebarNav === 'psychological' && 'Data tren kesehatan mental kolektif terenkripsi & anonim.'}
              {sidebarNav === 'management' && 'Kelola profil HR, tambah admin, tambah divisi, dan undang karyawan via email.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle />

            {/* Division Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
              <Building className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Divisi:</span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semua Divisi</option>
                {divisionsList.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Run Aggregator Button */}
            <button
              onClick={handleTriggerCron}
              disabled={cronTriggering}
              className="saas-button-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cronTriggering ? 'animate-spin' : ''}`} />
              <span>{cronTriggering ? 'Mengagregasikan...' : 'Run Aggregator'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Section Content */}
        <main className="p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* Cron Trigger Notification */}
          {cronResult && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-sky-500/30 text-slate-800 dark:text-white text-xs font-medium shadow-sm">
              <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-800 dark:text-sky-300">Agregasi Data Sentimen Tim Selesai</p>
                <p className="text-slate-600 dark:text-[#94a3b8] text-xs mt-1 leading-relaxed">
                  Proses selesai: {cronResult.processedTeams || cronResult.processedDivisions} divisi dianalisis, {cronResult.aggregatedTeams || cronResult.aggregatedDivisions} divisi teragregasi (&gt;= 5 responden), {cronResult.skippedTeams || cronResult.skippedDivisions} divisi dilewati (&lt; 5 responden).
                </p>
              </div>
            </div>
          )}

          {loading ? (
            /* Loading Skeleton */
            <div className="h-96 flex flex-col items-center justify-center saas-card">
              <div className="h-8 w-8 border-2 border-slate-300 dark:border-slate-700 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Memuat data analitik...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* SECTION 1: OVERVIEW */}
              {sidebarNav === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* KPI Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Attendance Rate Card */}
                    <div className="saas-card p-5 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hr.attendance_rate')}
                        </span>
                        <Calendar className="h-5 w-5 text-sky-500 dark:text-sky-400 opacity-80" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {attendanceData?.summary.attendanceRate}%
                      </div>
                      <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          {attendanceData?.summary.presentCount} {t('hr.present_today')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                          {attendanceData?.summary.absentCount} {t('hr.not_present_today')}
                        </span>
                      </div>
                    </div>

                    {/* Late Rate Card */}
                    <div className="saas-card p-5 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hr.late_rate')}
                        </span>
                        <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 opacity-80" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {attendanceData?.summary.lateRate}%
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-4 font-medium">
                        Terlambat masuk: <span className="text-amber-600 dark:text-amber-300 font-bold">{attendanceData?.summary.lateCount} orang</span>
                      </p>
                    </div>

                    {/* Burnout Risk Card */}
                    <div className="saas-card p-5 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hr.burnout_alert')}
                        </span>
                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 opacity-80" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {alerts.length}
                      </div>
                      <div className="mt-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          alerts.length > 0
                            ? 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                            : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}>
                          {alerts.length > 0 ? 'Perlu Intervensi HR' : 'Kondisi Optimal'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 2: ABSENSI KEHADIRAN */}
              {sidebarNav === 'attendance' && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Search Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari karyawan atau divisi..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-4 py-2 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Log Absensi Real-time</span>
                  </div>

                  {/* Table Present List */}
                  <div className="saas-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        {t('hr.present_today')}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredPresentList.length} orang
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                            <th className="pb-3 pr-4">Nama</th>
                            <th className="pb-3 px-4">Divisi</th>
                            <th className="pb-3 px-4">Jam Check-in</th>
                            <th className="pb-3 px-4">{t('hr.col_checkout')}</th>
                            <th className="pb-3 px-4">Jarak</th>
                            <th className="pb-3 pl-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                          {filteredPresentList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                                Tidak ada data karyawan hadir
                              </td>
                            </tr>
                          ) : (
                            filteredPresentList.map((row: any) => (
                              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{row.fullName}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.divisionName}</td>
                                <td className="py-3 px-4 font-mono">{row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className="py-3 px-4 font-mono">{row.checkoutTime ? new Date(row.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className="py-3 px-4 font-mono">{row.distanceMeters}m</td>
                                <td className="py-3 pl-4">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                    row.lateMinutes > 0
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                  }`}>
                                    {row.lateMinutes > 0 ? `Terlambat (${row.lateMinutes}m)` : 'Tepat Waktu'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table Absent List */}
                  <div className="saas-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                        {t('hr.not_present_today')}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredAbsentList.length} orang
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                            <th className="pb-3 pr-4">Nama</th>
                            <th className="pb-3 px-4">Divisi</th>
                            <th className="pb-3 pl-4">Status Absen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                          {filteredAbsentList.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                                Semua karyawan sudah absen hari ini
                              </td>
                            </tr>
                          ) : (
                            filteredAbsentList.map((row: any) => (
                              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{row.fullName}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.divisionName}</td>
                                <td className="py-3 pl-4">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                                    Belum Absen
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 3: PSIKOLOGIS & SENTIMEN TIM */}
              {sidebarNav === 'psychological' && (
                <motion.div
                  key="psychological"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Correlation Matrix Table */}
                  <div className="saas-card p-5">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('hr.correlation_title')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('hr.correlation_subtitle')}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                            <th className="pb-3 pr-4">{t('hr.col_team')}</th>
                            <th className="pb-3 px-4">{t('hr.col_attendance')}</th>
                            <th className="pb-3 px-4">{t('hr.col_late')}</th>
                            <th className="pb-3 px-4">{t('hr.col_sentiment')}</th>
                            <th className="pb-3 px-4">{t('hr.col_themes')}</th>
                            <th className="pb-3 pl-4">{t('hr.col_status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                          {correlationData.map((row: any) => (
                            <tr key={row.divisionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{row.divisionName}</td>
                              <td className="py-3 px-4 font-mono text-sky-600 dark:text-sky-400 font-semibold">{row.attendanceRate}%</td>
                              <td className="py-3 px-4 font-mono">{row.lateCount} kali</td>
                              <td className="py-3 px-4">
                                {row.isRestricted ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    <Lock className="h-3 w-3" />
                                    {t('hr.insufficient_data')}
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSentimentBadgeClass(row.avgSentimentScore)}`}>
                                    {row.avgSentimentScore} ({getSentimentLabel(row.avgSentimentScore)})
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {row.isRestricted ? (
                                  <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {row.dominantThemes.map((t: string, idx: number) => (
                                      <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pl-4">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  row.riskLevel === 'kritis'
                                    ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                                    : row.riskLevel === 'perlu_perhatian'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                }`}>
                                  {row.riskLevel}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Chart and Active Alerts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Trend Chart */}
                    <div className="lg:col-span-8 saas-card p-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                        Tren Kepuasan Psikologis Kolektif
                      </h3>

                      {chartData.length === 0 ? (
                        <div className="h-72 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                          <Lock className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-3" />
                          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium max-w-xs text-center leading-relaxed">
                            Grafik tidak tersedia karena data tim terenkripsi berada di bawah batas privasi minimum.
                          </p>
                        </div>
                      ) : (
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={chartData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" />
                              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                              <YAxis domain={[-1.0, 1.0]} stroke="#64748b" style={{ fontSize: '10px' }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                itemStyle={{ color: '#0284c7', fontWeight: 'bold' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                              <Area 
                                type="monotone" 
                                dataKey="Sentimen" 
                                stroke="#0284c7" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorSentiment)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Active Anomalies List */}
                    <div className="lg:col-span-4 saas-card p-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        {t('hr.active_alerts')} ({alerts.length})
                      </h3>

                      {alerts.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex flex-col items-center">
                          <Smile className="h-8 w-8 text-sky-500 dark:text-sky-400 mb-2 opacity-80" />
                          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                            {t('hr.no_alerts')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {alerts.map((alert: any) => (
                            <div key={alert.id} className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                  {alert.alertType}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(alert.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-900 dark:text-white text-xs">Divisi: {alert.divisionName}</p>
                              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mt-1">
                                {alert.suggestedAction}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 4: MANAJEMEN HR & ORGANISASI HUB */}
              {sidebarNav === 'management' && (
                <motion.div
                  key="management"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Management Card 1: Edit Profil HR */}
                    <div className="saas-card p-5 flex flex-col justify-between saas-card-interactive">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3">
                          <User className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profil Saya (HR Admin)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Perbarui data nama lengkap, alamat email aktif, dan kata sandi HR.
                        </p>

                        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <p className="text-slate-500 dark:text-slate-400">Nama: <span className="text-slate-900 dark:text-white font-semibold">{user?.fullName}</span></p>
                          <p className="text-slate-500 dark:text-slate-400">Email: <span className="text-slate-900 dark:text-white font-semibold">{user?.email}</span></p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setProfileName(user?.fullName || '');
                          setProfileEmail(user?.email || '');
                          setProfilePassword('');
                          setProfileMsg(null);
                          setShowProfileModal(true);
                        }}
                        className="w-full mt-5 py-2.5 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <User className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                        <span>Edit Profil HR</span>
                      </button>
                    </div>

                    {/* Management Card 2: Tambah Admin HR Baru */}
                    <div className="saas-card p-5 flex flex-col justify-between saas-card-interactive">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
                          <UserPlus className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Admin HR Baru</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Berikan hak akses administrator/HR kepada staf tambahan di organisasi Anda.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setAdminName('');
                          setAdminEmail('');
                          setAdminPassword('');
                          setAdminMsg(null);
                          setShowAddAdminModal(true);
                        }}
                        className="w-full mt-5 py-2.5 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <UserPlus className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        <span>Tambah Admin HR</span>
                      </button>
                    </div>

                    {/* Management Card 3: Tambah Divisi Baru */}
                    <div className="saas-card p-5 flex flex-col justify-between saas-card-interactive">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3">
                          <FolderPlus className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Divisi Organisasi ({divisionsList.length})</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Buat nama divisi baru secara dinamis untuk pengelompokan karyawan.
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {divisionsList.map((d) => (
                            <span key={d.id} className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300">
                              {d.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDivisionNameInput('');
                          setDivisionMsg(null);
                          setShowAddDivisionModal(true);
                        }}
                        className="w-full mt-5 py-2.5 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <FolderPlus className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                        <span>Tambah Divisi Baru</span>
                      </button>
                    </div>

                    {/* Management Card 4: Undang Karyawan via Email */}
                    <div className="saas-card p-5 flex flex-col justify-between saas-card-interactive">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                          <Mail className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Undang Karyawan Baru</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Kirimkan email undangan berisi Kode Pendaftaran Organisasi ke email aktif karyawan.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setInviteName('');
                          setInviteEmail('');
                          setInviteResult(null);
                          setInviteMsg(null);
                          setShowInviteModal(true);
                        }}
                        className="w-full mt-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Kirim Undangan Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Alert Berhasil Kirim Ulang */}
                  {resendSuccessAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium">{resendSuccessAlert}</span>
                      </div>
                      <button
                        onClick={() => setResendSuccessAlert(null)}
                        className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}

                  {/* Direktori Seluruh Karyawan & Pelacakan Status Undangan */}
                  <div className="saas-card p-6 space-y-6">
                    {/* Header Bagian */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              Data & Status Aktivasi Seluruh Karyawan
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                                {employeesData.stats.total} Orang
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Pantau kode undangan unik per staf dan status aktivasi (Belum Terkirim, Menunggu Login, atau Sudah Bergabung).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchEmployees()}
                          disabled={employeesLoading}
                          className="px-3 py-2 rounded-xl saas-button text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Muat ulang data karyawan"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", employeesLoading && "animate-spin text-indigo-500")} />
                          <span>Segarkan</span>
                        </button>
                        <button
                          onClick={() => {
                            setInviteName('');
                            setInviteEmail('');
                            setInviteResult(null);
                            setInviteMsg(null);
                            setShowInviteModal(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>+ Tambah Karyawan</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Kartu Metrik Status Karyawan */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Kartu 1: Total */}
                      <button
                        type="button"
                        onClick={() => setEmployeeStatusFilter('all')}
                        className={cn(
                          "p-3.5 rounded-2xl text-left transition-all border",
                          employeeStatusFilter === 'all'
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm"
                            : "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Total Karyawan</span>
                          <Users className="h-4 w-4 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {employeesData.stats.total}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Seluruh staf klinik</p>
                      </button>

                      {/* Kartu 2: Sudah Bergabung */}
                      <button
                        type="button"
                        onClick={() => setEmployeeStatusFilter('joined')}
                        className={cn(
                          "p-3.5 rounded-2xl text-left transition-all border",
                          employeeStatusFilter === 'joined'
                            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-sm"
                            : "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Sudah Bergabung
                          </span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          {employeesData.stats.joined}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sudah login ke sistem</p>
                      </button>

                      {/* Kartu 3: Menunggu Login */}
                      <button
                        type="button"
                        onClick={() => setEmployeeStatusFilter('sent')}
                        className={cn(
                          "p-3.5 rounded-2xl text-left transition-all border",
                          employeeStatusFilter === 'sent'
                            ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-sm"
                            : "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Menunggu Login
                          </span>
                          <Mail className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                          {employeesData.stats.sent}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Email terkirim, belum login</p>
                      </button>

                      {/* Kartu 4: Belum Dikirim */}
                      <button
                        type="button"
                        onClick={() => setEmployeeStatusFilter('pending')}
                        className={cn(
                          "p-3.5 rounded-2xl text-left transition-all border",
                          employeeStatusFilter === 'pending'
                            ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-sm"
                            : "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Belum Terkirim</span>
                          <Clock className="h-4 w-4 text-sky-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                          {employeesData.stats.pending}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Draft akun karyawan baru</p>
                      </button>
                    </div>

                    {/* Filter Bar & Pencarian */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                        <button
                          type="button"
                          onClick={() => setEmployeeStatusFilter('all')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                            employeeStatusFilter === 'all'
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          )}
                        >
                          Semua ({employeesData.stats.total})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmployeeStatusFilter('joined')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            employeeStatusFilter === 'joined'
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          Sudah Bergabung ({employeesData.stats.joined})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmployeeStatusFilter('sent')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            employeeStatusFilter === 'sent'
                              ? "bg-amber-600 text-white"
                              : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          Menunggu Login ({employeesData.stats.sent})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmployeeStatusFilter('pending')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            employeeStatusFilter === 'pending'
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-sky-400"></span>
                          Belum Terkirim ({employeesData.stats.pending})
                        </button>
                      </div>

                      {/* Divisi & Pencarian Input */}
                      <div className="flex items-center gap-2.5">
                        {/* Filter Divisi */}
                        <select
                          value={employeeDivisionFilter}
                          onChange={(e) => setEmployeeDivisionFilter(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 outline-none"
                        >
                          <option value="all">Semua Divisi</option>
                          {divisionsList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>

                        {/* Search Input */}
                        <div className="relative min-w-[200px] sm:min-w-[240px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={employeeSearchTerm}
                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                            placeholder="Cari nama, email, kode..."
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                          />
                          {employeeSearchTerm && (
                            <button
                              onClick={() => setEmployeeSearchTerm('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tabel Karyawan */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              <th className="py-3 px-4">Karyawan</th>
                              <th className="py-3 px-4">Divisi Klinik</th>
                              <th className="py-3 px-4">Kode Undangan Unik</th>
                              <th className="py-3 px-4">Status Undangan & Akun</th>
                              <th className="py-3 px-4">Waktu Terakhir</th>
                              <th className="py-3 px-4 text-center">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                            {employeesLoading ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-500">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                                    <p className="text-xs">Memuat data seluruh karyawan...</p>
                                  </div>
                                </td>
                              </tr>
                            ) : filteredEmployeesList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-500">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <Users className="h-8 w-8 text-slate-400 stroke-[1.5]" />
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada data karyawan yang cocok</p>
                                    <p className="text-xs text-slate-500">Coba ubah filter status atau kata kunci pencarian Anda.</p>
                                    {(employeeStatusFilter !== 'all' || employeeDivisionFilter !== 'all' || employeeSearchTerm) && (
                                      <button
                                        onClick={() => {
                                          setEmployeeStatusFilter('all');
                                          setEmployeeDivisionFilter('all');
                                          setEmployeeSearchTerm('');
                                        }}
                                        className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                      >
                                        Reset Semua Filter
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredEmployeesList.map((emp: any) => {
                                const isJoined = emp.inviteStatus === 'joined';
                                const isSent = emp.inviteStatus === 'sent';
                                const isPending = emp.inviteStatus === 'pending' || !emp.inviteStatus;

                                return (
                                  <tr
                                    key={emp.id}
                                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                                  >
                                    {/* Karyawan (Nama & Email) */}
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                          {emp.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                              {emp.fullName}
                                            </span>
                                            {emp.role === 'hr' && (
                                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                HR Admin
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                            {emp.email}
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Divisi */}
                                    <td className="py-3.5 px-4">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                        <Building className="h-3 w-3 text-slate-500" />
                                        <span>{emp.divisionName || emp.division?.name || 'Tanpa Divisi'}</span>
                                      </span>
                                    </td>

                                    {/* Kode Undangan Unik */}
                                    <td className="py-3.5 px-4">
                                      {emp.inviteCode ? (
                                        <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                                          <span className="font-mono text-xs font-bold text-indigo-700 dark:text-sky-300 px-1.5 tracking-wider">
                                            {emp.inviteCode}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(emp.inviteCode)}
                                            className="p-1 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
                                            title="Salin Kode Undangan Unik"
                                          >
                                            {copiedCode === emp.inviteCode ? (
                                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                              <Copy className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>

                                    {/* Status Undangan & Akun */}
                                    <td className="py-3.5 px-4">
                                      {isJoined && (
                                        <div className="space-y-0.5">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            Sudah Bergabung
                                          </span>
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-1">
                                            Sudah login ke sistem
                                          </p>
                                        </div>
                                      )}

                                      {isSent && (
                                        <div className="space-y-0.5">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                            </span>
                                            Menunggu Login
                                          </span>
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-1">
                                            Undangan email terkirim
                                          </p>
                                        </div>
                                      )}

                                      {isPending && (
                                        <div className="space-y-0.5">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                            <Clock className="h-3 w-3 text-slate-500" />
                                            Belum Terkirim
                                          </span>
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-1">
                                            Draft kode siap dikirim
                                          </p>
                                        </div>
                                      )}
                                    </td>

                                    {/* Waktu Terakhir */}
                                    <td className="py-3.5 px-4">
                                      {isJoined ? (
                                        <div>
                                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {emp.lastLoginAt ? formatDateTime(emp.lastLoginAt) : 'Belum tercatat'}
                                          </p>
                                          <p className="text-[10px] text-slate-500">Waktu login terakhir</p>
                                        </div>
                                      ) : isSent ? (
                                        <div>
                                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {emp.invitedAt ? formatDateTime(emp.invitedAt) : formatDateTime(emp.createdAt)}
                                          </p>
                                          <p className="text-[10px] text-slate-500">Undangan dikirim</p>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {formatDateTime(emp.createdAt)}
                                          </p>
                                          <p className="text-[10px] text-slate-500">Waktu dibuat</p>
                                        </div>
                                      )}
                                    </td>

                                    {/* Aksi Kirim / Kirim Ulang */}
                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        type="button"
                                        disabled={resendingId === emp.id}
                                        onClick={() => handleResendInvite(emp.id, emp.fullName)}
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all",
                                          isPending
                                            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                            : isSent
                                            ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                            : "saas-button text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                      >
                                        {resendingId === emp.id ? (
                                          <>
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            <span>Mengirim...</span>
                                          </>
                                        ) : isPending ? (
                                          <>
                                            <Send className="h-3 w-3" />
                                            <span>Kirim Undangan</span>
                                          </>
                                        ) : isSent ? (
                                          <>
                                            <RefreshCw className="h-3 w-3" />
                                            <span>Kirim Ulang</span>
                                          </>
                                        ) : (
                                          <>
                                            <Mail className="h-3 w-3" />
                                            <span>Kirim Ulang Kode</span>
                                          </>
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Info Direktori */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <span>
                          Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredEmployeesList.length}</strong> dari <strong className="text-slate-800 dark:text-slate-200">{employeesData.stats.total}</strong> karyawan terdaftar.
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Kode undangan unik digunakan karyawan sebagai sandi login awal.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-5 text-center text-slate-500 text-xs">
          &copy; SATIVA v4 &bull; Privacy Preserved &bull; HR Portal
        </footer>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* MODAL 1: EDIT PROFIL HR */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Profil HR</h3>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {profileMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  profileMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300'
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Password Baru (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type={showProfilePass ? 'text' : 'password'}
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Kosongkan jika tidak diubah"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl pl-3.5 pr-9 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfilePass(!showProfilePass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {showProfilePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-4 py-2 rounded-xl saas-button-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {profileLoading ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: TAMBAH ADMIN HR BARU */}
        {showAddAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Admin HR Baru</h3>
                </div>
                <button
                  onClick={() => setShowAddAdminModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {adminMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  adminMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300'
                }`}>
                  {adminMsg.text}
                </div>
              )}

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Nama Lengkap Admin
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    placeholder="Contoh: Rina HR Specialist"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-purple-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Email Admin
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    placeholder="rina.hr@belajarvibe.com"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-purple-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Password Awal
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-purple-500 text-slate-900 dark:text-white text-xs rounded-xl pl-3.5 pr-9 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="px-4 py-2 rounded-xl saas-button-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {adminLoading ? 'Menambahkan...' : 'Tambah Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: TAMBAH DIVISI BARU */}
        {showAddDivisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Divisi Baru</h3>
                </div>
                <button
                  onClick={() => setShowAddDivisionModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {divisionMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  divisionMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300'
                }`}>
                  {divisionMsg.text}
                </div>
              )}

              <form onSubmit={handleAddDivision} className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Nama Divisi Baru
                  </label>
                  <input
                    type="text"
                    value={divisionNameInput}
                    onChange={(e) => setDivisionNameInput(e.target.value)}
                    required
                    placeholder="Contoh: Teknologi (IT), Desain (UI/UX)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-teal-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddDivisionModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={divisionLoading}
                    className="px-4 py-2 rounded-xl saas-button-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {divisionLoading ? 'Membuat...' : 'Buat Divisi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 4: UNDANG KARYAWAN VIA EMAIL */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-lg bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Kirim Undangan Karyawan</h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {inviteMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  inviteMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300'
                }`}>
                  {inviteMsg.text}
                </div>
              )}

              {inviteResult ? (
                <div className="space-y-4">
                  {/* Highlight Invite Code */}
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-700/60 text-slate-900 dark:text-white space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Kode Undangan / Sandi Awal Dibuat:
                    </p>
                    <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-3 rounded-lg border border-indigo-200 dark:border-slate-800">
                      <span className="font-mono text-base font-bold text-indigo-600 dark:text-sky-300 tracking-widest">
                        {inviteResult.inviteCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.inviteCode);
                          alert('Kode undangan berhasil disalin ke clipboard!');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-all shadow-sm"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Akun karyawan untuk <strong className="text-slate-900 dark:text-white">{inviteName || inviteEmail}</strong> telah dibuat. Karyawan dapat langsung masuk pada halaman Login dengan email dan kode di atas.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Isi Pesan Undangan Email:
                    </p>
                    <div className="bg-white dark:bg-slate-950 p-3 rounded-lg font-mono text-[11px] leading-relaxed text-slate-800 dark:text-indigo-200 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap max-h-44 overflow-y-auto">
                      {inviteResult.emailContent}
                    </div>

                    {inviteResult.previewUrl && (
                      <div className="pt-2">
                        <a
                          href={inviteResult.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
                        >
                          <Mail className="h-4 w-4" />
                          <span>Buka Pratinjau Inbox Email (Ethereal Web) &rarr;</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteResult(null);
                        setInviteName('');
                        setInviteEmail('');
                        setInviteMsg(null);
                      }}
                      className="px-4 py-2 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold"
                    >
                      Kirim Undangan Lain
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteEmployee} className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-1">
                    <p>💡 <strong>Superadmin Pengirim:</strong> Undangan dikirimkan via Gmail <span className="font-semibold text-indigo-700 dark:text-white">rindimia79@gmail.com</span>.</p>
                    <p className="text-emerald-700 dark:text-emerald-300">🔑 <strong>Kode Unik Otomatis:</strong> Setiap karyawan dibuatkan kode unik (format <code className="font-mono font-bold bg-white/70 dark:bg-slate-900 px-1 py-0.5 rounded">STV-XXXXXX</code>) yang tidak pernah sama antar karyawan.</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                      Nama Karyawan Target
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                      placeholder="Contoh: Sarah Beautician"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                      Email Aktif Karyawan
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="sarah@example.com"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                      Pilih Divisi Penempatan
                    </label>
                    <select
                      value={inviteDivisionId}
                      onChange={(e) => setInviteDivisionId(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                    >
                      <option value="">-- Pilih Divisi (Perawat / Beautician / Front Office / HR) --</option>
                      {divisionsList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Checkbox Kirim Email Langsung */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailNowCheckbox}
                      onChange={(e) => setSendEmailNowCheckbox(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Kirim email undangan sekarang ke karyawan</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {sendEmailNowCheckbox 
                          ? 'Email dengan kode unik akan langsung terkirim via Gmail SMTP. Status: Menunggu Login.'
                          : 'Karyawan hanya didaftarkan & kode unik dibuat. Status: Belum Terkirim (dapat dikirim nanti dari tabel).'}
                      </p>
                    </div>
                  </label>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {inviteLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>{sendEmailNowCheckbox ? 'Mengirim Undangan...' : 'Mendaftarkan...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{sendEmailNowCheckbox ? 'Kirim Undangan Email' : 'Simpan Karyawan (Draft)'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}
