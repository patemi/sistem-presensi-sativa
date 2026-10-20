'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import idTranslations from '../../locales/id.json';
import enTranslations from '../../locales/en.json';

type Translations = typeof idTranslations;
type Locale = 'id' | 'en';

interface LanguageContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');
  const [translations, setTranslations] = useState<Translations>(idTranslations);

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale === 'id' || savedLocale === 'en') {
      setLocaleState(savedLocale);
      setTranslations(savedLocale === 'id' ? idTranslations : enTranslations);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setTranslations(newLocale === 'id' ? idTranslations : enTranslations);
    localStorage.setItem('locale', newLocale);
  };

  // Helper function to get translation values nested (e.g. "auth.login_title")
  const t = (key: string): string => {
    try {
      const keys = key.split('.');
      let val: any = translations;
      for (const k of keys) {
        val = val[k];
        if (val === undefined) break;
      }
      return typeof val === 'string' ? val : key;
    } catch {
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
