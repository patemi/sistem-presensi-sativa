'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Check,
  Copy,
  ScanFace,
  UserX,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export interface NotificationData {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  badge?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  // Detail highlights (parsed or manual)
  biometricScore?: string;
  conflictUser?: string;
  rawText?: string;
  // Prompt support
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  onPromptConfirm?: (val: string) => void;
}

interface NotificationModalProps {
  notification: NotificationData | null;
  onClose: () => void;
}

export default function NotificationModal({
  notification,
  onClose,
}: NotificationModalProps) {
  const [copied, setCopied] = useState(false);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (notification?.isPrompt) {
      setPromptValue(notification.promptDefaultValue || '');
    } else {
      setPromptValue('');
    }
  }, [notification]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!notification) return;
      if (e.key === 'Escape') {
        if (notification.onCancel) {
          notification.onCancel();
        }
        onClose();
      } else if (e.key === 'Enter' && !notification.isPrompt) {
        if (notification.onConfirm) {
          notification.onConfirm();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notification, onClose]);

  if (!notification) return null;

  const {
    type = 'info',
    title,
    message,
    badge,
    confirmText = 'Saya Mengerti',
    cancelText,
    onConfirm,
    onCancel,
    biometricScore,
    conflictUser,
    isPrompt,
    promptPlaceholder,
    onPromptConfirm,
  } = notification;

  const handleConfirm = () => {
    if (isPrompt && onPromptConfirm) {
      onPromptConfirm(promptValue);
    } else if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleCopyDetails = () => {
    const textToCopy = `${title}\n${message}${
      biometricScore ? `\nKemiripan: ${biometricScore}` : ''
    }${conflictUser ? `\nAkun Terkait: ${conflictUser}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color mappings based on notification type
  const themeStyles = {
    error: {
      accentBorder: 'border-rose-500/30 dark:border-rose-500/40',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconBg: 'bg-gradient-to-br from-rose-500/20 to-red-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30',
      glow: 'shadow-[0_0_50px_-12px_rgba(244,63,94,0.35)]',
      btnGradient:
        'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-500/25',
      icon: <ShieldAlert className="w-8 h-8" />,
      defaultBadge: 'Verifikasi Keamanan',
    },
    warning: {
      accentBorder: 'border-amber-500/30 dark:border-amber-500/40',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30',
      glow: 'shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)]',
      btnGradient:
        'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/25',
      icon: <AlertTriangle className="w-8 h-8" />,
      defaultBadge: 'Konfirmasi Tindakan',
    },
    success: {
      accentBorder: 'border-emerald-500/30 dark:border-emerald-500/40',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30',
      glow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]',
      btnGradient:
        'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25',
      icon: <CheckCircle2 className="w-8 h-8" />,
      defaultBadge: 'Berhasil Diverifikasi',
    },
    info: {
      accentBorder: 'border-sky-500/30 dark:border-sky-500/40',
      badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      iconBg: 'bg-gradient-to-br from-sky-500/20 to-indigo-500/10 text-sky-500 dark:text-sky-400 border-sky-500/30',
      glow: 'shadow-[0_0_50px_-12px_rgba(14,165,233,0.3)]',
      btnGradient:
        'bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25',
      icon: <Info className="w-8 h-8" />,
      defaultBadge: 'Informasi SATIVA',
    },
  }[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        {/* Backdrop click to dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancelText ? handleCancel : handleConfirm}
          className="fixed inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative w-full max-w-md bg-white dark:bg-[#102636] border ${themeStyles.accentBorder} ${themeStyles.glow} rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden z-10`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Top Glow Accent */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
              type === 'error'
                ? 'bg-rose-500'
                : type === 'warning'
                ? 'bg-amber-500'
                : type === 'success'
                ? 'bg-emerald-500'
                : 'bg-sky-500'
            }`}
          />

          {/* Close button top right */}
          <button
            type="button"
            onClick={cancelText ? handleCancel : handleConfirm}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon & Badge Header */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 ${themeStyles.iconBg} shadow-inner`}
            >
              {themeStyles.icon}
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border mb-2 ${themeStyles.badgeBg}`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{badge || themeStyles.defaultBadge}</span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {title}
            </h3>
          </div>

          {/* Body Content */}
          <div className="mt-4 space-y-3 text-center">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
              {message}
            </p>

            {/* Prompt Input Area */}
            {isPrompt && (
              <div className="mt-3 text-left">
                <textarea
                  rows={3}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={promptPlaceholder || 'Tulis keterangan di sini...'}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-slate-100 placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            )}

            {/* Special Highlights for Biometric Duplicate or Security issues */}
            {(biometricScore || conflictUser) && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 text-left space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ScanFace className="w-3.5 h-3.5 text-rose-500" />
                  <span>Rincian Hasil Pindai Kamera:</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {biometricScore && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400">Tingkat Kesamaan:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {biometricScore}
                      </span>
                    </div>
                  )}

                  {conflictUser && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5 text-amber-500" />
                        <span>Akun Terdaftar:</span>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {conflictUser}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-normal pt-1">
                  💡 Kebijakan Klinik: 1 wajah hanya diizinkan untuk 1 akun pengguna demi mencegah titip absen / joki presensi.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Section */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
            {/* Optional Copy details (hanya jika bukan prompt/confirm) */}
            {!cancelText && (biometricScore || conflictUser || type === 'error') && (
              <button
                type="button"
                onClick={handleCopyDetails}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="Salin pesan untuk dilaporkan ke HR"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            )}

            {cancelText && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {cancelText}
              </button>
            )}

            {/* Primary Action Button (The Professional Notification Button) */}
            <button
              type="button"
              onClick={handleConfirm}
              autoFocus={!isPrompt}
              className={`w-full ${
                cancelText ? 'sm:flex-1' : 'sm:flex-1'
              } px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer ${themeStyles.btnGradient}`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
