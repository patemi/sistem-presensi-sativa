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
  Copy, CalendarCheck, FileText, MessageSquare, ScanFace, RotateCcw,
  Edit2, Trash2, UserCheck, Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import AdminScheduleManagement from '@/components/schedule/AdminScheduleManagement';

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
  const [sidebarNav, setSidebarNav] = useState<'overview' | 'employees' | 'attendance' | 'psychological' | 'leaves' | 'management' | 'schedules'>('overview');
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

  // Edit Division state
  const [editingDivision, setEditingDivision] = useState<{ id: string; name: string } | null>(null);
  const [editDivisionName, setEditDivisionName] = useState('');
  const [editDivisionLoading, setEditDivisionLoading] = useState(false);
  const [editDivisionMsg, setEditDivisionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete Division state
  const [deletingDivision, setDeletingDivision] = useState<{ id: string; name: string; userCount?: number } | null>(null);
  const [deleteDivisionLoading, setDeleteDivisionLoading] = useState(false);

  // Quick Reassign Employee Division Modal
  const [reassignModal, setReassignModal] = useState<{
    employeeId: string;
    employeeName: string;
    currentDivisionId: string | null;
    currentDivisionName: string;
  } | null>(null);
  const [targetDivisionId, setTargetDivisionId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignMsg, setReassignMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Assign Staff to specific Division (to fulfill "min 1 karyawan" rule)
  const [quickAssignDivision, setQuickAssignDivision] = useState<{ id: string; name: string } | null>(null);
  const [selectedStaffIdToAssign, setSelectedStaffIdToAssign] = useState('');
  const [quickAssignLoading, setQuickAssignLoading] = useState(false);
  const [quickAssignMsg, setQuickAssignMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const [divisionsList, setDivisionsList] = useState<{
    id: string;
    name: string;
    userCount?: number;
    users?: { id: string; fullName: string; email: string; role: string; hasFace?: boolean }[];
    hasMinimumEmployees?: boolean;
  }[]>([]);

  // Employee Directory & Tracking State
  const [employeesData, setEmployeesData] = useState<{
    stats: { total: number; joined: number; sent: number; pending: number; withFace?: number };
    employees: any[];
  }>({
    stats: { total: 0, joined: 0, sent: 0, pending: 0, withFace: 0 },
    employees: [],
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'joined' | 'sent' | 'pending'>('all');
  const [employeeDivisionFilter, setEmployeeDivisionFilter] = useState<string>('all');
  const [employeeFaceFilter, setEmployeeFaceFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [resendSuccessAlert, setResendSuccessAlert] = useState<string | null>(null);
  const [resettingFaceId, setResettingFaceId] = useState<string | null>(null);

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

  const handleResetFace = async (employeeId?: string, employeeName?: string, role?: string) => {
    const targetId = employeeId || user?.id;
    if (!targetId) {
      alert('ID pengguna tidak valid');
      return;
    }
    const targetName = employeeName || user?.fullName || 'Pengguna';
    const targetRole = role || user?.role || 'staff';
    const isSelf = user?.id === targetId;

    const confirmText = isSelf
      ? 'Apakah Anda yakin ingin mereset master biometrik wajah Anda sendiri? Anda akan diminta mendaftarkan ulang wajah Anda saat presensi berikutnya.'
      : `Apakah Anda yakin ingin mereset master biometrik wajah milik ${targetName} (${targetRole.toUpperCase()})? Karyawan/Admin ini akan diwajibkan mendaftarkan ulang wajahnya saat login/presensi berikutnya.`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setResettingFaceId(targetId);
    try {
      const res = await api.patch(`/auth/reset-face/${targetId}`);
      alert(res.data?.message || `Master wajah ${targetName} berhasil di-reset!`);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mereset master biometrik wajah');
    } finally {
      setResettingFaceId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Leave Requests (Izin & Cuti) State
  const [leavesData, setLeavesData] = useState<{
    stats: { total: number; pending: number; approved: number; rejected: number };
    leaves: any[];
  }>({
    stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
    leaves: [],
  });
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [leaveDivisionFilter, setLeaveDivisionFilter] = useState<string>('all');
  const [leaveSearchTerm, setLeaveSearchTerm] = useState('');

  // Review Modal State (ACC / Tolak dengan Catatan Tambahan)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccessAlert, setReviewSuccessAlert] = useState<string | null>(null);

  // Modal Input Pengajuan Izin Baru oleh HR
  const [createLeaveModalOpen, setCreateLeaveModalOpen] = useState(false);
  const [newLeaveEmployeeId, setNewLeaveEmployeeId] = useState('');
  const [newLeaveType, setNewLeaveType] = useState('cuti_tahunan');
  const [newLeaveStartDate, setNewLeaveStartDate] = useState('');
  const [newLeaveEndDate, setNewLeaveEndDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [newLeaveInitialStatus, setNewLeaveInitialStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [newLeaveAdminNotes, setNewLeaveAdminNotes] = useState('');
  const [createLeaveLoading, setCreateLeaveLoading] = useState(false);

  const fetchLeaves = async () => {
    setLeavesLoading(true);
    try {
      const res = await api.get('/leaves');
      setLeavesData(res.data);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLeavesLoading(false);
    }
  };

  const handleOpenReview = (leave: any, action: 'APPROVE' | 'REJECT') => {
    setSelectedLeaveForReview(leave);
    setReviewAction(action);
    setReviewNotes(
      leave.adminNotes || 
      (action === 'APPROVE' 
        ? 'Disetujui oleh HR. Jadwal shift klinik telah dikoordinasikan.' 
        : 'Mohon maaf, permohonan belum dapat disetujui karena jadwal operasional padat.')
    );
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveForReview) return;
    setReviewLoading(true);
    try {
      const res = await api.patch(`/leaves/${selectedLeaveForReview.id}/review`, {
        action: reviewAction,
        adminNotes: reviewNotes,
      });
      setReviewSuccessAlert(res.data.message || 'Status izin/cuti berhasil diperbarui!');
      setReviewModalOpen(false);
      await fetchLeaves();
      setTimeout(() => setReviewSuccessAlert(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses permohonan izin/cuti');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveEmployeeId) {
      alert('Pilih karyawan terlebih dahulu');
      return;
    }
    if (!newLeaveStartDate || !newLeaveEndDate) {
      alert('Pilih tanggal mulai dan tanggal selesai');
      return;
    }
    setCreateLeaveLoading(true);
    try {
      await api.post('/leaves', {
        employeeId: newLeaveEmployeeId,
        leaveType: newLeaveType,
        startDate: newLeaveStartDate,
        endDate: newLeaveEndDate,
        reason: newLeaveReason,
        initialStatus: newLeaveInitialStatus,
        adminNotes: newLeaveAdminNotes,
      });
      setReviewSuccessAlert('Pengajuan izin/cuti baru berhasil dicatat!');
      setCreateLeaveModalOpen(false);
      setNewLeaveReason('');
      setNewLeaveAdminNotes('');
      await fetchLeaves();
      setTimeout(() => setReviewSuccessAlert(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuat permohonan izin/cuti');
    } finally {
      setCreateLeaveLoading(false);
    }
  };

  const fetchDashboardData = async (division = selectedDivision) => {
    setLoading(true);
    try {
      const params = {
        divisionId: division,
        period: 'today',
      };

      const [attRes, corrRes, alertRes, trendRes] = await Promise.allSettled([
        api.get('/analytics/attendance-today', { params }),
        api.get('/analytics/correlation', { params }),
        api.get('/analytics/alerts'),
        api.get('/analytics/division-sentiment', { params }),
      ]);

      if (attRes.status === 'fulfilled') setAttendanceData(attRes.value.data);
      if (corrRes.status === 'fulfilled') setCorrelationData(corrRes.value.data);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data);
      if (trendRes.status === 'fulfilled') setSentimentTrends(trendRes.value.data);
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
    if (sidebarNav === 'attendance' || sidebarNav === 'overview') {
      fetchDashboardData(selectedDivision);
    }
  }, [sidebarNav]);

  useEffect(() => {
    fetchDivisions();
    fetchEmployees();
    fetchLeaves();
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

  const handleEditDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDivision || !editDivisionName.trim()) return;
    setEditDivisionLoading(true);
    setEditDivisionMsg(null);
    try {
      const res = await api.patch(`/auth/divisions/${editingDivision.id}`, {
        name: editDivisionName.trim(),
      });
      setEditDivisionMsg({ type: 'success', text: res.data?.message || 'Nama divisi berhasil diperbarui!' });
      await fetchDivisions();
      await fetchEmployees();
      setTimeout(() => {
        setEditingDivision(null);
        setEditDivisionMsg(null);
      }, 1200);
    } catch (err: any) {
      setEditDivisionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Gagal memperbarui nama divisi',
      });
    } finally {
      setEditDivisionLoading(false);
    }
  };

  const handleDeleteDivision = async () => {
    if (!deletingDivision) return;
    setDeleteDivisionLoading(true);
    try {
      const res = await api.delete(`/auth/divisions/${deletingDivision.id}`);
      alert(res.data?.message || 'Divisi berhasil dihapus!');
      setDeletingDivision(null);
      await fetchDivisions();
      await fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus divisi');
    } finally {
      setDeleteDivisionLoading(false);
    }
  };

  const handleReassignDivision = async (employeeId: string, divId: string) => {
    setReassignLoading(true);
    setReassignMsg(null);
    try {
      const res = await api.patch(`/auth/employees/${employeeId}/division`, {
        divisionId: divId || null,
      });
      setReassignMsg({ type: 'success', text: res.data?.message || 'Divisi staf berhasil dipindahkan!' });
      await fetchEmployees();
      await fetchDivisions();
      setTimeout(() => {
        setReassignModal(null);
        setReassignMsg(null);
      }, 1000);
    } catch (err: any) {
      setReassignMsg({
        type: 'error',
        text: err.response?.data?.message || 'Gagal mengubah divisi karyawan',
      });
    } finally {
      setReassignLoading(false);
    }
  };

  const handleQuickAssignStaffToDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssignDivision || !selectedStaffIdToAssign) return;
    setQuickAssignLoading(true);
    setQuickAssignMsg(null);
    try {
      const res = await api.patch(`/auth/employees/${selectedStaffIdToAssign}/division`, {
        divisionId: quickAssignDivision.id,
      });
      setQuickAssignMsg({ type: 'success', text: `Staf berhasil ditugaskan ke divisi "${quickAssignDivision.name}"!` });
      await fetchEmployees();
      await fetchDivisions();
      setTimeout(() => {
        setQuickAssignDivision(null);
        setSelectedStaffIdToAssign('');
        setQuickAssignMsg(null);
      }, 1200);
    } catch (err: any) {
      setQuickAssignMsg({
        type: 'error',
        text: err.response?.data?.message || 'Gagal menugaskan staf ke divisi ini',
      });
    } finally {
      setQuickAssignLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus karyawan "${employeeName}"? Riwayat presensi dan jadwal shift karyawan ini juga akan dihapus.`)) {
      return;
    }
    try {
      const res = await api.delete(`/auth/employees/${employeeId}`);
      alert(res.data?.message || `Karyawan "${employeeName}" berhasil dihapus.`);
      await fetchEmployees();
      await fetchDivisions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus karyawan');
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

  const filteredPresentList = (attendanceData?.presentList || []).filter((item: any) =>
    (item?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.divisionName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbsentList = (attendanceData?.absentList || []).filter((item: any) =>
    (item?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.divisionName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployeesList = (employeesData?.employees || []).filter((emp: any) => {
    const matchesStatus = employeeStatusFilter === 'all' || emp.inviteStatus === employeeStatusFilter;
    const matchesDivision = employeeDivisionFilter === 'all' || emp.divisionId === employeeDivisionFilter;
    const matchesFace = employeeFaceFilter === 'all' || 
      (employeeFaceFilter === 'registered' ? emp.hasFaceDescriptor : !emp.hasFaceDescriptor);
    const query = employeeSearchTerm.toLowerCase().trim();
    const matchesSearch = !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.inviteCode?.toLowerCase().includes(query) ||
      emp.division?.name?.toLowerCase().includes(query);
    return matchesStatus && matchesDivision && matchesFace && matchesSearch;
  });

  const formatDateOnly = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const getLeaveTypeInfo = (type: string) => {
    switch (type) {
      case 'cuti_tahunan':
        return { label: 'Cuti Tahunan', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'izin_sakit':
        return { label: 'Izin Sakit', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'izin_keperluan_pribadi':
        return { label: 'Keperluan Pribadi', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'cuti_melahirkan':
        return { label: 'Cuti Melahirkan', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      default:
        return { label: 'Izin Khusus / Lainnya', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    }
  };

  const filteredLeavesList = (leavesData?.leaves || []).filter((leave: any) => {
    const matchesStatus = leaveStatusFilter === 'all' || leave.status === leaveStatusFilter;
    const matchesDivision = leaveDivisionFilter === 'all' || leave.user?.divisionId === leaveDivisionFilter;
    const query = leaveSearchTerm.toLowerCase().trim();
    const matchesSearch = !query ||
      leave.user?.fullName?.toLowerCase().includes(query) ||
      leave.user?.email?.toLowerCase().includes(query) ||
      leave.reason?.toLowerCase().includes(query) ||
      leave.leaveType?.toLowerCase().includes(query) ||
      leave.adminNotes?.toLowerCase().includes(query);
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
      {/* MOBILE TOP NAVBAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0f1823] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Droplets className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide text-slate-900 dark:text-white block leading-none">SATIVA HR</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Portal Manajemen Klinik</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            aria-label="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER (Responsive & Smooth) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0c141d] h-full shadow-2xl flex flex-col justify-between p-5 z-50 overflow-y-auto border-r border-slate-200 dark:border-slate-800"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-base text-slate-900 dark:text-white block leading-none">SATIVA</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Klinik Kecantikan HR</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu Utama</div>
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => { setSidebarNav('overview'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'overview'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <BarChart3 className={cn("h-4 w-4 shrink-0", sidebarNav === 'overview' ? "text-sky-500" : "text-slate-400")} />
                    <span>Overview Ringkasan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('employees'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'employees'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Users className={cn("h-4 w-4 shrink-0", sidebarNav === 'employees' ? "text-sky-500" : "text-slate-400")} />
                      <span>Data Seluruh Karyawan</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {employeesData.stats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('attendance'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'attendance'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Calendar className={cn("h-4 w-4 shrink-0", sidebarNav === 'attendance' ? "text-sky-500" : "text-slate-400")} />
                    <span>Absensi Kehadiran</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('psychological'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'psychological'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4 shrink-0", sidebarNav === 'psychological' ? "text-sky-500" : "text-slate-400")} />
                    <span>Psikologis & Sentimen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('leaves'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'leaves'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck className={cn("h-4 w-4 shrink-0", sidebarNav === 'leaves' ? "text-sky-500" : "text-slate-400")} />
                      <span>Izin & Cuti Karyawan</span>
                    </div>
                    {leavesData.stats.pending > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse shadow-sm">
                        {leavesData.stats.pending}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('schedules'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'schedules'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Calendar className={cn("h-4 w-4 shrink-0", sidebarNav === 'schedules' ? "text-sky-500" : "text-slate-400")} />
                    <span>Jadwal & Tukar Shift</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSidebarNav('management'); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      sidebarNav === 'management'
                        ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Building className={cn("h-4 w-4 shrink-0", sidebarNav === 'management' ? "text-sky-500" : "text-slate-400")} />
                    <span>Manajemen Organisasi</span>
                  </button>

                  <Link
                    href="/dashboard/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 transition-colors mt-3"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Log Riwayat & Ekspor</span>
                  </Link>

                  <Link
                    href="/checkin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/80 transition-colors mt-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ScanFace className="h-4 w-4 text-sky-500" />
                      <span>Presensi Harian (Wajib HR/Admin)</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </Link>
                </nav>
              </div>

              {/* Mobile Drawer Footer User Card */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {user?.fullName?.substring(0, 2).toUpperCase() || 'HR'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">Superadmin HR</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ThemeToggle />
                    <SwitchLanguage />
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP SAAS SIDEBAR (Always clean on desktop) */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#0c141d] border-r border-slate-200 dark:border-slate-800/80 flex-col justify-between p-4 z-30 shrink-0 sticky top-0 h-screen transition-all shadow-sm">
        <div>
          {/* Brand Header */}
          <div className="flex items-center space-x-3 pb-5 border-b border-slate-200 dark:border-slate-800/80 mb-5 px-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
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
              onClick={() => setSidebarNav('overview')}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'overview'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <BarChart3 className={cn("h-4 w-4 shrink-0", sidebarNav === 'overview' ? "text-sky-500" : "text-slate-400")} />
              <span>Overview Ringkasan</span>
            </button>

            <button
              onClick={() => setSidebarNav('employees')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'employees'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <Users className={cn("h-4 w-4 shrink-0", sidebarNav === 'employees' ? "text-sky-500" : "text-slate-400")} />
                <span>Data Seluruh Karyawan</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {employeesData.stats.total}
              </span>
            </button>

            <button
              onClick={() => setSidebarNav('attendance')}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'attendance'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Calendar className={cn("h-4 w-4 shrink-0", sidebarNav === 'attendance' ? "text-sky-500" : "text-slate-400")} />
              <span>Absensi Kehadiran</span>
            </button>

            <button
              onClick={() => setSidebarNav('psychological')}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'psychological'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Sparkles className={cn("h-4 w-4 shrink-0", sidebarNav === 'psychological' ? "text-sky-500" : "text-slate-400")} />
              <span>Psikologis & Sentimen</span>
            </button>

            <button
              onClick={() => setSidebarNav('leaves')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'leaves'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className={cn("h-4 w-4 shrink-0", sidebarNav === 'leaves' ? "text-sky-500" : "text-slate-400")} />
                <span>Izin & Cuti Karyawan</span>
              </div>
              {leavesData.stats.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse shadow-sm">
                  {leavesData.stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setSidebarNav('schedules')}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                sidebarNav === 'schedules'
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white shadow-sm border border-sky-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <Calendar className={cn("h-4 w-4 shrink-0", sidebarNav === 'schedules' ? "text-sky-500" : "text-slate-400")} />
                <span>Jadwal & Tukar Shift</span>
              </div>
            </button>

            <button
              onClick={() => setSidebarNav('management')}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
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

            <Link
              href="/checkin"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/80 transition-colors duration-150 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <ScanFace className="h-4 w-4 text-sky-500" />
                <span>Presensi Harian (Wajib HR/Admin)</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
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
              className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
        <header className="bg-white dark:bg-[#0e1622] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-20 transition-colors duration-200 shadow-sm md:shadow-none">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {sidebarNav === 'overview' && 'Overview Evaluasi Klinik'}
              {sidebarNav === 'employees' && 'Direktori & Data Seluruh Karyawan'}
              {sidebarNav === 'attendance' && 'Absensi & Kehadiran Karyawan'}
              {sidebarNav === 'psychological' && 'Iklim Psikologis & Sentimen Tim'}
              {sidebarNav === 'leaves' && 'Manajemen Izin & Cuti Karyawan'}
              {sidebarNav === 'schedules' && 'Manajemen Jadwal Shift & Tukar Shift'}
              {sidebarNav === 'management' && 'Pusat Manajemen HR & Divisi Klinik'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {sidebarNav === 'overview' && 'Analisis korelasi absensi tim dan tren iklim mental kolektif real-time.'}
              {sidebarNav === 'employees' && 'Pantau seluruh staf klinik, status master biometrik wajah, penempatan divisi, dan kode login.'}
              {sidebarNav === 'attendance' && 'Log kehadiran harian karyawan terdaftar beserta status absensi.'}
              {sidebarNav === 'psychological' && 'Data tren kesehatan mental kolektif terenkripsi & anonim.'}
              {sidebarNav === 'leaves' && 'Verifikasi permohonan izin cuti staf klinik, berikan persetujuan (ACC) atau penolakan beserta catatan admin.'}
              {sidebarNav === 'schedules' && 'Atur jadwal shift operasional klinik (Pagi, Siang, Long Shift, Libur OFF) sesuai kuota bulanan.'}
              {sidebarNav === 'management' && 'Kelola profil HR, tambah admin, tambah/edit/hapus divisi klinik, serta pastikan minimal 1 staf per divisi.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Division Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <Building className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Divisi:</span>
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

            {/* Tombol Perbarui Analisis AI (Ramah orang awam) */}
            <button
              onClick={handleTriggerCron}
              disabled={cronTriggering}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              title="Perbarui analisis korelasi absensi dan tren stres tim klinik"
            >
              <Sparkles className={`h-3.5 w-3.5 ${cronTriggering ? 'animate-spin' : ''}`} />
              <span>{cronTriggering ? 'Menganalisis...' : 'Perbarui Analisis AI'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Section Content */}
        <main className="p-4 sm:p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* Cron Trigger Notification */}
          {cronResult && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-sky-500/30 text-slate-800 dark:text-white text-xs font-medium shadow-sm">
              <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-800 dark:text-sky-300">Analisis Iklim Tim Klinik Selesai</p>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  Proses selesai: {cronResult.processedTeams || cronResult.processedDivisions} divisi dianalisis, {cronResult.aggregatedTeams || cronResult.aggregatedDivisions} divisi teragregasi (&gt;= 5 responden), {cronResult.skippedTeams || cronResult.skippedDivisions} divisi dilewati (&lt; 5 responden).
                </p>
              </div>
            </div>
          )}

          {loading ? (
            /* Loading Skeleton */
            <div className="h-96 flex flex-col items-center justify-center bg-white dark:bg-[#111c27] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="h-8 w-8 border-2 border-slate-300 dark:border-slate-700 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Memuat data analitik klinik...</p>
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
                  {/* KPI Stat Cards (Responsive Grid 1 to 3 cols with fallback numbers) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {/* Attendance Rate Card */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tingkat Kehadiran Harian
                        </span>
                        <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
                          <Calendar className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {attendanceData?.summary?.attendanceRate !== undefined ? `${attendanceData.summary.attendanceRate}%` : '0%'}
                      </div>
                      <div className="flex items-center gap-2 mt-4 text-xs font-medium flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                          {attendanceData?.summary?.presentCount ?? 0} Hadir Hari Ini
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-semibold">
                          {attendanceData?.summary?.absentCount ?? 0} Belum Absen
                        </span>
                      </div>
                    </div>

                    {/* Late Rate Card */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tingkat Keterlambatan
                        </span>
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                          <Clock className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {attendanceData?.summary?.lateRate !== undefined ? `${attendanceData.summary.lateRate}%` : '0%'}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-4 font-medium">
                        Terlambat masuk: <span className="text-amber-600 dark:text-amber-400 font-bold">{attendanceData?.summary?.lateCount ?? 0} orang</span>
                      </p>
                    </div>

                    {/* Burnout Risk Card */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Peringatan Stres / Burnout
                        </span>
                        <div className={`p-2 rounded-xl ${alerts.length > 0 ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {alerts.length}
                      </div>
                      <div className="mt-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${
                          alerts.length > 0
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchDashboardData(selectedDivision)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="Segarkan data absensi terkini"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-sky-500")} />
                        <span>Segarkan</span>
                      </button>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Log Absensi Real-time</span>
                    </div>
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

                    {/* Tampilan Mobile: Kartu Hadir Tanpa Geser */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredPresentList.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
                          Tidak ada data karyawan hadir
                        </p>
                      ) : (
                        filteredPresentList.map((row: any, idx: number) => (
                          <div key={`m-present-${row.id || row.userId || idx}`} className="py-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-xs">{row.fullName}</h4>
                                <span className="inline-block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {row.divisionName}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                                row.lateMinutes > 0
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              }`}>
                                {row.lateMinutes > 0 ? `Terlambat (${row.lateMinutes}m)` : 'Tepat Waktu'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Check-in</span>
                                <span className="font-mono font-bold">{row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Check-out</span>
                                <span className="font-mono font-bold">{row.checkOutTime || row.checkoutTime ? new Date(row.checkOutTime || row.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Jarak GPS</span>
                                <span className="font-mono font-bold">{row.distanceMeters !== undefined ? `${row.distanceMeters}m` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Tampilan Desktop: Tabel Lengkap */}
                    <div className="hidden md:block overflow-x-auto">
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
                            filteredPresentList.map((row: any, idx: number) => (
                              <tr key={row.id || row.userId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{row.fullName}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.divisionName}</td>
                                <td className="py-3 px-4 font-mono">{row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className="py-3 px-4 font-mono">{row.checkOutTime || row.checkoutTime ? new Date(row.checkOutTime || row.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className="py-3 px-4 font-mono">{row.distanceMeters !== undefined ? `${row.distanceMeters}m` : '-'}</td>
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

                    {/* Tampilan Mobile: Kartu Belum Hadir */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredAbsentList.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
                          Semua karyawan sudah absen hari ini
                        </p>
                      ) : (
                        filteredAbsentList.map((row: any, idx: number) => (
                          <div key={`m-absent-${row.id || row.userId || idx}`} className="py-3 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-xs">{row.fullName}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.divisionName}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                              Belum Absen
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Tampilan Desktop: Tabel */}
                    <div className="hidden md:block overflow-x-auto">
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
                            filteredAbsentList.map((row: any, idx: number) => (
                              <tr key={row.id || row.userId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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

                    {/* Tampilan Mobile: Kartu Iklim Psikologis Divisi Tanpa Geser */}
                    <div className="md:hidden space-y-3">
                      {correlationData.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium text-xs">
                          Tidak ada data analisis divisi
                        </p>
                      ) : (
                        correlationData.map((row: any) => (
                          <div
                            key={`m-corr-${row.divisionId}`}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                {row.divisionName}
                              </h4>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                row.riskLevel === 'kritis'
                                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                                  : row.riskLevel === 'perlu_perhatian'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              }`}>
                                {row.riskLevel}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Kehadiran</span>
                                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{row.attendanceRate}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Keterlambatan</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{row.lateCount} kali</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-medium">Sentimen</span>
                                {row.isRestricted ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                                    <Lock className="h-2.5 w-2.5" />
                                    Terkunci
                                  </span>
                                ) : (
                                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                                    {row.avgSentimentScore}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Tema Utama</p>
                              {row.isRestricted ? (
                                <span className="text-slate-400 italic text-xs">{t('hr.insufficient_data')}</span>
                              ) : row.dominantThemes && row.dominantThemes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.dominantThemes.map((tTheme: string, idx: number) => (
                                    <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {tTheme}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Belum ada tema jurnal</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Tampilan Desktop: Tabel Lengkap */}
                    <div className="hidden md:block overflow-x-auto">
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

              {/* SECTION 4: DATA SELURUH KARYAWAN KLINIK */}
              {sidebarNav === 'employees' && (
                <motion.div
                  key="employees"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >

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

                    {/* 5 Kartu Metrik Status Karyawan & Biometrik */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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

                      {/* Kartu 5: Master Wajah Terdaftar */}
                      <div className="p-3.5 rounded-2xl text-left bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 shadow-sm col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">Biometrik Wajah</span>
                          <ScanFace className="h-4 w-4 text-sky-500" />
                        </div>
                        <p className="text-2xl font-black text-sky-800 dark:text-sky-200">
                          {employeesData.stats.withFace || 0}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Wajah terverifikasi 128-d</p>
                      </div>
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
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                        {/* Filter Divisi */}
                        <select
                          value={employeeDivisionFilter}
                          onChange={(e) => setEmployeeDivisionFilter(e.target.value)}
                          className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 outline-none"
                        >
                          <option value="all">Semua Divisi</option>
                          {divisionsList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
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

                    {/* Tabel Karyawan & Tampilan Kartu Mobile */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      {/* Tampilan Mobile: Kartu Responsif Tanpa Perlu Digeser */}
                      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950/40">
                        {employeesLoading ? (
                          <div className="py-10 text-center text-slate-500">
                            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500 mx-auto mb-2" />
                            <p className="text-xs">Memuat data seluruh karyawan...</p>
                          </div>
                        ) : filteredEmployeesList.length === 0 ? (
                          <div className="py-10 px-4 text-center text-slate-500">
                            <Users className="h-8 w-8 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Tidak ada data karyawan yang cocok</p>
                            <p className="text-[11px] text-slate-500 mt-1">Coba ubah filter status atau kata kunci pencarian Anda.</p>
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
                        ) : (
                          filteredEmployeesList.map((emp: any) => {
                            const isJoined = emp.inviteStatus === 'joined';
                            const isSent = emp.inviteStatus === 'sent';
                            const isPending = emp.inviteStatus === 'pending' || !emp.inviteStatus;

                            return (
                              <div key={`m-emp-${emp.id}`} className="p-4 space-y-3">
                                {/* Header Kartu: Avatar + Nama + Status Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                                      {emp.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                                          {emp.fullName}
                                        </span>
                                        {emp.role === 'hr' && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                            HR Admin
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                        {emp.email}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className="shrink-0">
                                    {isJoined && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Aktif
                                      </span>
                                    )}
                                    {isSent && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Menunggu Login
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                        <Clock className="h-3 w-3 text-slate-500" />
                                        Belum Terkirim
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Informasi Detail: Divisi & Kode Undangan */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Divisi</p>
                                    <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                      <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      <span className="truncate">{emp.divisionName || emp.division?.name || 'Tanpa Divisi'}</span>
                                    </div>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Kode Undangan</p>
                                    {emp.inviteCode ? (
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-sky-300 truncate">
                                          {emp.inviteCode}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(emp.inviteCode)}
                                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
                                          title="Salin Kode Undangan"
                                        >
                                          {copiedCode === emp.inviteCode ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                          ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-xs">-</span>
                                    )}
                                  </div>
                                </div>

                                {/* Status Master Biometrik Wajah */}
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                      <ScanFace className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Master Biometrik</p>
                                      {emp.hasFaceDescriptor ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                          <span>Terdaftar (128-d)</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                          <Lock className="h-3 w-3 text-amber-500" />
                                          <span>Belum Ada (Wajib 1x)</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {emp.hasFaceDescriptor && (
                                    <button
                                      type="button"
                                      disabled={resettingFaceId === emp.id}
                                      onClick={() => handleResetFace(emp.id, emp.fullName, emp.role)}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold text-[10px] inline-flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                      title={`Reset master biometrik wajah ${emp.fullName}`}
                                    >
                                      <RotateCcw className={cn("h-3 w-3", resettingFaceId === emp.id && "animate-spin")} />
                                      <span>Reset Wajah</span>
                                    </button>
                                  )}
                                </div>

                                {/* Footer Kartu: Tanggal Terakhir & Tombol Aksi */}
                                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {isJoined
                                      ? `Login terakhir: ${emp.lastLoginAt ? formatDateTime(emp.lastLoginAt) : 'Belum pernah'}`
                                      : isSent
                                      ? `Undangan dikirim: ${emp.invitedAt ? formatDateTime(emp.invitedAt) : formatDateTime(emp.createdAt)}`
                                      : `Akun dibuat: ${formatDateTime(emp.createdAt)}`
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    disabled={resendingId === emp.id}
                                    onClick={() => handleResendInvite(emp.id, emp.fullName)}
                                    className={cn(
                                      "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all",
                                      isPending
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        : isSent
                                        ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                        : "saas-button text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                  >
                                    {resendingId === emp.id ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        <span>Mengirim...</span>
                                      </>
                                    ) : isPending ? (
                                      <>
                                        <Send className="h-3.5 w-3.5" />
                                        <span>Kirim Undangan Email</span>
                                      </>
                                    ) : isSent ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        <span>Kirim Ulang Undangan</span>
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>Kirim Ulang Kode</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Tampilan Desktop: Tabel Lengkap */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              <th className="py-3 px-4">Karyawan</th>
                              <th className="py-3 px-4">Divisi Klinik</th>
                              <th className="py-3 px-4">Kode Undangan Unik</th>
                              <th className="py-3 px-4">Master Biometrik Wajah</th>
                              <th className="py-3 px-4">Status Undangan & Akun</th>
                              <th className="py-3 px-4">Waktu Terakhir</th>
                              <th className="py-3 px-4 text-center">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                            {employeesLoading ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                                    <p className="text-xs">Memuat data seluruh karyawan...</p>
                                  </div>
                                </td>
                              </tr>
                            ) : filteredEmployeesList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500">
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
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                          <Building className="h-3 w-3 text-slate-500" />
                                          <span>{emp.divisionName || emp.division?.name || 'Tanpa Divisi'}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReassignModal({
                                              employeeId: emp.id,
                                              employeeName: emp.fullName,
                                              currentDivisionId: emp.divisionId,
                                              currentDivisionName: emp.divisionName || emp.division?.name || 'Tanpa Divisi',
                                            });
                                            setTargetDivisionId(emp.divisionId || '');
                                            setReassignMsg(null);
                                          }}
                                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                          title="Ubah Divisi Karyawan"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                      </div>
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

                                    {/* Master Biometrik Wajah */}
                                    <td className="py-3.5 px-4">
                                      {emp.hasFaceDescriptor ? (
                                        <div className="space-y-1.5">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                            <ScanFace className="h-3.5 w-3.5 text-emerald-500" />
                                            Terdaftar (128-d)
                                          </span>
                                          <div>
                                            <button
                                              type="button"
                                              disabled={resettingFaceId === emp.id}
                                              onClick={() => handleResetFace(emp.id, emp.fullName, emp.role)}
                                              className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                              title={`Reset master biometrik wajah ${emp.fullName}`}
                                            >
                                              <RotateCcw className={cn("h-3 w-3", resettingFaceId === emp.id && "animate-spin")} />
                                              <span>Reset Wajah</span>
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                            <Lock className="h-3 w-3 text-amber-500" />
                                            Belum Terdaftar
                                          </span>
                                          <p className="text-[10px] text-slate-400 mt-0.5">Wajib didaftarkan saat login 1x</p>
                                        </div>
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

                                    {/* Aksi Kirim / Pindah / Hapus */}
                                    <td className="py-3.5 px-4 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          disabled={resendingId === emp.id}
                                          onClick={() => handleResendInvite(emp.id, emp.fullName)}
                                          className={cn(
                                            "px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-all",
                                            isPending
                                              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                              : isSent
                                              ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                              : "saas-button text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                          )}
                                          title="Kirim / Kirim Ulang Undangan"
                                        >
                                          {resendingId === emp.id ? (
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                          ) : isPending ? (
                                            <>
                                              <Send className="h-3 w-3" />
                                              <span>Undang</span>
                                            </>
                                          ) : isSent ? (
                                            <>
                                              <RefreshCw className="h-3 w-3" />
                                              <span>Kirim Ulang</span>
                                            </>
                                          ) : (
                                            <>
                                              <Mail className="h-3 w-3" />
                                              <span>Kirim Kode</span>
                                            </>
                                          )}
                                        </button>

                                        {/* Tombol Pindah Divisi Cepat */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReassignModal({
                                              employeeId: emp.id,
                                              employeeName: emp.fullName,
                                              currentDivisionId: emp.divisionId,
                                              currentDivisionName: emp.divisionName || emp.division?.name || 'Tanpa Divisi',
                                            });
                                            setTargetDivisionId(emp.divisionId || '');
                                            setReassignMsg(null);
                                          }}
                                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                                          title="Pindahkan ke Divisi Lain"
                                        >
                                          <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />
                                        </button>

                                        {/* Tombol Hapus Karyawan (jika bukan akun sendiri) */}
                                        {user?.id !== emp.id && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEmployee(emp.id, emp.fullName)}
                                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors"
                                            title="Hapus Karyawan"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
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

              {/* SECTION: MANAJEMEN HR & DIVISI KLINIK */}
              {sidebarNav === 'management' && (
                <motion.div
                  key="management"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Top 3 Management Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

                        {/* Status Master Wajah HR & Reset Mandiri */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ScanFace className="h-4 w-4 text-indigo-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">Master Wajah HR</p>
                              <p className="text-[10px] text-slate-500">Presensi biometrik HR</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={resettingFaceId === user?.id}
                            onClick={() => handleResetFace(user?.id, user?.fullName, user?.role)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold text-[10px] inline-flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                          >
                            <RotateCcw className={cn("h-3 w-3", resettingFaceId === user?.id && "animate-spin")} />
                            <span>Reset Wajah</span>
                          </button>
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
                        className="w-full mt-5 py-2.5 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
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
                        className="w-full mt-5 py-2.5 rounded-xl saas-button text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserPlus className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        <span>Tambah Admin HR</span>
                      </button>
                    </div>

                    {/* Management Card 3: Undang Karyawan via Email */}
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
                        className="w-full mt-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Kirim Undangan Email</span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION: PUSAT MANAJEMEN DIVISI KLINIK SATIVA */}
                  <div className="saas-card p-6 space-y-6">
                    {/* Banner Status Aturan Klinik: Minimal 1 Karyawan per Divisi */}
                    {(() => {
                      const zeroDivisions = divisionsList.filter((d) => (d.userCount || 0) < 1);
                      if (zeroDivisions.length > 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  Aturan Klinik: Terdapat {zeroDivisions.length} Divisi Belum Memiliki Karyawan
                                </p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                  Setiap divisi klinik diwajibkan memiliki minimal 1 karyawan ({zeroDivisions.map((d) => d.name).join(', ')}). Silakan gunakan tombol &quot;+ Tugaskan Staf&quot; di kartu divisi.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 shadow-sm">
                          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              Kuota Divisi Terpenuhi ({divisionsList.length} Divisi Aktif)
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                              Seluruh divisi operasional klinik telah memiliki minimal 1 staf aktif yang bertugas.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Header Divisi */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <Building className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              Manajemen Divisi Klinik Sativa
                              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold">
                                {divisionsList.length} Divisi
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Tambah divisi baru, edit nama divisi, hapus divisi kosong, serta pastikan minimal 1 staf bertugas di setiap divisi.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDivisionNameInput('');
                          setDivisionMsg(null);
                          setShowAddDivisionModal(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Tambah Divisi Baru</span>
                      </button>
                    </div>

                    {/* Grid Kartu Divisi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {divisionsList.map((d) => {
                        const count = d.userCount || 0;
                        const hasMin = count >= 1;

                        return (
                          <div
                            key={d.id}
                            className={cn(
                              "p-4 rounded-2xl border transition-all flex flex-col justify-between",
                              hasMin
                                ? "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
                                : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-sm"
                            )}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xs">
                                    {d.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                      {d.name}
                                    </h4>
                                  </div>
                                </div>

                                {/* Badge Kuota Status */}
                                {hasMin ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    <span>{count} Staf</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>0 Staf (Wajib Min. 1)</span>
                                  </span>
                                )}
                              </div>

                              {/* List staf yang ada di divisi ini */}
                              <div className="mt-3 space-y-1.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Staf Bertugas ({count}):
                                </p>
                                {d.users && d.users.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {d.users.map((u: any) => (
                                      <span
                                        key={u.id}
                                        className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>{u.fullName}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px]">
                                    ⚠️ Belum ada staf. Divisi ini membutuhkan minimal 1 karyawan aktif.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Aksi: Edit, Hapus, Tugaskan */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDivision(d);
                                    setEditDivisionName(d.name);
                                    setEditDivisionMsg(null);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
                                  title="Edit Nama Divisi"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (count > 0) {
                                      alert(`Tidak dapat menghapus divisi "${d.name}" karena masih memiliki ${count} staf. Harap pindahkan staf ke divisi lain terlebih dahulu.`);
                                      return;
                                    }
                                    setDeletingDivision(d);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title="Hapus Divisi"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickAssignDivision(d);
                                  setSelectedStaffIdToAssign('');
                                  setQuickAssignMsg(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <UserPlus className="h-3 w-3" />
                                <span>+ Tugaskan Staf</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECTION 5: MANAJEMEN PENGAJUAN IZIN & CUTI KARYAWAN */}
              {sidebarNav === 'leaves' && (
                <motion.div
                  key="leaves"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Alert Banner Notifikasi Sukses Review */}
                  {reviewSuccessAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Pembaruan Berhasil Disimpan</p>
                          <p className="text-xs mt-0.5 opacity-90">{reviewSuccessAlert}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReviewSuccessAlert(null)}
                        className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* 4 Kartu Metrik KPI Izin & Cuti */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1: Total Pengajuan */}
                    <div className="saas-card p-5 relative overflow-hidden group hover:border-sky-300 dark:hover:border-sky-700/60 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Total Permohonan
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800">
                          <CalendarCheck className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {leavesData.stats.total}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Akumulasi seluruh permohonan cuti
                      </p>
                    </div>

                    {/* KPI 2: Menunggu Persetujuan */}
                    <div className="saas-card p-5 relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-700/60 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold">
                          Menunggu ACC
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                          <Clock className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                          {leavesData.stats.pending}
                        </span>
                        {leavesData.stats.pending > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                            Perlu Tindakan
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Menunggu review & persetujuan HR
                      </p>
                    </div>

                    {/* KPI 3: Disetujui */}
                    <div className="saas-card p-5 relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold">
                          Disetujui (ACC)
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {leavesData.stats.approved}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Izin disetujui & shift disesuaikan
                      </p>
                    </div>

                    {/* KPI 4: Ditolak */}
                    <div className="saas-card p-5 relative overflow-hidden group hover:border-rose-300 dark:hover:border-rose-700/60 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-bold">
                          Ditolak
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800">
                          <XCircle className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                        {leavesData.stats.rejected}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Permohonan tidak dapat di-ACC
                      </p>
                    </div>
                  </div>

                  {/* Panel Utama Tabel Izin & Cuti */}
                  <div className="saas-card overflow-hidden">
                    {/* Header Panel */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <CalendarCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                              Manajemen Pengajuan Izin & Cuti Karyawan
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Tinjau, ACC persetujuan, atau tolak permohonan izin karyawan klinik dengan catatan resmi HR.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={fetchLeaves}
                          disabled={leavesLoading}
                          className="saas-button px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          title="Segarkan data permohonan izin"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", leavesLoading && "animate-spin text-sky-500")} />
                          <span>Segarkan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (employeesData.employees.length > 0 && !newLeaveEmployeeId) {
                              setNewLeaveEmployeeId(employeesData.employees[0].id);
                            }
                            setCreateLeaveModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md inline-flex items-center gap-2 transition-all"
                        >
                          <FolderPlus className="h-4 w-4" />
                          <span>+ Buat Pengajuan Cuti</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                      {/* Status Filter Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('all')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                            leaveStatusFilter === 'all'
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          )}
                        >
                          Semua ({leavesData.stats.total})
                        </button>

                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('PENDING')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            leaveStatusFilter === 'PENDING'
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800/80 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 border border-amber-200 dark:border-amber-800/60"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          <span>Menunggu ACC ({leavesData.stats.pending})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('APPROVED')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            leaveStatusFilter === 'APPROVED'
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60"
                          )}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Disetujui ({leavesData.stats.approved})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLeaveStatusFilter('REJECTED')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                            leaveStatusFilter === 'REJECTED'
                              ? "bg-rose-600 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800/80 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 border border-rose-200 dark:border-rose-800/60"
                          )}
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Ditolak ({leavesData.stats.rejected})</span>
                        </button>
                      </div>

                      {/* Division Filter & Search Input */}
                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <select
                          value={leaveDivisionFilter}
                          onChange={(e) => setLeaveDivisionFilter(e.target.value)}
                          className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-sky-500"
                        >
                          <option value="all">Semua Divisi Klinik</option>
                          {divisionsList.map((div) => (
                            <option key={div.id} value={div.id}>
                              {div.name}
                            </option>
                          ))}
                        </select>

                        <div className="relative w-full sm:w-64">
                          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={leaveSearchTerm}
                            onChange={(e) => setLeaveSearchTerm(e.target.value)}
                            placeholder="Cari nama, alasan, catatan..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-sky-500 placeholder-slate-400 dark:placeholder-slate-500"
                          />
                          {leaveSearchTerm && (
                            <button
                              onClick={() => setLeaveSearchTerm('')}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table Permohonan Izin & Cuti */}
                    {/* Tampilan Mobile: Kartu Permohonan Izin & Cuti Tanpa Perlu Digeser */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                      {leavesLoading ? (
                        <div className="py-12 text-center text-slate-500">
                          <RefreshCw className="h-5 w-5 animate-spin text-sky-500 mx-auto mb-2" />
                          <p className="text-xs">Memuat permohonan izin & cuti...</p>
                        </div>
                      ) : filteredLeavesList.length === 0 ? (
                        <div className="py-10 px-4 text-center text-slate-500">
                          <CalendarCheck className="h-8 w-8 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Tidak ada data permohonan cuti</p>
                          <p className="text-[11px] text-slate-500 mt-1">Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.</p>
                          {(leaveStatusFilter !== 'all' || leaveDivisionFilter !== 'all' || leaveSearchTerm) && (
                            <button
                              onClick={() => {
                                setLeaveStatusFilter('all');
                                setLeaveDivisionFilter('all');
                                setLeaveSearchTerm('');
                              }}
                              className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              Reset Semua Filter
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredLeavesList.map((item: any) => {
                          const typeInfo = getLeaveTypeInfo(item.leaveType);
                          const isPending = item.status === 'PENDING';
                          const isApproved = item.status === 'APPROVED';
                          const isRejected = item.status === 'REJECTED';

                          return (
                            <div key={`m-leave-${item.id}`} className="p-4 space-y-3">
                              {/* Header Kartu: Nama Karyawan & Status Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                    {item.user?.fullName?.charAt(0)?.toUpperCase() || 'K'}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                      {item.user?.fullName}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {item.user?.division?.name || 'Tanpa Divisi'}
                                    </span>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isPending && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                      <Clock className="h-3 w-3" />
                                      Menunggu ACC
                                    </span>
                                  )}
                                  {isApproved && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Disetujui
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                      <XCircle className="h-3 w-3 text-rose-500" />
                                      Ditolak
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Jenis & Periode Cuti */}
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold border",
                                    typeInfo.color
                                  )}>
                                    {typeInfo.label}
                                  </span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {item.durationDays} hari kerja
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                  <span className="font-medium text-slate-900 dark:text-white">
                                    {formatDateOnly(item.startDate)} — {formatDateOnly(item.endDate)}
                                  </span>
                                </div>

                                <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80">
                                  <p className="text-[10px] uppercase font-bold text-slate-400">Alasan:</p>
                                  <p className="text-slate-700 dark:text-slate-300 italic text-xs mt-0.5">
                                    "{item.reason}"
                                  </p>
                                </div>

                                {item.adminNotes && (
                                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
                                    <p className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">Catatan HR:</p>
                                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                                      {item.adminNotes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Tombol Tindakan HR di Mobile */}
                              <div className="pt-1">
                                {isPending ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReview(item, 'APPROVE')}
                                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <Check className="h-4 w-4" />
                                      <span>ACC Izin</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReview(item, 'REJECT')}
                                      className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <X className="h-4 w-4" />
                                      <span>Tolak</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReview(item, item.status)}
                                    className="w-full py-2.5 rounded-xl saas-button text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                                    <span>Ubah Keputusan / Catatan</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Tampilan Desktop: Tabel Lengkap */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-4">Karyawan</th>
                            <th className="py-3 px-4">Divisi Klinik</th>
                            <th className="py-3 px-4">Jenis Permohonan</th>
                            <th className="py-3 px-4">Periode & Durasi</th>
                            <th className="py-3 px-4">Alasan Pengajuan</th>
                            <th className="py-3 px-4">Status & Catatan Admin</th>
                            <th className="py-3 px-4 text-center">Tindakan HR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                          {leavesLoading ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <RefreshCw className="h-5 w-5 animate-spin text-sky-500" />
                                  <p className="text-xs">Memuat permohonan izin & cuti...</p>
                                </div>
                              </td>
                            </tr>
                          ) : filteredLeavesList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <CalendarCheck className="h-8 w-8 text-slate-400 stroke-[1.5]" />
                                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                                    Tidak ada data permohonan cuti
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.
                                  </p>
                                  {(leaveStatusFilter !== 'all' || leaveDivisionFilter !== 'all' || leaveSearchTerm) && (
                                    <button
                                      onClick={() => {
                                        setLeaveStatusFilter('all');
                                        setLeaveDivisionFilter('all');
                                        setLeaveSearchTerm('');
                                      }}
                                      className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                                    >
                                      Reset Semua Filter
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredLeavesList.map((item: any) => {
                              const typeInfo = getLeaveTypeInfo(item.leaveType);
                              const isPending = item.status === 'PENDING';
                              const isApproved = item.status === 'APPROVED';
                              const isRejected = item.status === 'REJECTED';

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                                >
                                  {/* Karyawan (Nama & Email) */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                        {item.user?.fullName?.charAt(0)?.toUpperCase() || 'K'}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                          {item.user?.fullName || 'Karyawan'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                          {item.user?.email || '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Divisi */}
                                  <td className="py-3.5 px-4">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      <Building className="h-3 w-3 text-slate-500" />
                                      <span>{item.user?.division?.name || 'Klinik Sativa'}</span>
                                    </span>
                                  </td>

                                  {/* Jenis Izin / Cuti */}
                                  <td className="py-3.5 px-4">
                                    <span className={cn(
                                      "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                      typeInfo.color
                                    )}>
                                      {typeInfo.label}
                                    </span>
                                  </td>

                                  {/* Periode & Durasi */}
                                  <td className="py-3.5 px-4">
                                    <div>
                                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                                        {formatDateOnly(item.startDate)} - {formatDateOnly(item.endDate)}
                                      </div>
                                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {item.totalDays} Hari Kalender
                                      </span>
                                    </div>
                                  </td>

                                  {/* Alasan Pengajuan */}
                                  <td className="py-3.5 px-4 max-w-xs">
                                    <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                                      {item.reason}
                                    </p>
                                  </td>

                                  {/* Status & Catatan Admin */}
                                  <td className="py-3.5 px-4 max-w-sm">
                                    <div className="space-y-1.5">
                                      {/* Status Badge */}
                                      {isPending && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                          <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                          </span>
                                          Menunggu ACC
                                        </span>
                                      )}

                                      {isApproved && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                          Disetujui (ACC)
                                        </span>
                                      )}

                                      {isRejected && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                          <XCircle className="h-3 w-3 text-rose-500" />
                                          Ditolak
                                        </span>
                                      )}

                                      {/* Catatan Admin / HR */}
                                      {item.adminNotes ? (
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                                            <MessageSquare className="h-3 w-3 text-sky-500 shrink-0 mt-0.5" />
                                            <span className="italic font-medium">{item.adminNotes}</span>
                                          </div>
                                          {item.reviewedBy && (
                                            <p className="text-[10px] text-slate-400 mt-1 pl-4.5">
                                              Oleh: {item.reviewedBy.fullName} {item.reviewedAt ? `• ${formatDateTime(item.reviewedAt)}` : ''}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-slate-400 italic">
                                          Belum ada catatan admin
                                        </p>
                                      )}
                                    </div>
                                  </td>

                                  {/* Tindakan HR */}
                                  <td className="py-3.5 px-4 text-center">
                                    {isPending ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReview(item, 'APPROVE')}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm inline-flex items-center gap-1 transition-all"
                                          title="Setujui permohonan izin ini"
                                        >
                                          <Check className="h-3 w-3" />
                                          <span>ACC</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReview(item, 'REJECT')}
                                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold shadow-sm inline-flex items-center gap-1 transition-all"
                                          title="Tolak permohonan izin ini"
                                        >
                                          <X className="h-3 w-3" />
                                          <span>Tolak</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview(item, item.status)}
                                        className="px-2.5 py-1.5 rounded-lg saas-button text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                                        title="Ubah keputusan atau perbarui catatan admin"
                                      >
                                        <MessageSquare className="h-3 w-3 text-sky-500" />
                                        <span>Ubah / Catatan</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Info Permohonan */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span>
                        Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredLeavesList.length}</strong> dari <strong className="text-slate-800 dark:text-slate-200">{leavesData.stats.total}</strong> permohonan izin cuti.
                      </span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                        <span>Seluruh persetujuan dan penolakan tercatat dalam audit log HR klinik.</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ========================================================
             TAB 6: JADWAL SHIFT & TRANSAKSI TUKAR SHIFT (BULK SETUP & QUERYRUNNER APPROVAL)
             ======================================================== */}
          {sidebarNav === 'schedules' && (
            <AdminScheduleManagement />
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
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
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
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
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
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
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
              className="saas-card p-6 w-full max-w-lg bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
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

        {/* MODAL 5: TINJAU / ACC / TOLAK PERMOHONAN IZIN & CUTI DENGAN CATATAN */}
        {reviewModalOpen && selectedLeaveForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-lg bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Keputusan Permohonan Izin / Cuti
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tentukan keputusan ACC atau Tolak dengan catatan resmi HR
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Ringkasan Pengajuan Karyawan */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedLeaveForReview.user?.fullName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ({selectedLeaveForReview.user?.division?.name || 'Klinik Sativa'})
                    </span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                    getLeaveTypeInfo(selectedLeaveForReview.leaveType).color
                  )}>
                    {getLeaveTypeInfo(selectedLeaveForReview.leaveType).label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    <strong>Periode:</strong> {formatDateOnly(selectedLeaveForReview.startDate)} - {formatDateOnly(selectedLeaveForReview.endDate)}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">
                    {selectedLeaveForReview.totalDays} Hari
                  </span>
                </div>

                <div className="text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-500 font-semibold">Alasan Karyawan: </span>
                  <span className="italic font-medium">"{selectedLeaveForReview.reason}"</span>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Pilihan Keputusan: ACC vs TOLAK */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-2">
                    Pilih Keputusan HR:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewAction('APPROVE')}
                      className={cn(
                        "p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                        reviewAction === 'APPROVE'
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg mt-0.5",
                        reviewAction === 'APPROVE' ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">ACC / Setujui</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Izin disetujui & jadwal shift disesuaikan</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewAction('REJECT')}
                      className={cn(
                        "p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                        reviewAction === 'REJECT'
                          ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 shadow-sm ring-1 ring-rose-500"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg mt-0.5",
                        reviewAction === 'REJECT' ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        <X className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Tolak Permohonan</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Izin ditolak disertai alasan jelas</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Input Catatan Tambahan Admin/HR */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1 flex items-center justify-between">
                    <span>Catatan Tambahan Admin / HR:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tersimpan dalam log transparansi</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      reviewAction === 'APPROVE'
                        ? 'Contoh: Disetujui HR. Shift klinik telah dialihkan dan dikoordinasikan dengan supervisor...'
                        : 'Contoh: Mohon maaf, permohonan belum dapat disetujui karena jadwal tindakan klinik penuh...'
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl p-3 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Catatan ini akan langsung tertera di tabel permohonan beserta nama Anda sebagai reviewer.
                  </p>
                </div>

                {/* Tombol Form */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className={cn(
                      "px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm",
                      reviewAction === 'APPROVE'
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-rose-600 hover:bg-rose-500"
                    )}
                  >
                    {reviewLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : reviewAction === 'APPROVE' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Simpan & ACC Permohonan</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" />
                        <span>Simpan & Tolak Permohonan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 6: BUAT PENGAJUAN IZIN / CUTI BARU OLEH HR */}
        {createLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="saas-card p-6 w-full max-w-lg bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    <FolderPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Buat Permohonan Cuti Baru
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Catat pengajuan izin/cuti karyawan langsung ke dalam sistem klinik
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateLeaveModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateLeave} className="space-y-4">
                {/* Pilih Karyawan */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Pilih Karyawan Klinik *
                  </label>
                  <select
                    value={newLeaveEmployeeId}
                    onChange={(e) => setNewLeaveEmployeeId(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {employeesData.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} &bull; {emp.divisionName || emp.division?.name || 'Karyawan'} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih Jenis Permohonan */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Jenis Izin / Cuti *
                  </label>
                  <select
                    value={newLeaveType}
                    onChange={(e) => setNewLeaveType(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  >
                    <option value="cuti_tahunan">Cuti Tahunan (Tahunan Reguler)</option>
                    <option value="izin_sakit">Izin Sakit (Surat Dokter)</option>
                    <option value="izin_keperluan_pribadi">Izin Keperluan Pribadi / Keluarga</option>
                    <option value="cuti_melahirkan">Cuti Melahirkan / Persalinan</option>
                    <option value="izin_khusus">Izin Khusus / Lainnya</option>
                  </select>
                </div>

                {/* Periode Tanggal (Mulai & Selesai) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Tanggal Mulai *
                    </label>
                    <input
                      type="date"
                      value={newLeaveStartDate}
                      onChange={(e) => setNewLeaveStartDate(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Tanggal Selesai *
                    </label>
                    <input
                      type="date"
                      value={newLeaveEndDate}
                      onChange={(e) => setNewLeaveEndDate(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Alasan Pengajuan */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Alasan Pengajuan Cuti / Izin *
                  </label>
                  <textarea
                    rows={2}
                    value={newLeaveReason}
                    onChange={(e) => setNewLeaveReason(e.target.value)}
                    required
                    placeholder="Tuliskan keterangan keperluan cuti/izin karyawan..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl p-3 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                {/* Status Awal & Catatan Admin */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Status Awal Permohonan:
                    </label>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="initialStatus"
                          value="PENDING"
                          checked={newLeaveInitialStatus === 'PENDING'}
                          onChange={() => setNewLeaveInitialStatus('PENDING')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Menunggu ACC (Pending)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="initialStatus"
                          value="APPROVED"
                          checked={newLeaveInitialStatus === 'APPROVED'}
                          onChange={() => setNewLeaveInitialStatus('APPROVED')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Langsung Disetujui (ACC)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Catatan Awal HR (Opsional):
                    </label>
                    <input
                      type="text"
                      value={newLeaveAdminNotes}
                      onChange={(e) => setNewLeaveAdminNotes(e.target.value)}
                      placeholder="Contoh: Diajukan via HR, berkas fisik telah diverifikasi."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateLeaveModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createLeaveLoading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {createLeaveLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Simpan Permohonan Izin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 7: EDIT NAMA DIVISI */}
        {editingDivision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-teal-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Nama Divisi</h3>
                </div>
                <button
                  onClick={() => setEditingDivision(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {editDivisionMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  editDivisionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {editDivisionMsg.text}
                </div>
              )}

              <form onSubmit={handleEditDivision} className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Nama Divisi
                  </label>
                  <input
                    type="text"
                    value={editDivisionName}
                    onChange={(e) => setEditDivisionName(e.target.value)}
                    required
                    placeholder="Contoh: Perawat, Beautician, Front Office, dll."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-teal-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingDivision(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editDivisionLoading}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {editDivisionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 8: HAPUS DIVISI */}
        {deletingDivision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Divisi</h3>
                  <p className="text-xs text-slate-500">Divisi: &quot;{deletingDivision.name}&quot;</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                Apakah Anda yakin ingin menghapus divisi <strong>{deletingDivision.name}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingDivision(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteDivisionLoading}
                  onClick={handleDeleteDivision}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {deleteDivisionLoading ? 'Menghapus...' : 'Ya, Hapus Divisi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 9: PINDAH DIVISI KARYAWAN */}
        {reassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Ubah Divisi Karyawan</h3>
                </div>
                <button
                  onClick={() => setReassignModal(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {reassignMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  reassignMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {reassignMsg.text}
                </div>
              )}

              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="text-slate-500">Karyawan: <strong className="text-slate-900 dark:text-white">{reassignModal.employeeName}</strong></p>
                <p className="text-slate-500">Divisi Saat Ini: <strong className="text-indigo-600 dark:text-indigo-400">{reassignModal.currentDivisionName}</strong></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Pilih Divisi Baru
                  </label>
                  <select
                    value={targetDivisionId}
                    onChange={(e) => setTargetDivisionId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  >
                    <option value="">-- Tanpa Divisi --</option>
                    {divisionsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.userCount || 0} staf)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReassignModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={reassignLoading}
                    onClick={() => handleReassignDivision(reassignModal.employeeId, targetDivisionId)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {reassignLoading ? 'Menyimpan...' : 'Simpan Divisi'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 10: TUGASKAN STAF KE DIVISI (ATURAN 1 DIVISI MIN 1 KARYAWAN) */}
        {quickAssignDivision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="saas-card p-6 w-full max-w-md bg-white dark:bg-[#111c27] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-teal-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tugaskan Staf ke Divisi</h3>
                </div>
                <button
                  onClick={() => setQuickAssignDivision(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {quickAssignMsg && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                  quickAssignMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {quickAssignMsg.text}
                </div>
              )}

              <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs">
                <p className="text-teal-800 dark:text-teal-200">
                  Target Divisi: <strong className="font-bold">{quickAssignDivision.name}</strong>
                </p>
                <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
                  Pilih salah satu staf untuk ditugaskan ke divisi ini agar memenuhi aturan minimal 1 karyawan.
                </p>
              </div>

              <form onSubmit={handleQuickAssignStaffToDivision} className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 text-xs font-medium mb-1">
                    Pilih Staf yang Ditugaskan
                  </label>
                  <select
                    value={selectedStaffIdToAssign}
                    onChange={(e) => setSelectedStaffIdToAssign(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-teal-500 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                  >
                    <option value="">-- Pilih Staf --</option>
                    {(employeesData?.employees || []).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.divisionName || 'Tanpa Divisi'}) - {emp.role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const divId = quickAssignDivision.id;
                      setQuickAssignDivision(null);
                      setInviteDivisionId(divId);
                      setShowInviteModal(true);
                    }}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    + Atau Undang Karyawan Baru
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAssignDivision(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={quickAssignLoading || !selectedStaffIdToAssign}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {quickAssignLoading ? 'Menugaskan...' : 'Tugaskan Sekarang'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}
