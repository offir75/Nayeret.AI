import { FiSettings, FiUser } from 'react-icons/fi';
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
    en: 'Cards show English summaries. Layout is left-to-right.',
    he: 'הכרטיסים מציגים סיכומים בעברית. הפריסה מימין לשמאל.',
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
};
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
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

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  bill:             { label: 'Bill',             color: 'bg-blue-100 text-blue-800 border-blue-200' },
  financial_report: { label: 'Financial Report', color: 'bg-green-100 text-green-800 border-green-200' },
  receipt:          { label: 'Receipt',          color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  insurances:       { label: 'Insurance',        color: 'bg-purple-100 text-purple-800 border-purple-200' },
  identification:   { label: 'ID / Passport',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
  other:            { label: 'Other',            color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function typeConfig(type: string) {
  return TYPE_CONFIG[type.toLowerCase()] ?? TYPE_CONFIG['other'];
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
  const { label, color } = typeConfig(type);
  return (
    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

function AlertBadge({ alert }: { alert: 'overdue' | 'due-soon' }) {
  return alert === 'overdue' ? (
    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-300">
      Overdue
    </span>
  ) : (
    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-300">
      Due Soon
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
  const { currency, privacyMode } = useSettings();
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
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
      {totalAssets > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Total Assets</p>
          <p className={`text-2xl font-bold text-green-800 mt-0.5 ${blurCls}`} title={privacyMode ? 'Hover to reveal' : undefined}>
            {fmtMoney(totalAssets, symbol)}
          </p>
          <p className="text-xs text-green-500 mt-0.5">Across all financial reports</p>
        </div>
      )}
      {totalBills > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Pending Bills</p>
          <p className={`text-2xl font-bold text-blue-800 mt-0.5 ${blurCls}`} title={privacyMode ? 'Hover to reveal' : undefined}>
            {fmtMoney(totalBills, symbol)}
          </p>
          <p className="text-xs text-blue-500 mt-0.5">All bills combined · rate 1 USD = {USD_TO_ILS} ILS</p>
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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                  <FiUser className="w-5 h-5" />
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
          <p className="text-xs text-gray-300">LifeVault v0.7 · Supabase Auth enabled</p>
        </div>
      </div>
    </>
  );
}

// ─── Vault Card ───────────────────────────────────────────────────────────────

function VaultCard({
  doc,
  onDelete,
  token,
}: {
  doc: VaultDoc;
  onDelete: (id: string) => void;
  token: string;
}) {
  const { lang, alertDays, currency } = useSettings();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const symbol = currency === 'ILS' ? '₪' : '$';
  const summary = lang === 'he' ? doc.summary_he : doc.summary_en;
  const metaEntries = Object.entries(doc.raw_analysis ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );

  const dueAlert =
    doc.document_type === 'bill' ? getDueAlert(doc.raw_analysis?.due_date, alertDays) : null;
  const liquid = isLiquid(doc);

  const cardBorder = liquid
    ? 'border-yellow-400 bg-yellow-50'
    : dueAlert === 'overdue'
    ? 'border-red-300'
    : 'border-gray-200';

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: doc.id }),
    });
    if (res.ok) {
      onDelete(doc.id);
    } else {
      alert('Failed to delete document.');
      setDeleting(false);
    }
  };

  return (
    <div className={`border rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors ${cardBorder}`}>
      {liquid && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1 tracking-wide">
          💰 Liquidity Available
        </div>
      )}

      <div className={`px-4 pt-4 pb-3 border-b ${liquid ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-gray-800 truncate flex-1" title={doc.file_name}>
            📄 {doc.file_name}
          </p>
          <TypeBadge type={doc.document_type} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            {new Date(doc.created_at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
          {dueAlert && <AlertBadge alert={dueAlert} />}
        </div>
      </div>

      <div className={`px-4 py-3 flex-1 ${liquid ? 'bg-yellow-50' : 'bg-white'}`}>
        {summary ? (
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No summary available</p>
        )}
      </div>

      {metaEntries.length > 0 && (
        <div className={`border-t ${liquid ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white'}`}>
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-black/5 transition-colors"
          >
            <span className="font-medium">Details</span>
            <span>{detailsOpen ? '▲' : '▼'}</span>
          </button>
          {detailsOpen && (
            <table className="w-full text-xs" dir="ltr">
              <tbody>
                {metaEntries.map(([key, value]) => {
                  const rawStr = String(value);
                  const isMoney = SENSITIVE_KEYS.has(key) && !isNaN(Number(value));
                  let displayStr = rawStr;
                  if (isMoney) {
                    const converted = convertAmount(
                      Number(value),
                      String(doc.raw_analysis?.currency ?? 'ILS'),
                      currency
                    );
                    displayStr = fmtMoney(converted, symbol);
                  }
                  return (
                    <tr key={key} className="border-t border-gray-100">
                      <td className="py-1 pl-4 pr-2 text-gray-500 font-medium capitalize w-2/5">
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td className="py-1 pr-4 text-gray-800">
                        {SENSITIVE_KEYS.has(key) ? (
                          <PrivateValue value={displayStr} />
                        ) : (
                          displayStr
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={`px-4 py-2 border-t flex justify-end ${liquid ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white'}`}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting…' : '🗑 Delete'}
        </button>
      </div>
    </div>
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
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ text: 'Only PDF files are supported.', ok: false });
      return;
    }

    setUploading(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result?.toString().split(',')[1];
        if (!base64) throw new Error('Could not read file');

        // Get the latest token for this request
        const { data: { session: fresh } } = await supabase.auth.getSession();
        const token = fresh?.access_token ?? '';

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, filename: file.name }),
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          throw new Error(d.error ?? 'Upload failed');
        }

        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ filename: file.name }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok || !analyzeData.success) {
          throw new Error(analyzeData.error ?? 'Analysis failed');
        }

        const newDoc: VaultDoc = {
          id: analyzeData.supabaseId,
          file_name: file.name,
          document_type: analyzeData.document_type ?? 'other',
          summary_he: analyzeData.summary_he ?? null,
          summary_en: analyzeData.summary_en ?? null,
          raw_analysis: analyzeData.raw_metadata ?? null,
          created_at: new Date().toISOString(),
        };
        setDocs((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
        setStatus({ text: `✓ "${file.name}" analyzed and saved.`, ok: true });
      } catch (err) {
        setStatus({ text: `✗ ${err instanceof Error ? err.message : 'Unknown error'}`, ok: false });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

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
      <div className="min-h-screen bg-gray-50" dir={lang === 'he' ? 'rtl' : 'ltr'}>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onLogout={handleLogout}
        />

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">LifeVault</h1>
            <p className="text-xs text-gray-400">
              {lang === 'he' ? 'מנהל מסמכים חכם' : 'AI-powered document manager'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" />
                  <span>{lang === 'he' ? 'מנתח…' : 'Analyzing…'}</span>
                </>
              ) : (
                lang === 'he' ? '+ העלה PDF' : '+ Upload PDF'
              )}
            </button>

            {/* User avatar (clickable → opens settings) */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                  {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                </div>
              )}
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          {/* Status banner */}
          {status && (
            <div
              className={`mb-5 px-4 py-2.5 rounded-lg text-sm border ${
                status.ok
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {status.text}
            </div>
          )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <VaultCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                  token={session?.access_token ?? ''}
                />
              ))}
            </div>
          ) : (
            <EmptyState isSearch={search.length > 0} />
          )}
        </main>
      </div>
    </SettingsContext.Provider>
  );
}
