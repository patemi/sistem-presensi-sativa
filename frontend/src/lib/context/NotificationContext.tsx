'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationModal, {
  NotificationData,
  NotificationType,
} from '@/components/ui/NotificationModal';

export interface ShowNotificationOptions {
  type?: NotificationType;
  title?: string;
  message: string;
  badge?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  biometricScore?: string;
  conflictUser?: string;
}

export interface ShowConfirmOptions {
  title: string;
  message: string;
  badge?: string;
  confirmText?: string;
  cancelText?: string;
  type?: NotificationType;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ShowPromptOptions {
  title: string;
  message: string;
  badge?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  type?: NotificationType;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

interface NotificationContextProps {
  showNotification: (options: ShowNotificationOptions | string) => void;
  closeNotification: () => void;
  showAlert: (message: string, title?: string, type?: NotificationType) => void;
  showConfirm: (options: ShowConfirmOptions) => void;
  showPrompt: (options: ShowPromptOptions) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

/**
 * Intelligent message parser that analyzes text patterns and extracts
 * structured insights (e.g. biometric similarity scores, user account names, error titles)
 */
function parseMessageDetails(
  raw: string,
  explicitType?: NotificationType,
  explicitTitle?: string
): NotificationData {
  let type: NotificationType = explicitType || 'info';
  let title = explicitTitle || '';
  let badge = '';
  let biometricScore: string | undefined;
  let conflictUser: string | undefined;
  let cleanMessage = raw;

  // 1. Detect Biometric Face Rejection pattern
  if (
    raw.includes('Registrasi Wajah Ditolak') ||
    raw.includes('kemiripan biometrik') ||
    raw.includes('Wajah ini terdeteksi identik')
  ) {
    type = 'error';
    title = title || 'Registrasi Wajah Ditolak';
    badge = 'Anti-Joki & Validasi Wajah';

    // Extract score
    const scoreMatch = raw.match(/(\d+%\s*kemiripan\s*biometrik)/i);
    if (scoreMatch) {
      biometricScore = scoreMatch[1];
    }

    // Extract user account
    const userMatch = raw.match(/atas\s*nama\s*"([^"]+)"(?:\s*\(([^)]+)\))?/i);
    if (userMatch) {
      conflictUser = userMatch[2]
        ? `${userMatch[1]} (${userMatch[2]})`
        : userMatch[1];
    }
  } else if (
    raw.toLowerCase().includes('gagal') ||
    raw.toLowerCase().includes('ditolak') ||
    raw.toLowerCase().includes('tidak valid') ||
    raw.toLowerCase().includes('error')
  ) {
    type = explicitType || 'error';
    title = title || 'Terjadi Kendala';
    badge = badge || 'Pemberitahuan Sistem';
  } else if (
    raw.toLowerCase().includes('peringatan') ||
    raw.toLowerCase().includes('perhatian') ||
    raw.toLowerCase().includes('terkunci') ||
    raw.toLowerCase().includes('lebih dari 1')
  ) {
    type = explicitType || 'warning';
    title = title || 'Peringatan Presensi';
    badge = badge || 'Validasi Kamera & Lokasi';
  } else if (
    raw.toLowerCase().includes('berhasil') ||
    raw.toLowerCase().includes('disimpan') ||
    raw.toLowerCase().includes('sukses') ||
    raw.toLowerCase().includes('lolos')
  ) {
    type = explicitType || 'success';
    title = title || 'Berhasil';
    badge = badge || 'Status Terverifikasi';
  }

  // Remove leading duplicate prefix if title already reflects it
  if (cleanMessage.startsWith('Registrasi Wajah Ditolak:')) {
    cleanMessage = cleanMessage.replace(/^Registrasi Wajah Ditolak:\s*/i, '');
  }

  return {
    type,
    title: title || (type === 'error' ? 'Pemberitahuan' : 'Informasi'),
    message: cleanMessage,
    badge: badge || undefined,
    biometricScore,
    conflictUser,
    confirmText: 'Saya Mengerti',
  };
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showNotification = useCallback(
    (options: ShowNotificationOptions | string) => {
      if (typeof options === 'string') {
        const parsed = parseMessageDetails(options);
        setNotification(parsed);
      } else {
        const parsed = parseMessageDetails(
          options.message,
          options.type,
          options.title
        );

        setNotification({
          ...parsed,
          badge: options.badge || parsed.badge,
          confirmText: options.confirmText || parsed.confirmText || 'Saya Mengerti',
          cancelText: options.cancelText,
          onConfirm: options.onConfirm,
          onCancel: options.onCancel,
          biometricScore: options.biometricScore || parsed.biometricScore,
          conflictUser: options.conflictUser || parsed.conflictUser,
        });
      }
    },
    []
  );

  const showAlert = useCallback(
    (message: string, title?: string, type?: NotificationType) => {
      const parsed = parseMessageDetails(message, type, title);
      setNotification(parsed);
    },
    []
  );

  const showConfirm = useCallback((options: ShowConfirmOptions) => {
    setNotification({
      type: options.type || 'warning',
      title: options.title,
      message: options.message,
      badge: options.badge || 'Konfirmasi Tindakan',
      confirmText: options.confirmText || 'Ya, Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, []);

  const showPrompt = useCallback((options: ShowPromptOptions) => {
    setNotification({
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      badge: options.badge || 'Input Keterangan',
      confirmText: options.confirmText || 'Kirim',
      cancelText: options.cancelText || 'Batal',
      isPrompt: true,
      promptPlaceholder: options.placeholder,
      promptDefaultValue: options.defaultValue,
      onPromptConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        closeNotification,
        showAlert,
        showConfirm,
        showPrompt,
      }}
    >
      {children}
      <NotificationModal
        notification={notification}
        onClose={closeNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
}
