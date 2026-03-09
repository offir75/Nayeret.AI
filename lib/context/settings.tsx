import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppSettings, Lang, Currency } from '@/lib/types';
import { translations, type TranslationKey } from '@/lib/vault/translations';

export interface SettingsCtx extends AppSettings {
  setLang: (l: Lang) => void;
  setPrivacyMode: (v: boolean) => void;
  setAlertDays: (v: number) => void;
  setCurrency: (v: Currency) => void;
  /** Translate a key using the current language. Falls back to the key string. */
  t: (key: string) => string;
  /** True when the current language is right-to-left (Hebrew). */
  isRtl: boolean;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  lang: 'he',
  privacyMode: false,
  alertDays: 7,
  currency: 'ILS',
};

function defaultT(key: string): string {
  const entry = translations[key as TranslationKey];
  if (!entry) return key;
  return entry['he'] ?? key;
}

export const SettingsContext = createContext<SettingsCtx>({
  ...SETTINGS_DEFAULTS,
  setLang: () => {},
  setPrivacyMode: () => {},
  setAlertDays: () => {},
  setCurrency: () => {},
  t: defaultT,
  isRtl: true, // default to Hebrew (RTL)
});

export function useSettings(): SettingsCtx {
  return useContext(SettingsContext);
}

/**
 * Alias for useSettings(). Provides the same interface as command-center's
 * useLanguage() hook, enabling ported components to work with a single
 * import-path change.
 */
export function useLanguage(): SettingsCtx {
  return useContext(SettingsContext);
}

/**
 * App-level provider that manages settings state and persists to localStorage.
 * Used in pages/_app.tsx so all pages (e.g. /capture) have access to settings.
 * pages/index.tsx wraps its own inner provider that overrides this one.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [alertDays, setAlertDaysState] = useState(7);
  const [currency, setCurrencyState] = useState<Currency>('ILS');

  // Read persisted settings (client-side only)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}') as Partial<AppSettings>;
      if (saved.lang === 'he' || saved.lang === 'en') setLangState(saved.lang);
      if (typeof saved.privacyMode === 'boolean') setPrivacyModeState(saved.privacyMode);
      if (typeof saved.alertDays === 'number' && saved.alertDays >= 1 && saved.alertDays <= 14) setAlertDaysState(saved.alertDays);
      if (saved.currency === 'ILS' || saved.currency === 'USD') setCurrencyState(saved.currency);
    } catch {}
  }, []);

  const save = (patch: Partial<AppSettings>) => {
    try {
      const current = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}') as Partial<AppSettings>;
      localStorage.setItem('vaultSettings', JSON.stringify({ ...current, ...patch }));
    } catch {}
  };

  const setLang = (l: Lang) => { setLangState(l); save({ lang: l }); };
  const setPrivacyMode = (v: boolean) => { setPrivacyModeState(v); save({ privacyMode: v }); };
  const setAlertDays = (v: number) => { setAlertDaysState(v); save({ alertDays: v }); };
  const setCurrency = (v: Currency) => { setCurrencyState(v); save({ currency: v }); };

  const ctx: SettingsCtx = {
    lang, setLang, privacyMode, setPrivacyMode, alertDays, setAlertDays, currency, setCurrency,
    t: (key: string) => translations[key as TranslationKey]?.[lang] ?? key,
    isRtl: lang === 'he',
  };

  return <SettingsContext.Provider value={ctx}>{children}</SettingsContext.Provider>;
}
