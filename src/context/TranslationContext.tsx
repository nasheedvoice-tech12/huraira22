import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocaleCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

export interface LocaleOption {
  code: LocaleCode;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  flag: string;
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  { code: 'en', name: 'English (US)', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'ur', name: 'Urdu (Pakistan)', nativeName: 'اردو', dir: 'rtl', flag: '🇵🇰' },
  { code: 'ar', name: 'Arabic (Middle East)', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', flag: '🇨🇳' },
];

interface TranslationContextType {
  locale: LocaleCode;
  setLocale: (loc: LocaleCode) => void;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
  availableLocales: LocaleOption[];
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always lock application interface language to English (US/UK)
  const locale: LocaleCode = 'en';
  const isRTL = false;

  useEffect(() => {
    try {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      document.documentElement.classList.remove('rtl-active');
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (loc: LocaleCode) => {
    // No-op: the application UI always remains English
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS.en;
    if (dict && typeof dict[key] === 'string' && dict[key].trim() !== '') {
      return dict[key];
    }
    return fallback || key;
  };

  return (
    <TranslationContext.Provider
      value={{
        locale,
        setLocale,
        isRTL,
        t,
        availableLocales: AVAILABLE_LOCALES,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
