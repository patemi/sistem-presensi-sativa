'use client';

import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function SwitchLanguage() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center space-x-1 p-1 rounded-full bg-slate-800/60 backdrop-blur-md border border-slate-700/50 shadow-lg shadow-indigo-500/5">
      <button
        onClick={() => setLocale('id')}
        className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
          locale === 'id'
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25 scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        ID
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
          locale === 'en'
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25 scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        EN
      </button>
    </div>
  );
}
