import { createContext, useContext } from 'react';
import type { AppSettings, Lang, Currency } from '@/lib/types';

export interface SettingsCtx extends AppSettings {
  setLang: (l: Lang) => void;
  setPrivacyMode: (v: boolean) => void;
  setAlertDays: (v: number) => void;
  setCurrency: (v: Currency) => void;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  lang: 'he',
  privacyMode: false,
  alertDays: 7,
  currency: 'ILS',
};

export const SettingsContext = createContext<SettingsCtx>({
  ...SETTINGS_DEFAULTS,
  setLang: () => {},
  setPrivacyMode: () => {},
  setAlertDays: () => {},
  setCurrency: () => {},
});

export function useSettings(): SettingsCtx {
  return useContext(SettingsContext);
}
