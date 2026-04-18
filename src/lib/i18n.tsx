'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Translations = Record<string, string>;

const en: Translations = {
  'dashboard.title': 'Dashboard',
  'dashboard.overview': 'overview',
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.appearance': 'Appearance',
};

const es: Translations = {
  'dashboard.title': 'Tablero',
  'dashboard.overview': 'visión general',
  'settings.title': 'Configuraciones',
  'settings.profile': 'Perfil',
  'settings.appearance': 'Apariencia',
};

const translations: Record<string, Translations> = { en, es };

type I18nContextType = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_locale');
    if (saved && translations[saved]) setLocale(saved);
  }, []);

  const handleSetLocale = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem('app_locale', newLocale);
  };

  const t = (key: string) => {
    return translations[locale]?.[key] || translations['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
