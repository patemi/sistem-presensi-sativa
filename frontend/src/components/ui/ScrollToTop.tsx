'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-[#a0d4e4]/40 text-sky-600 dark:text-[#a0d4e4] hover:text-sky-700 dark:hover:text-white hover:bg-sky-50 dark:hover:bg-[#a0d4e4]/20 shadow-xl hover:scale-110 transition-all duration-300 z-50 group backdrop-blur-md"
      title="Kembali ke Atas"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
}
