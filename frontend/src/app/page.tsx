'use client';

import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import SwitchLanguage from '@/components/ui/SwitchLanguage';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { 
  Sparkles, Shield, UserCheck, CalendarDays, 
  BrainCircuit, ArrowRight, Droplets, CheckCircle, 
  MapPin, LogIn, LogOut
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-50 dark:bg-[#0b131d] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-sky-500/10 dark:bg-[rgba(160,212,228,0.15)] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-teal-500/10 dark:bg-[rgba(31,62,83,0.5)] rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <header className="w-full bg-white/80 dark:bg-[#102636]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 z-20 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-white/10 border border-sky-200 dark:border-white/10 flex items-center justify-center shadow-sm">
              <Droplets className="h-5 w-5 text-sky-600 dark:text-[#a0d4e4]" />
            </div>
            <span className="font-extrabold text-xl tracking-widest text-slate-900 dark:text-white uppercase">
              {t('common.app_name')}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <SwitchLanguage />
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md uppercase tracking-wider transition-colors"
            >
              {t('common.login')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 pt-8 pb-16 flex flex-col items-center justify-center z-10 flex-1 text-center">
        {/* Centered Copy */}
        <div className="w-full space-y-8 flex flex-col items-center">
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white heading-display">
            {t('landing.hero_title_1')} <br />
            <span className="text-sky-600 dark:text-sky-400">
              {t('landing.hero_title_2')}
            </span>
          </h1>
          
          <p className="text-slate-600 dark:text-white/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium">
            {t('landing.hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full max-w-md mx-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-sky-900/20 transform hover:-translate-y-1 transition-all duration-300"
            >
              {t('landing.start_attendance')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Three Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-200 dark:border-white/10 w-full max-w-3xl mx-auto mt-8">
            <div className="text-center">
              <div className="text-sky-600 dark:text-[#a0d4e4] font-bold text-xl md:text-2xl flex justify-center items-center gap-2">
                <CalendarDays className="h-6 w-6" />
                <span>&lt;30s</span>
              </div>
              <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] uppercase font-bold tracking-widest mt-2">{t('landing.pillar_fast_title')}</p>
            </div>
            <div className="text-center">
              <div className="text-sky-600 dark:text-[#a0d4e4] font-bold text-xl md:text-2xl flex justify-center items-center gap-2">
                <Shield className="h-6 w-6" />
                <span>AES-256</span>
              </div>
              <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] uppercase font-bold tracking-widest mt-2">{t('landing.pillar_privacy_title')}</p>
            </div>
            <div className="text-center">
              <div className="text-sky-600 dark:text-[#a0d4e4] font-bold text-xl md:text-2xl flex justify-center items-center gap-2">
                <UserCheck className="h-6 w-6" />
                <span>Min. 5</span>
              </div>
              <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] uppercase font-bold tracking-widest mt-2">{t('landing.pillar_limit_title')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-white/10 py-6 text-center z-10 bg-white/60 dark:bg-transparent">
        <p className="text-slate-500 dark:text-[#a0d4e4] text-[10px] font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {t('common.app_name')} &bull; {t('landing.footer_text')}
        </p>
      </footer>
    </div>
  );
}
