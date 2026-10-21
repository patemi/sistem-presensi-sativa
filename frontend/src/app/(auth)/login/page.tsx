'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Mail, Lock, ShieldAlert, Sparkles, Droplets, Eye, EyeOff, KeyRound, Sparkle } from 'lucide-react';
import { motion } from 'framer-motion';

function LoginContent() {
  const { login, user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loginMode, setLoginMode] = useState<'standard' | 'invite'>('standard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMsg(t('auth.register_success'));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!email || !password) {
      setErrorMsg('Semua kolom harus diisi / All fields are required');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Periksa kembali email dan kata sandi/kode undangan Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center py-10 px-4 font-sans relative transition-colors duration-200">
      {/* Top Action Controls: Theme Toggle & Language Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <ThemeToggle />
        <SwitchLanguage />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md pt-8 sm:pt-0"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3 shadow-sm">
            <Droplets className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            SATIVA
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium max-w-xs leading-relaxed">
            Presensi & Monitoring Kesehatan Tim Klinik Kecantikan
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-[#111c27] border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 md:p-8">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 mb-5 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginMode('standard');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                loginMode === 'standard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kata Sandi
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('invite');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'invite'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Kode Undangan</span>
            </button>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {loginMode === 'invite' ? 'Masuk via Kode Undangan Karyawan' : t('auth.login_title')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              {loginMode === 'invite'
                ? 'Gunakan email Anda dan kode undangan yang dikirimkan oleh HR ke email Anda.'
                : t('auth.login_subtitle')}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-red-950/80 border border-rose-200 dark:border-red-800/80 text-rose-700 dark:text-red-300 text-xs font-medium">
              <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-medium mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@belajarvibe.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password or Invite Code Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {loginMode === 'invite' ? 'Kode Undangan / Sandi Awal' : 'Kata Sandi'}
                </label>
                {loginMode === 'invite' && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Dari HR
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {loginMode === 'invite' ? <KeyRound className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <input
                  id="login-password-input"
                  type={showPassword || loginMode === 'invite' ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginMode === 'invite' ? 'Contoh: KLINIK-SATIVA-2026' : t('auth.password_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-10 py-2.5 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500 font-mono tracking-wider shadow-sm"
                  required
                />
                {loginMode === 'standard' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className={`w-full mt-2 text-white text-xs font-semibold py-3 flex items-center justify-center gap-2 rounded-xl disabled:opacity-50 transition-all ${
                loginMode === 'invite'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/30'
                  : 'bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-900/20'
              }`}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{loginMode === 'invite' ? 'Masuk dengan Kode Undangan' : t('common.login')}</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom links */}
          <div className="mt-6 text-center border-t border-slate-200 dark:border-slate-800 pt-5">
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              {t('auth.no_account')}{' '}
              <Link
                href="/register"
                className="text-sky-600 dark:text-sky-400 font-semibold hover:text-sky-500 transition-colors ml-1"
              >
                {t('auth.register_now')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b131d]">
        <div className="h-8 w-8 border-2 border-slate-300 dark:border-slate-700 border-t-sky-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
