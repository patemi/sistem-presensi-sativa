'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, ShieldAlert, Sparkles, Droplets, Ticket, Building, User, Users, Shield } from 'lucide-react';
import api from '@/lib/api';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [inviteCode, setInviteCode] = useState('');
  const [isInviteValid, setIsInviteValid] = useState(false);
  const [orgData, setOrgData] = useState<{ organizationName: string; divisions: {id: string, name: string}[] } | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'karyawan' | 'hr' | 'owner'>('karyawan');
  const [divisionId, setDivisionId] = useState('');
  
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'karyawan') {
        router.push('/checkin');
      } else if (user.role === 'hr') {
        router.push('/dashboard');
      } else {
        router.push('/owner-dashboard');
      }
    }
  }, [user, router]);

  const handleValidateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    
    setValidating(true);
    setErrorMsg('');
    
    try {
      const res = await api.get(`/auth/validate-invite/${inviteCode}`);
      setOrgData(res.data);
      setIsInviteValid(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Kode undangan tidak valid');
      setIsInviteValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!fullName || !email || !password) {
      setErrorMsg('Semua kolom bertanda bintang (*) wajib diisi');
      return;
    }
    
    try {
      await register({
        fullName,
        email,
        password,
        inviteCode,
        role,
        divisionId: role === 'karyawan' && divisionId ? divisionId : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-12 px-4 bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-500/10 dark:bg-[rgba(160,212,228,0.2)] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 dark:bg-[rgba(31,62,83,0.5)] rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Row */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2.5">
        <ThemeToggle />
        <SwitchLanguage />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-sky-50 dark:bg-white/10 border border-sky-200 dark:border-white/10 flex items-center justify-center shadow-sm mb-4 transform hover:scale-105 transition-transform duration-300">
            <Droplets className="h-8 w-8 text-sky-600 dark:text-[#a0d4e4]" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            {t('common.app_name')}
          </h1>
          <p className="text-slate-600 dark:text-[#a0d4e4] text-sm font-medium max-w-xs">
            {t('common.tagline')}
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 mb-2">
              <UserPlus className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
              {t('auth.register_title')}
            </h2>
            <p className="text-slate-500 dark:text-[#a0d4e4] text-xs leading-relaxed">
              Pendaftaran akun baru di bawah organisasi BelajarVibe Corporate.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-red-900/30 border border-rose-200 dark:border-red-500/30 text-rose-700 dark:text-red-200 text-xs font-medium">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isInviteValid ? (
            <form onSubmit={handleValidateInvite} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                  Kode Undangan Organisasi * / Invite Code *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Ticket className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                  </span>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Contoh: BV-SATIVA-2026"
                    className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-[rgba(255,255,255,0.3)] uppercase shadow-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={validating || !inviteCode}
                className="w-full mt-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest shadow-md shadow-sky-900/20 transition-all"
              >
                {validating ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Validasi Kode
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="p-3 mb-4 rounded-xl bg-sky-50 dark:bg-[rgba(160,212,228,0.1)] border border-sky-200 dark:border-[#a0d4e4]/30 flex items-center gap-3">
                <Building className="h-8 w-8 text-sky-600 dark:text-[#a0d4e4]" />
                <div>
                  <p className="text-xs text-sky-700 dark:text-[#a0d4e4] uppercase tracking-wider font-semibold">Organisasi / Company</p>
                  <p className="text-sm text-slate-900 dark:text-white font-bold">{orgData?.organizationName}</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.fullname_placeholder')}
                    className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-[rgba(255,255,255,0.3)] shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                  Email *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder')}
                    className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-[rgba(255,255,255,0.3)] shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                  Kata Sandi * / Password *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-[rgba(255,255,255,0.3)] shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                  Peran Akun * / Role *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors appearance-none [&>option]:bg-white dark:[&>option]:bg-[#102636] [&>option]:text-slate-900 dark:[&>option]:text-white shadow-sm"
                  >
                    <option value="karyawan">{t('common.role_employee')}</option>
                    <option value="hr">{t('common.role_hr')}</option>
                    <option value="owner">{t('common.role_owner')}</option>
                  </select>
                </div>
              </div>

              {/* Division Selection Dropdown (Only for Karyawan role) */}
              {role === 'karyawan' && (
                <div className="animate-fade-in">
                  <label className="block text-slate-700 dark:text-[#a0d4e4] text-xs font-semibold mb-2 uppercase tracking-wider">
                    Divisi (Opsional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Users className="h-4 w-4 text-slate-400 dark:text-[#a0d4e4]" />
                    </span>
                    <select
                      value={divisionId}
                      onChange={(e) => setDivisionId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] focus:border-sky-500 text-slate-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-colors appearance-none [&>option]:bg-white dark:[&>option]:bg-[#102636] [&>option]:text-slate-900 dark:[&>option]:text-white shadow-sm"
                    >
                      <option value="">Pilih Divisi...</option>
                      {orgData?.divisions.map((div) => (
                        <option key={div.id} value={div.id}>
                          {div.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest shadow-md shadow-sky-900/20 transition-all"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    {t('common.register')}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom links */}
          <div className="mt-8 text-center border-t border-slate-200 dark:border-white/10 pt-6">
            <p className="text-slate-500 dark:text-white/60 text-xs">
              {t('auth.already_have_account')}{' '}
              <Link
                href="/login"
                className="text-sky-600 dark:text-[#a0d4e4] font-bold hover:text-sky-700 dark:hover:text-white transition-colors duration-200 ml-1"
              >
                {t('auth.login_now')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
