import { useLanguage } from '../lib/context/LanguageContext';

export function useTranslation() {
  const { t, locale, setLocale } = useLanguage();
  return { t, locale, setLocale };
}
