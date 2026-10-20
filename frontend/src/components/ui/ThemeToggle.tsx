'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-xl border border-slate-700/60 bg-slate-800/40 flex items-center justify-center opacity-60 ${className}`}>
        <Moon className="h-4 w-4 text-slate-400" />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
      aria-label="Toggle Theme"
      className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-200 ${
        isDark
          ? 'bg-[#111c27] hover:bg-[#1a2938] border-slate-700/80 text-amber-300 hover:text-amber-200 hover:border-amber-400/40 shadow-sm'
          : 'bg-white hover:bg-slate-100 border-slate-300 text-sky-600 hover:text-sky-700 shadow-sm'
      } ${className}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -45, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 45, scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Sun className="h-4 w-4 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
        ) : (
          <Moon className="h-4 w-4 drop-shadow-[0_0_6px_rgba(2,132,199,0.3)]" />
        )}
      </motion.div>
    </button>
  );
}
