import React, { createContext, useContext, useMemo } from 'react';
import { Language, translate } from '../i18n/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  children: React.ReactNode;
}

export function LanguageProvider({ language, onLanguageChange, children }: LanguageProviderProps) {
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: onLanguageChange,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      t: (key: string) => translate(key, language),
    }),
    [language, onLanguageChange]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so any component rendered outside the provider (e.g.
    // during a brief pre-hydration state) doesn't crash — defaults to
    // English/LTR rather than throwing.
    return {
      language: 'en',
      setLanguage: () => {},
      dir: 'ltr',
      t: (key: string) => translate(key, 'en'),
    };
  }
  return ctx;
}
