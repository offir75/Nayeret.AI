import Head from 'next/head';
import { FiSettings } from 'react-icons/fi';
// Extend translations for settings panel
// ─── Translations ───────────────────────────────────────────────────────────
const translations = {
  emptyVault: {
    en: 'Your vault is empty.',
    he: 'הכספת שלך ריקה',
  },
  uploadFirst: {
    en: 'Upload your first bill, report, or receipt to get started.',
    he: 'העלה את החשבון, הדו"ח או הקבלה הראשונים שלך כדי להתחיל',
  },
  noMatch: {
    en: 'No documents match your search.',
    he: 'לא נמצאו מסמכים התואמים לחיפוש שלך',
  },
  settings: {
    en: 'Settings',
    he: 'הגדרות',
  },
  profile: {
    en: 'Profile',
    he: 'פרופיל',
  },
  logout: {
    en: 'Log Out',
    he: 'התנתק',
  },
  dashboardLang: {
    en: 'Dashboard Language',
    he: 'שפת לוח הבקרה',
  },
  dashboardLangDesc: {
    en: 'Table shows English summaries. Layout is left-to-right.',
    he: 'הטבלה מציגה סיכומים בעברית. הפריסה מימין לשמאל.',
  },
  privacy: {
    en: 'Privacy',
    he: 'פרטיות',
  },
  blurSensitive: {
    en: 'Blur sensitive amounts',
    he: 'טשטש סכומים רגישים',
  },
  privacyDesc: {
    en: 'Hides balances, amounts, and fees. Hover over any value to reveal it.',
    he: 'מסתיר יתרות, סכומים ודמי ניהול. רחף כדי לחשוף.',
  },
  alertThreshold: {
    en: 'Alert Threshold',
    he: 'סף התראה',
  },
  days: {
    en: 'days',
    he: 'ימים',
  },
  day: {
    en: 'day',
    he: 'יום',
  },
  alertDesc: {
    en: 'Show a "Due Soon" badge this many days before a bill\'s due date.',
    he: 'הצג תג "לתשלום בקרוב" מספר ימים לפני מועד החשבון.',
  },
  currency: {
    en: 'Preferred Currency',
    he: 'מטבע מועדף',
  },
  ils: {
    en: '₪ ILS',
    he: '₪ שקל',
  },
  usd: {
    en: '$ USD',
    he: '$ דולר',
  },
  currencyDesc: {
    en: `Amounts in the summary bar are converted at a static rate: 1 USD = 3.70 ILS.`,
    he: 'הסכומים בסרגל הסיכום מומרות לפי שער קבוע: 1 דולר = 3.70 ש"ח.',
  },
  potentialClaim: {
    en: 'Potential Claim',
    he: 'תביעה פוטנציאלית',
  },
  analyzing: {
    en: 'Analyzing…',
    he: 'מנתח…',
  },
  progressFailed: {
    en: 'Failed:',
    he: 'נכשל:',
  },
  addDocuments: {
    en: '+ Add Documents',
    he: '+ הוסף מסמכים',
  },
  selectFiles: {
    en: 'Select Files',
    he: 'בחר קבצים',
  },
  selectFolder: {
    en: 'Select Folder',
    he: 'בחר תיקייה',
  },
  totalAssets: {
    en: 'Total Assets',
    he: 'סה"כ נכסים',
  },
  totalAssetsDesc: {
    en: 'Across all financial reports',
    he: 'בכל הדוחות הפיננסיים',
  },
  pendingBills: {
    en: 'Pending Bills',
    he: 'חשבונות לתשלום',
  },
  pendingBillsDesc: {
    en: 'All bills combined · rate 1 USD = 3.70 ILS',
    he: 'כל החשבונות יחד · שער 1 דולר = 3.7 ש״ח',
  },
  dropOverlay: {
    en: 'Drop Documents into Nayeret.AI',
    he: 'שחרר מסמכים לתוך Nayeret.AI',
  },
  dropOverlayHint: {
    en: 'PDF, PNG, JPG, TIFF, BMP',
    he: 'PDF, PNG, JPG, TIFF, BMP',
  },
  colFilename:  { en: 'Filename',      he: 'שם קובץ'       },
  colCategory:  { en: 'Category',     he: 'קטגוריה'       },
  colAmount:    { en: 'Amount',       he: 'סכום'          },
  colDueDate:   { en: 'Due Date',     he: 'תאריך פירעון'  },
  colUploaded:  { en: 'Uploaded',     he: 'הועלה'         },
  colStatus:    { en: 'Status',       he: 'סטטוס'         },
  tableDetails: { en: 'Details',    he: 'פרטים' },
  tableSummary:     { en: 'Summary',           he: 'סיכום'        },
  mediaDescription: { en: 'Media Description', he: 'תיאור מדיה'   },
  mediaNote:        { en: 'This file was identified as non-document media.', he: 'קובץ זה זוהה כמדיה שאינה מסמך.' },
  deleteDoc:        { en: '🗑 Delete',              he: '🗑 מחק' },
  deletingDoc:      { en: 'Deleting…',              he: 'מוחק…' },
  confirmDeleteTitle: { en: 'Delete document?',     he: 'מחיקת מסמך?' },
  confirmDeleteBody:  { en: 'This cannot be undone.', he: 'פעולה זו אינה ניתנת לביטול.' },
  confirmCancel:    { en: 'Cancel',                 he: 'ביטול' },
  confirmDelete:    { en: 'Delete',                 he: 'מחק' },
  deleteFailMsg:    { en: 'Failed to delete document.', he: 'מחיקת המסמך נכשלה.' },
};
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';

// ─── Settings ─────────────────────────────────────────────────────────────────

type Lang = 'he' | 'en';
type Currency = 'ILS' | 'USD';

interface AppSettings {
  lang: Lang;
  privacyMode: boolean;
  alertDays: number;
  currency: Currency;
}

interface SettingsCtx extends AppSettings {
  setLang: (l: Lang) => void;
  setPrivacyMode: (v: boolean) => void;
  setAlertDays: (v: number) => void;
  setCurrency: (v: Currency) => void;
}

const DEFAULTS: AppSettings = { lang: 'he', privacyMode: false, alertDays: 7, currency: 'ILS' };

const SettingsContext = createContext<SettingsCtx>({
  ...DEFAULTS,
  setLang: () => {},
  setPrivacyMode: () => {},
  setAlertDays: () => {},
  setCurrency: () => {},
});

const useSettings = () => useContext(SettingsContext);

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaultDoc {
  id: string;
  file_name: string;
  document_type: string;
  summary_he: string | null;
  summary_en: string | null;
  raw_analysis: Record<string, unknown> | null;
  thumbnail_url: string | null;
  created_at: string;
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

const USD_TO_ILS = 3.70;

function convertAmount(amount: number, fromCurr: string, toCurr: Currency): number {
  const f = fromCurr.toUpperCase();
  if (f === toCurr) return amount;
  if (toCurr === 'USD') return amount / USD_TO_ILS;
  return amount * USD_TO_ILS;
}

function fmtMoney(n: number, symbol: string): string {
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Taxonomy config ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: { en: string; he: string }; color: string; emoji: string }> = {
  bill:             { label: { en: 'Bill',             he: 'חשבון'        }, color: 'bg-blue-100 text-blue-800 border-blue-200',    emoji: '🧾' },
  financial_report: { label: { en: 'Financial Report', he: 'דוח פיננסי'   }, color: 'bg-green-100 text-green-800 border-green-200',  emoji: '📊' },
  receipt:          { label: { en: 'Receipt',          he: 'קבלה'          }, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '🧾' },
  claim:            { label: { en: 'Claim',            he: 'תביעה'         }, color: 'bg-rose-100 text-rose-800 border-rose-200',    emoji: '📋' },
  insurance:        { label: { en: 'Insurance Policy', he: 'פוליסת ביטוח' }, color: 'bg-purple-100 text-purple-800 border-purple-200', emoji: '🛡' },
  identification:   { label: { en: 'Identity',         he: 'זיהוי'         }, color: 'bg-orange-100 text-orange-800 border-orange-200', emoji: '🪪' },
  other:            { label: { en: 'Other',            he: 'אחר'           }, color: 'bg-gray-100 text-gray-700 border-gray-200',    emoji: '📄' },
};

function typeConfig(type: string, lang: 'en' | 'he' = 'en') {
  const cfg = TYPE_CONFIG[type.toLowerCase()] ?? TYPE_CONFIG['other'];
  return { label: cfg.label[lang], color: cfg.color, emoji: cfg.emoji };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDueAlert(dateStr: unknown, alertDays: number): 'overdue' | 'due-soon' | null {
  if (typeof dateStr !== 'string' || !dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.floor((date.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= alertDays) return 'due-soon';
  return null;
}

function isLiquid(doc: VaultDoc): boolean {
  if (doc.document_type !== 'financial_report') return false;
  const d = doc.raw_analysis?.liquidity_date;
  if (typeof d !== 'string' || !d) return false;
  const date = new Date(d);
  return !isNaN(date.getTime()) && date <= new Date();
}

// ─── Sensitive-key list (Privacy Mode) ───────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'total_amount', 'total_balance', 'management_fee', 'premium_amount',
]);

// ─── Shared components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const { lang } = useSettings();
  const { label, color } = typeConfig(type, lang);
  return (
    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}


function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return size === 'lg' ? (
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  ) : (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

function PrivateValue({ value }: { value: string }) {
  const { privacyMode } = useSettings();
  if (!privacyMode) return <>{value}</>;
  return (
    <span
      className="blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none"
      title="Hover to reveal"
    >
      {value}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// ─── Total Asset Value bar ────────────────────────────────────────────────────

function VaultSummaryBar({ docs }: { docs: VaultDoc[] }) {
  const { currency, privacyMode, lang } = useSettings();
  const symbol = currency === 'ILS' ? '₪' : '$';

  let totalAssets = 0;
  let totalBills = 0;

  for (const doc of docs) {
    const ra = doc.raw_analysis;
    if (!ra) continue;
    if (doc.document_type === 'financial_report') {
      const n = Number(ra.total_balance);
      if (!isNaN(n) && n > 0) totalAssets += convertAmount(n, String(ra.currency ?? 'ILS'), currency);
    }
    if (doc.document_type === 'bill') {
      const n = Number(ra.total_amount);
      if (!isNaN(n) && n > 0) totalBills += convertAmount(n, String(ra.currency ?? 'ILS'), currency);
    }
  }

  if (totalAssets === 0 && totalBills === 0) return null;

  const blurCls = privacyMode
    ? 'blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none'
    : '';

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {totalAssets > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">{translations.totalAssets[lang]}</p>
          <p className={`text-2xl font-bold text-green-800 mt-0.5 ${blurCls}`} title={privacyMode ? 'Hover to reveal' : undefined}>
            {fmtMoney(totalAssets, symbol)}
          </p>
          <p className="text-xs text-green-500 mt-0.5">{translations.totalAssetsDesc[lang]}</p>
        </div>
      )}
      {totalBills > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{translations.pendingBills[lang]}</p>
          <p className={`text-2xl font-bold text-blue-800 mt-0.5 ${blurCls}`} title={privacyMode ? 'Hover to reveal' : undefined}>
            {fmtMoney(totalBills, symbol)}
          </p>
          <p className="text-xs text-blue-500 mt-0.5">{translations.pendingBillsDesc[lang]}</p>
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  isOpen,
  onClose,
  user,
  onLogout,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}) {
  const {
    lang, setLang,
    privacyMode, setPrivacyMode,
    alertDays, setAlertDays,
    currency, setCurrency,
  } = useSettings();

  const [avatarError, setAvatarError] = useState(false);

  if (!isOpen) return null;

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName[0].toUpperCase();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div
        className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FiSettings className="inline-block align-middle" />
            {translations.settings[lang]}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">

          {/* ── Profile ───────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {translations.profile[lang]}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0 select-none">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
                {user?.email && (
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                )}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              {translations.logout[lang]}
            </button>
          </section>

          {/* ── Language ──────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {translations.dashboardLang[lang]}
            </h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setLang('he')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  lang === 'he' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                עברית
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                  lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                English
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {translations.dashboardLangDesc[lang]}
            </p>
          </section>

          {/* ── Privacy Mode ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {translations.privacy[lang]}
            </h3>
            <Toggle
              checked={privacyMode}
              onChange={setPrivacyMode}
              label={translations.blurSensitive[lang]}
            />
            <p className="mt-2 text-xs text-gray-400">
              {translations.privacyDesc[lang]}
            </p>
          </section>

          {/* ── Alert Threshold ───────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {translations.alertThreshold[lang]}
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={14}
                value={alertDays}
                onChange={(e) => setAlertDays(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                {alertDays} {alertDays === 1 ? translations.day[lang] : translations.days[lang]}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>1 {translations.day[lang]}</span>
              <span>14 {translations.days[lang]}</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {translations.alertDesc[lang]}
            </p>
          </section>

          {/* ── Currency ──────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {translations.currency[lang]}
            </h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setCurrency('ILS')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  currency === 'ILS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {translations.ils[lang]}
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`flex-1 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                  currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {translations.usd[lang]}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {translations.currencyDesc[lang]}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-300">Nayeret.AI · Powered by Gemini + Supabase</p>
        </div>
      </div>
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isSearch }: { isSearch: boolean }) {
  const { lang } = useSettings();
  return (
    <div className="flex flex-col items-center justify-center mt-24 text-center gap-3">
      <div className="text-5xl">{isSearch ? '🔍' : '🗄️'}</div>
      <p className="text-gray-600 font-medium">
        {isSearch ? translations.noMatch[lang] : translations.emptyVault[lang]}
      </p>
      {!isSearch && (
        <p className="text-sm text-gray-400">{translations.uploadFirst[lang]}</p>
      )}
    </div>
  );
}

// ─── Supported file types ─────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'];

function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext));
}

// ─── Upload queue ─────────────────────────────────────────────────────────────

interface UploadJob {
  id: string;
  originalFile: File;
  resolvedName: string;
  status: 'queued' | 'analyzing' | 'done' | 'error';
  errorMsg?: string;
}

function resolveFilename(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext  = dot > 0 ? name.slice(dot) : '';
  return `${base}_${Date.now()}${ext}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString().split(',')[1];
      if (result) resolve(result);
      else reject(new Error('Could not read file'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BulkProgressBar({ queue }: { queue: UploadJob[] }) {
  const { lang } = useSettings();
  const done   = queue.filter(j => j.status === 'done' || j.status === 'error').length;
  const errors = queue.filter(j => j.status === 'error').length;
  const total  = queue.length;
  if (total === 0) return null;
  const pct     = Math.round((done / total) * 100);
  const allDone = done === total;

  const statusText = allDone
    ? errors > 0
      ? lang === 'he' ? `הסתיים — ${errors} שגיאות` : `Completed — ${errors} error${errors > 1 ? 's' : ''}`
      : lang === 'he' ? `✓ ${total} מסמכים נותחו` : `✓ ${total} document${total > 1 ? 's' : ''} analyzed`
    : lang === 'he' ? `מנתח ${done + 1} מתוך ${total}…` : `Analyzing ${done + 1} of ${total} document${total > 1 ? 's' : ''}…`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-6 py-3" dir="ltr">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">{statusText}</span>
          <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone && errors > 0 ? 'bg-red-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && errors > 0 && (
          <p className="text-xs text-red-500 mt-1">
            {translations.progressFailed[lang]} {queue.filter(j => j.status === 'error').map(j => j.resolvedName).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Ingestion Hub ────────────────────────────────────────────────────────────

function IngestionHub({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}) {
  const { lang } = useSettings();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const accepted = SUPPORTED_EXTENSIONS.join(',');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setOpen(false);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => isSupportedFile(f.name));
    if (files.length) onFiles(files);
    if (folderInputRef.current) folderInputRef.current.value = '';
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? (
          <>
            <Spinner size="sm" />
            <span>{translations.analyzing[lang]}</span>
          </>
        ) : (
          <>
            <span>{translations.addDocuments[lang]}</span>
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && !disabled && (
        <div className={`absolute top-full mt-1.5 ${lang === 'he' ? 'left-0' : 'right-0'} w-44 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-30`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            dir={lang === 'he' ? 'rtl' : 'ltr'}
          >
            <span>📄</span>
            <span>{translations.selectFiles[lang]}</span>
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            dir={lang === 'he' ? 'rtl' : 'ltr'}
          >
            <span>📁</span>
            <span>{translations.selectFolder[lang]}</span>
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept={accepted} multiple onChange={handleFileChange} className="hidden" />
      <input ref={folderInputRef} type="file" accept={accepted} multiple onChange={handleFolderChange} className="hidden" {...({ webkitdirectory: '' } as {})} />
    </div>
  );
}

// ─── Thumbnail generation helpers (client-side only) ─────────────────────────

async function renderPdfThumbnail(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const scale = 200 / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

async function renderImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(200 / img.width, 200 / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ─── Vault Table ──────────────────────────────────────────────────────────────

function DocumentModal({ doc, token, onClose }: { doc: VaultDoc; token: string; onClose: () => void }) {
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}`;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      <div
        className="flex items-center justify-between px-5 py-3 bg-black/60 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-white/80 truncate max-w-[80vw]">{doc.file_name}</span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-3xl leading-none ml-4"
          aria-label="Close"
        >×</button>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4" onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe
            src={fileUrl}
            title={doc.file_name}
            className="w-full max-w-4xl rounded shadow-2xl border-0"
            style={{ height: 'calc(100vh - 80px)' }}
          />
        ) : (
          <img
            src={fileUrl}
            alt={doc.file_name}
            className="max-h-[calc(100vh-80px)] max-w-full rounded shadow-2xl object-contain"
          />
        )}
      </div>
    </div>
  );
}

function ThumbnailCell({ doc, token }: { doc: VaultDoc; token: string }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});
  const thumbRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (doc.thumbnail_url && thumbRef.current) {
      const rect = thumbRef.current.getBoundingClientRect();
      const previewW = 250;
      const leftPos = rect.right + 10;
      const x = leftPos + previewW > window.innerWidth ? rect.left - previewW - 10 : leftPos;
      const y = Math.min(rect.top, window.innerHeight - 350);
      setPreviewStyle({ left: x, top: y, width: previewW });
    }
    setHovered(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const { color, emoji } = typeConfig(doc.document_type);
  const hasThumbnail = !!doc.thumbnail_url && !imgError;

  return (
    <>
      {showModal && (
        <DocumentModal doc={doc} token={token} onClose={() => setShowModal(false)} />
      )}
      <div
        ref={thumbRef}
        className="cursor-zoom-in flex-shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
        title={doc.file_name}
      >
        {hasThumbnail ? (
          <img
            src={doc.thumbnail_url!}
            alt=""
            className="w-10 h-14 object-cover rounded border border-gray-200 hover:border-indigo-300 transition-colors"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-10 h-10 rounded border flex items-center justify-center text-base select-none ${color}`}>
            {emoji}
          </div>
        )}
      </div>
      {hovered && hasThumbnail && (
        <div
          className="fixed z-50 rounded-xl overflow-hidden shadow-2xl border border-gray-200 pointer-events-none"
          style={previewStyle}
        >
          <img src={doc.thumbnail_url!} alt="" className="w-full" />
          <div className="bg-white/90 px-3 py-1.5 text-xs text-gray-500 truncate border-t border-gray-100">
            {doc.file_name}
          </div>
        </div>
      )}
    </>
  );
}

function ConfirmDialog({
  filename, onConfirm, onCancel,
}: {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { lang } = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {translations.confirmDeleteTitle[lang]}
        </h3>
        <p className="text-sm text-gray-500 mb-1 truncate" title={filename}>"{filename}"</p>
        <p className="text-sm text-red-500 mb-5">{translations.confirmDeleteBody[lang]}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {translations.confirmCancel[lang]}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
          >
            {translations.confirmDelete[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 shadow-lg animate-fade-in">
      <span>⚠️ {message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 font-bold leading-none">×</button>
    </div>
  );
}

function getValidationStatus(doc: VaultDoc): 'verified' | 'unsure' | 'missing' {
  const ra = doc.raw_analysis ?? {};
  if (ra.is_media) return 'unsure';
  if (!doc.summary_he && !doc.summary_en) return 'missing';
  switch (doc.document_type) {
    case 'bill':
      if (!ra.total_amount && !ra.provider) return 'missing';
      if (!ra.due_date) return 'unsure';
      break;
    case 'financial_report':
      if (!ra.total_balance) return 'unsure';
      break;
    case 'receipt':
      if (!ra.total_amount && !ra.merchant) return 'missing';
      break;
    case 'claim':
      if (!ra.total_amount && !ra.insurer) return 'missing';
      break;
    case 'insurance':
      if (!ra.insurer && !ra.policy_number) return 'missing';
      break;
    case 'identification':
      if (!ra.id_number && !ra.full_name) return 'missing';
      break;
  }
  return 'verified';
}

function ValidationDot({ doc }: { doc: VaultDoc }) {
  const { lang } = useSettings();
  const status = getValidationStatus(doc);
  const cfg = {
    verified: { cls: 'bg-green-500', tip: lang === 'he' ? 'מאומת'    : 'Verified' },
    unsure:   { cls: 'bg-amber-400', tip: lang === 'he' ? 'לא בטוח'  : 'AI Unsure' },
    missing:  { cls: 'bg-red-500',   tip: lang === 'he' ? 'חסר מידע' : 'Missing Data' },
  }[status];
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.cls}`}
      title={cfg.tip}
    />
  );
}

function VaultRow({
  doc, token, onDelete, expanded, onToggle, hasInsurance,
}: {
  doc: VaultDoc;
  token: string;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
  hasInsurance: boolean;
}) {
  const { lang, alertDays, currency, privacyMode } = useSettings();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ra = doc.raw_analysis ?? {};
  const dueAlert = doc.document_type === 'bill' ? getDueAlert(ra.due_date, alertDays) : null;
  const liquid = isLiquid(doc);
  const isPotentialClaim = doc.document_type === 'receipt' && hasInsurance;
  const symbol = currency === 'ILS' ? '₪' : '$';
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;

  const amount = (() => {
    const raw = Number(ra.total_amount ?? ra.total_balance);
    if (isNaN(raw) || raw === 0) return null;
    return fmtMoney(convertAmount(raw, String(ra.currency ?? 'ILS'), currency), symbol);
  })();

  const dueDateStr = (() => {
    const d = ra.due_date ?? ra.purchase_date ?? ra.claim_date ?? ra.liquidity_date;
    if (!d || typeof d !== 'string') return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const metaEntries = Object.entries(ra).filter(([, v]) => v !== null && v !== undefined && v !== '');

  const dots: Array<{ cls: string; tip: string }> = [];
  if (dueAlert === 'overdue') dots.push({ cls: 'bg-red-500', tip: lang === 'he' ? 'באיחור' : 'Overdue' });
  if (dueAlert === 'due-soon') dots.push({ cls: 'bg-amber-400', tip: lang === 'he' ? 'בקרוב' : 'Due Soon' });
  if (liquid) dots.push({ cls: 'bg-yellow-400', tip: lang === 'he' ? 'נזילות' : 'Liquidity' });
  if (isPotentialClaim) dots.push({ cls: 'bg-violet-500', tip: lang === 'he' ? 'תביעה' : 'Claim' });

  const rowBg = liquid
    ? 'bg-yellow-50 hover:bg-yellow-100'
    : dueAlert === 'overdue'
    ? 'bg-red-50 hover:bg-red-100'
    : expanded
    ? 'bg-indigo-50'
    : 'bg-white hover:bg-gray-50';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    setShowConfirm(false);
    setDeleting(true);
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: doc.id }),
    });
    if (res.ok) {
      onDelete(doc.id);
    } else {
      setDeleteError(translations.deleteFailMsg[lang]);
      setDeleting(false);
    }
  };

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          filename={doc.file_name}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {deleteError && (
        <ErrorToast message={deleteError} onDismiss={() => setDeleteError(null)} />
      )}
      <tr className={`cursor-pointer transition-colors border-b border-gray-100 ${rowBg}`} onClick={onToggle}>
        <td className="py-2 px-3 w-12">
          <ThumbnailCell doc={doc} token={token} />
        </td>
        <td className="py-2 px-3">
          <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]" title={doc.file_name}>
            {doc.file_name}
          </p>
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={doc.document_type} />
            <ValidationDot doc={doc} />
          </div>
        </td>
        <td className="py-2 px-3 text-sm text-end hidden sm:table-cell">
          {amount ? (
            privacyMode
              ? <PrivateValue value={amount} />
              : <span className="font-mono text-gray-700 tabular-nums">{amount}</span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="py-2 px-3 text-xs text-right hidden sm:table-cell text-gray-500">
          {dueDateStr ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="py-2 px-3 text-xs text-right hidden sm:table-cell text-gray-400 tabular-nums">
          {new Date(doc.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
        <td className="py-2 px-3">
          <div className="flex gap-1 justify-center">
            {dots.map((dot, i) => (
              <span key={i} className={`inline-block w-2 h-2 rounded-full ${dot.cls}`} title={dot.tip} />
            ))}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-t border-gray-200">
          <td colSpan={7} className="px-5 py-4">
            <div className="flex flex-col gap-3" dir={lang === 'he' ? 'rtl' : 'ltr'}>
              {ra.is_media ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {translations.mediaDescription[lang]}
                  </p>
                  <p className="text-sm text-gray-500 italic mb-1">{translations.mediaNote[lang]}</p>
                  {(doc.summary_he || doc.summary_en) && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {lang === 'he' ? (doc.summary_he || doc.summary_en) : (doc.summary_en || doc.summary_he)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {summary && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {translations.tableSummary[lang]}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
                    </div>
                  )}
                  {metaEntries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {translations.tableDetails[lang]}
                      </p>
                      <table className="w-full text-xs" dir="ltr">
                        <tbody>
                          {metaEntries.map(([key, value]) => {
                            const rawStr = String(value);
                            const isMoney = SENSITIVE_KEYS.has(key) && !isNaN(Number(value));
                            let displayStr = rawStr;
                            if (isMoney) {
                              displayStr = fmtMoney(
                                convertAmount(Number(value), String(ra.currency ?? 'ILS'), currency),
                                symbol,
                              );
                            }
                            return (
                              <tr key={key} className="border-t border-gray-100">
                                <td className="py-1 pr-3 text-gray-500 font-medium capitalize w-2/5">
                                  {key.replace(/_/g, ' ')}
                                </td>
                                <td className="py-1 text-gray-800">
                                  {SENSITIVE_KEYS.has(key) ? <PrivateValue value={displayStr} /> : displayStr}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1 transition-colors disabled:opacity-50"
                >
                  {deleting ? translations.deletingDoc[lang] : translations.deleteDoc[lang]}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortCol = 'name' | 'category' | 'amount' | 'due_date' | 'uploaded';

function SortIcon({ col, active, dir }: { col: SortCol; active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className={`inline-flex flex-col ml-1 leading-none ${active ? 'text-indigo-500' : 'text-gray-300'}`}>
      <svg viewBox="0 0 6 4" className={`w-2 h-2 ${active && dir === 'asc' ? 'text-indigo-600' : ''}`} fill="currentColor">
        <path d="M3 0L6 4H0L3 0Z" />
      </svg>
      <svg viewBox="0 0 6 4" className={`w-2 h-2 ${active && dir === 'desc' ? 'text-indigo-600' : ''}`} fill="currentColor">
        <path d="M3 4L0 0H6L3 4Z" />
      </svg>
    </span>
  );
}

function getDocAmount(doc: VaultDoc): number {
  const ra = doc.raw_analysis ?? {};
  const v = ra.total_amount ?? ra.total_balance ?? ra.premium_amount;
  return v !== undefined && v !== null ? Number(v) : -Infinity;
}

function getDocDueDate(doc: VaultDoc): number {
  const ra = doc.raw_analysis ?? {};
  const d = ra.due_date ?? ra.expiry_date ?? ra.liquidity_date ?? ra.claim_date ?? ra.purchase_date;
  if (!d) return Infinity;
  const t = new Date(String(d)).getTime();
  return isNaN(t) ? Infinity : t;
}

function sortDocs(docs: VaultDoc[], col: SortCol, dir: 'asc' | 'desc'): VaultDoc[] {
  const asc = dir === 'asc';
  return [...docs].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case 'name':     cmp = a.file_name.localeCompare(b.file_name); break;
      case 'category': cmp = a.document_type.localeCompare(b.document_type); break;
      case 'amount':   cmp = getDocAmount(a) - getDocAmount(b); break;
      case 'due_date': cmp = getDocDueDate(a) - getDocDueDate(b); break;
      case 'uploaded': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
    }
    return asc ? cmp : -cmp;
  });
}

function VaultTable({
  docs, token, onDelete,
}: {
  docs: VaultDoc[];
  token: string;
  onDelete: (id: string) => void;
}) {
  const { lang } = useSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('uploaded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const hasInsurance = docs.some((d) => d.document_type === 'insurances');

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = sortDocs(docs, sortCol, sortDir);

  const thBase = 'py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide select-none cursor-pointer hover:text-indigo-600 transition-colors';

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-12 py-3 px-3" />
            <th className={`${thBase} text-start`} onClick={() => handleSort('name')}>
              {translations.colFilename[lang]}
              <SortIcon col="name" active={sortCol === 'name'} dir={sortDir} />
            </th>
            <th className={thBase} onClick={() => handleSort('category')}>
              {translations.colCategory[lang]}
              <SortIcon col="category" active={sortCol === 'category'} dir={sortDir} />
            </th>
            <th className={`${thBase} text-end hidden sm:table-cell`} onClick={() => handleSort('amount')}>
              {translations.colAmount[lang]}
              <SortIcon col="amount" active={sortCol === 'amount'} dir={sortDir} />
            </th>
            <th className={`${thBase} text-end hidden sm:table-cell`} onClick={() => handleSort('due_date')}>
              {translations.colDueDate[lang]}
              <SortIcon col="due_date" active={sortCol === 'due_date'} dir={sortDir} />
            </th>
            <th className={`${thBase} text-end hidden sm:table-cell`} onClick={() => handleSort('uploaded')}>
              {translations.colUploaded[lang]}
              <SortIcon col="uploaded" active={sortCol === 'uploaded'} dir={sortDir} />
            </th>
            <th className="py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide text-center">
              {translations.colStatus[lang]}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((doc) => (
            <VaultRow
              key={doc.id}
              doc={doc}
              token={token}
              onDelete={onDelete}
              expanded={expandedId === doc.id}
              onToggle={() => toggle(doc.id)}
              hasInsurance={hasInsurance}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── App settings ───────────────────────────────────────────────────────────
  const [lang, setLangState] = useState<Lang>('he');
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [alertDays, setAlertDaysState] = useState(7);
  const [currency, setCurrencyState] = useState<Currency>('ILS');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [search, setSearch] = useState('');

  // ── Persist helpers ────────────────────────────────────────────────────────

  const saveSettings = (patch: Partial<AppSettings>) => {
    try {
      const current: Partial<AppSettings> = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}');
      localStorage.setItem('vaultSettings', JSON.stringify({ ...current, ...patch }));
    } catch {}
  };

  // ── Auth: init + subscribe ─────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setAuthLoading(false);
      if (!s) router.replace('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) router.replace('/login');
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Settings: hydrate from localStorage ────────────────────────────────────

  useEffect(() => {
    try {
      const saved: Partial<AppSettings> = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}');
      if (saved.lang === 'he' || saved.lang === 'en') setLangState(saved.lang);
      if (typeof saved.privacyMode === 'boolean') setPrivacyModeState(saved.privacyMode);
      if (typeof saved.alertDays === 'number' && saved.alertDays >= 1 && saved.alertDays <= 14)
        setAlertDaysState(saved.alertDays);
      if (saved.currency === 'ILS' || saved.currency === 'USD') setCurrencyState(saved.currency);
    } catch {}
  }, []);

  // ── Settings setters ────────────────────────────────────────────────────────

  const setLang = (l: Lang) => { setLangState(l); saveSettings({ lang: l }); };
  const setPrivacyMode = (v: boolean) => { setPrivacyModeState(v); saveSettings({ privacyMode: v }); };
  const setAlertDays = (v: number) => { setAlertDaysState(v); saveSettings({ alertDays: v }); };
  const setCurrency = (v: Currency) => { setCurrencyState(v); saveSettings({ currency: v }); };

  // ── Load library (only once user is authenticated) ─────────────────────────

  useEffect(() => {
    if (!user || !session) return;
    setLoadingLibrary(true);
    fetch('/api/documents', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoadingLibrary(false));
  // Re-fetch when the user identity changes (e.g. switching accounts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange fires and router.replace('/login') is called
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    if (!session) return;
    const supported = files.filter(f => isSupportedFile(f.name));
    if (supported.length === 0) return;

    // Deduplicate against existing docs and within the batch itself
    const existingNames = new Set(docs.map(d => d.file_name));
    const jobs: UploadJob[] = supported.map((file) => {
      const resolved = resolveFilename(file.name, existingNames);
      existingNames.add(resolved);
      return { id: Math.random().toString(36).slice(2), originalFile: file, resolvedName: resolved, status: 'queued' as const };
    });

    setUploadQueue(prev => [...prev, ...jobs]);

    for (const job of jobs) {
      setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'analyzing' } : j));
      try {
        const { data: { session: fresh } } = await supabase.auth.getSession();
        const token = fresh?.access_token ?? '';
        const base64 = await readFileAsBase64(job.originalFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, filename: job.resolvedName }),
        });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error ?? 'Upload failed');

        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ filename: job.resolvedName }),
        });
        const d = await analyzeRes.json();
        if (!analyzeRes.ok || !d.success) throw new Error(d.error ?? 'Analysis failed');

        const supabaseId: string = d.supabaseId;
        const newDoc: VaultDoc = {
          id: supabaseId,
          file_name: job.resolvedName,
          document_type: d.document_type ?? 'other',
          summary_he: d.summary_he ?? null,
          summary_en: d.summary_en ?? null,
          raw_analysis: d.raw_metadata ?? null,
          thumbnail_url: null,
          created_at: new Date().toISOString(),
        };
        setDocs(prev => [newDoc, ...prev.filter(p => p.id !== supabaseId)]);
        setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' } : j));

        // Generate and upload thumbnail (non-blocking)
        if (supabaseId) {
          const ext = job.resolvedName.split('.').pop()?.toLowerCase() ?? '';
          const thumbPromise = ext === 'pdf'
            ? renderPdfThumbnail(job.originalFile)
            : renderImageThumbnail(job.originalFile);
          thumbPromise
            .then(base64 => fetch('/api/thumbnail', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ documentId: supabaseId, thumbnailBase64: base64 }),
            }))
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.thumbnailUrl) {
                setDocs(prev => prev.map(doc =>
                  doc.id === supabaseId ? { ...doc, thumbnail_url: data.thumbnailUrl } : doc
                ));
              }
            })
            .catch(() => {}); // silent — icon fallback shown
        }
      } catch (err) {
        setUploadQueue(prev => prev.map(j => j.id === job.id
          ? { ...j, status: 'error', errorMsg: err instanceof Error ? err.message : 'Unknown error' }
          : j));
      }
    }

    // Auto-dismiss the progress bar after 4 s
    const jobIds = new Set(jobs.map(j => j.id));
    setTimeout(() => setUploadQueue(prev => prev.filter(j => !jobIds.has(j.id))), 4000);
  };

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tiff'],
      'image/bmp': ['.bmp'],
    },
    noClick: true,
    noKeyboard: true,
  });

  const isUploading = uploadQueue.some(j => j.status === 'queued' || j.status === 'analyzing');

  const handleDelete = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const q = search.toLowerCase();
  const filtered = docs.filter(
    (d) =>
      d.file_name.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      String(d.raw_analysis?.provider ?? '').toLowerCase().includes(q)
  );

  // ── Auth loading gate ──────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Router is handling the redirect; render nothing to avoid flash
  if (!user) return null;

  const ctx: SettingsCtx = {
    lang, setLang,
    privacyMode, setPrivacyMode,
    alertDays, setAlertDays,
    currency, setCurrency,
  };

  return (
    <SettingsContext.Provider value={ctx}>
      <Head><title>Nayeret.AI</title></Head>
      <div {...getRootProps()} className="min-h-screen bg-gray-50" dir={lang === 'he' ? 'rtl' : 'ltr'}>

        {/* Drag-over overlay */}
        {isDragActive && (
          <div className="fixed inset-0 z-50 bg-indigo-600/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-dashed border-indigo-400 px-12 py-10 text-center">
              <div className="text-5xl mb-3">📂</div>
              <p className="text-xl font-bold text-indigo-700">
                {translations.dropOverlay[lang]}
              </p>
              <p className="text-sm text-indigo-500 mt-1">{translations.dropOverlayHint[lang]}</p>
            </div>
          </div>
        )}

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onLogout={handleLogout}
        />

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gray-900">Nayeret</span><span className="text-indigo-600">.AI</span>
            </h1>
            <p className="text-xs text-gray-400">
              {lang === 'he' ? 'מנהל מסמכים חכם' : 'AI-powered document manager'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IngestionHub onFiles={handleFiles} disabled={isUploading} />

            {/* User avatar — display only */}
            <div className="shrink-0">
              {user.user_metadata?.avatar_url && !headerAvatarError ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                  onError={() => setHeaderAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm select-none">
                  {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Gear icon — opens settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title={lang === 'he' ? 'הגדרות' : 'Settings'}
            >
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          {/* Total Asset Value summary bar */}
          {!loadingLibrary && <VaultSummaryBar docs={docs} />}

          {/* Search */}
          <div className="mb-5">
            <input
              type="text"
              placeholder={lang === 'he' ? 'חיפוש לפי שם קובץ, סוג, או ספק…' : 'Search by filename, type, or provider…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Library */}
          {loadingLibrary ? (
            <div className="flex flex-col items-center justify-center mt-24 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-400">{lang === 'he' ? 'טוען כספת…' : 'Loading vault…'}</p>
            </div>
          ) : filtered.length > 0 ? (
            <VaultTable
              docs={filtered}
              token={session?.access_token ?? ''}
              onDelete={handleDelete}
            />
          ) : (
            <EmptyState isSearch={search.length > 0} />
          )}
        </main>
      </div>
        <BulkProgressBar queue={uploadQueue} />
    </SettingsContext.Provider>
  );
}
