'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = (e?: any) => {
      let scrollY = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );

      // Cek apakah ada container internal (misal main atau div) yang memiliki scrollTop
      if (e?.target && typeof e.target.scrollTop === 'number') {
        scrollY = Math.max(scrollY, e.target.scrollTop);
      }

      const mainEl = document.querySelector('main');
      if (mainEl && mainEl.scrollTop) {
        scrollY = Math.max(scrollY, mainEl.scrollTop);
      }

      // Tombol langsung aktif saat layar di-scroll lebih dari 40px
      setIsVisible(scrollY > 40);
    };

    // Pengecekan saat pertama komponen dimount
    checkScroll();

    // 1. Event listener lengkap
    window.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    document.addEventListener('scroll', checkScroll, { capture: true, passive: true });
    window.addEventListener('touchmove', checkScroll, { capture: true, passive: true });
    window.addEventListener('wheel', checkScroll, { capture: true, passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    // 2. Interval polling berkala (300ms) agar selalu sinkron jika user menggunakan emulator/iframe HP
    const interval = setInterval(checkScroll, 300);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', checkScroll, { capture: true });
      document.removeEventListener('scroll', checkScroll, { capture: true });
      window.removeEventListener('touchmove', checkScroll, { capture: true });
      window.removeEventListener('wheel', checkScroll, { capture: true });
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      document.documentElement?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      document.body?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          key="scroll-to-top-btn"
          id="scroll-to-top-button"
          initial={{ opacity: 0, scale: 0.3, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.3, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={scrollToTop}
          type="button"
          aria-label="Kembali ke paling atas"
          title="Scroll ke Paling Atas"
          /* bottom-24 pada mobile agar mengapung aman di atas Next.js dev overlay indicator (icon N merah) */
          className="fixed bottom-24 right-5 sm:bottom-8 sm:right-8 z-[99999] flex items-center justify-center h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 text-white shadow-2xl shadow-sky-600/70 hover:shadow-sky-500/90 border-2 border-white/60 dark:border-sky-300/50 hover:scale-110 active:scale-90 transition-all duration-200 backdrop-blur-md cursor-pointer group ring-4 ring-sky-500/25"
        >
          <ArrowUp className="h-6 w-6 stroke-[3] group-hover:-translate-y-1 transition-transform duration-200" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
