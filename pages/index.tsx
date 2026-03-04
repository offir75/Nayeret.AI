import Head from 'next/head';
import { Settings, ChevronDown, ChevronUp, Plus, TrendingUp, Receipt, FileText, Trash2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// ─── Translations ───────────────────────────────────────────────────────────
const translations = {
  emptyVault: { en: 'Your vault is empty.', he: 'הכספת שלך ריקה' },
  uploadFirst: { en: 'Upload your first bill, report, or receipt to get started.', he: 'העלה את החשבון, הדו"ח או הקבלה הראשונים שלך כדי להתחיל' },
  noMatch:     { en: 'No documents match your search.', he: 'לא נמצאו מסמכים התואמים לחיפוש שלך' },
  settings:    { en: 'Settings',  he: 'הגדרות'  },
  profile:     { en: 'Profile',   he: 'פרופיל'  },
  logout:      { en: 'Log Out',   he: 'התנתק'   },
  dashboardLang:     { en: 'Dashboard Language', he: 'שפת לוח הבקרה' },
  dashboardLangDesc: { en: 'Table shows English summaries. Layout is left-to-right.', he: 'הטבלה מציגה סיכומים בעברית. הפריסה מימין לשמאל.' },
  privacy:      { en: 'Privacy',              he: 'פרטיות'          },
  blurSensitive:{ en: 'Blur sensitive amounts', he: 'טשטש סכומים רגישים' },
  privacyDesc:  { en: 'Hides balances, amounts, and fees. Hover over any value to reveal it.', he: 'מסתיר יתרות, סכומים ודמי ניהול. רחף כדי לחשוף.' },
  alertThreshold: { en: 'Alert Threshold', he: 'סף התראה' },
  days: { en: 'days', he: 'ימים' },
  day:  { en: 'day',  he: 'יום'  },
  alertDesc: { en: "Show a \"Due Soon\" badge this many days before a bill's due date.", he: 'הצג תג "לתשלום בקרוב" מספר ימים לפני מועד החשבון.' },
  currency:    { en: 'Preferred Currency', he: 'מטבע מועדף' },
  ils: { en: '₪ ILS', he: '₪ שקל'  },
  usd: { en: '$ USD', he: '$ דולר' },
  currencyDesc: { en: 'Amounts in the summary bar are converted at a static rate: 1 USD = 3.70 ILS.', he: 'הסכומים בסרגל הסיכום מומרות לפי שער קבוע: 1 דולר = 3.70 ש"ח.' },
  potentialClaim: { en: 'Potential Claim', he: 'תביעה פוטנציאלית' },
  analyzing:      { en: 'Analyzing…',      he: 'מנתח…'            },
  progressFailed: { en: 'Failed:',         he: 'נכשל:'            },
  addDocuments: { en: '+ Add Documents', he: '+ הוסף מסמכים' },
  selectFiles:  { en: 'Select Files',    he: 'בחר קבצים'      },
  selectFolder: { en: 'Select Folder',   he: 'בחר תיקייה'     },
  totalAssets:     { en: 'Total Assets',   he: 'סה"כ נכסים'     },
  totalAssetsDesc: { en: 'Across all financial reports', he: 'בכל הדוחות הפיננסיים' },
  pendingBills:    { en: 'Pending Bills',  he: 'חשבונות לתשלום' },
  pendingBillsDesc:{ en: 'All bills combined · rate 1 USD = 3.70 ILS', he: 'כל החשבונות יחד · שער 1 דולר = 3.7 ש״ח' },
  dropOverlay:     { en: 'Drop Documents into Nayeret.AI', he: 'שחרר מסמכים לתוך Nayeret.AI' },
  dropOverlayHint: { en: 'PDF, PNG, JPG, TIFF, BMP',      he: 'PDF, PNG, JPG, TIFF, BMP'      },
  colFilename:  { en: 'Filename',  he: 'שם קובץ'      },
  colCategory:  { en: 'Category', he: 'קטגוריה'      },
  colAmount:    { en: 'Amount',   he: 'סכום'         },
  colDueDate:   { en: 'Due Date', he: 'תאריך פירעון' },
  colUploaded:  { en: 'Uploaded', he: 'הועלה'        },
  colStatus:    { en: 'Status',   he: 'סטטוס'        },
  tableDetails:     { en: 'Details',          he: 'פרטים'        },
  tableSummary:     { en: 'Summary',          he: 'סיכום'        },
  mediaDescription: { en: 'Media Description',he: 'תיאור מדיה'   },
  mediaNote:        { en: 'This file was identified as non-document media.', he: 'קובץ זה זוהה כמדיה שאינה מסמך.' },
  deleteDoc:          { en: 'Delete',             he: 'מחק'                   },
  deletingDoc:        { en: 'Deleting…',           he: 'מוחק…'                 },
  viewDoc:            { en: 'View Document',        he: 'צפה במסמך'             },
  confirmDeleteTitle: { en: 'Delete document?',     he: 'מחיקת מסמך?'           },
  confirmDeleteBody:  { en: 'This cannot be undone.', he: 'פעולה זו אינה ניתנת לביטול.' },
  confirmCancel:      { en: 'Cancel',               he: 'ביטול'                 },
  confirmDelete:      { en: 'Delete',               he: 'מחק'                   },
  deleteFailMsg:      { en: 'Failed to delete document.', he: 'מחיקת המסמך נכשלה.' },
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
  bill:             { label: { en: 'Bill',             he: 'חשבון'        }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '🧾' },
  financial_report: { label: { en: 'Financial Report', he: 'דוח פיננסי'   }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '📊' },
  receipt:          { label: { en: 'Receipt',          he: 'קבלה'          }, color: 'bg-zen-warm/10 text-zen-warm border-zen-warm/20',       emoji: '🧾' },
  claim:            { label: { en: 'Claim',            he: 'תביעה'         }, color: 'bg-destructive/10 text-destructive border-destructive/20', emoji: '📋' },
  insurance:        { label: { en: 'Insurance Policy', he: 'פוליסת ביטוח' }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '🛡' },
  identification:   { label: { en: 'Identity',         he: 'זיהוי'         }, color: 'bg-zen-warm/10 text-zen-warm border-zen-warm/20',       emoji: '🪪' },
  other:            { label: { en: 'Other',            he: 'אחר'           }, color: 'bg-secondary text-secondary-foreground border-border',  emoji: '📄' },
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
    <Badge variant="outline" className={`text-xs font-normal ${color}`}>
      {label}
    </Badge>
  );
}

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return size === 'lg' ? (
    <div className="w-8 h-8 border-4 border-zen-sage/30 border-t-zen-sage rounded-full animate-spin" />
  ) : (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

function PrivateValue({ value }: { value: string }) {
  const { privacyMode } = useSettings();
  if (!privacyMode) return <>{value}</>;
  return (
    <span className="blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none" title="Hover to reveal">
      {value}
    </span>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-zen-sage' : 'bg-secondary'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}

// ─── Summary Cards (v0 design with real data) ─────────────────────────────────

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

  const blurCls = privacyMode ? 'blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none' : '';

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {totalAssets > 0 && (
        <div className="group bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">{translations.totalAssets[lang]}</p>
              <p className={`text-3xl font-semibold tracking-tight text-foreground tabular-nums ${blurCls}`}>
                {fmtMoney(totalAssets, symbol)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translations.totalAssetsDesc[lang]}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-sage/10 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-zen-sage" />
            </div>
          </div>
        </div>
      )}
      {totalBills > 0 && (
        <div className="group bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">{translations.pendingBills[lang]}</p>
              <p className={`text-3xl font-semibold tracking-tight text-foreground tabular-nums ${blurCls}`}>
                {fmtMoney(totalBills, symbol)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translations.pendingBillsDesc[lang]}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-warm/10 flex-shrink-0">
              <Receipt className="w-5 h-5 text-zen-warm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ isOpen, onClose, user, onLogout }: {
  isOpen: boolean; onClose: () => void; user: User | null; onLogout: () => void;
}) {
  const { lang, setLang, privacyMode, setPrivacyMode, alertDays, setAlertDays, currency, setCurrency } = useSettings();
  const [avatarError, setAvatarError] = useState(false);

  if (!isOpen) return null;

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName[0].toUpperCase();

  return (
    <>
      <div className="fixed inset-0 bg-zen-stone/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-80 bg-card shadow-xl z-50 flex flex-col" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {translations.settings[lang]}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
          {/* Profile */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.profile[lang]}</h3>
            <div className="flex items-center gap-3 mb-4">
              {avatarUrl && !avatarError ? (
                <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={() => setAvatarError(true)} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zen-sage/20 flex items-center justify-center text-zen-stone font-bold text-sm flex-shrink-0 select-none">{initials}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </div>
            </div>
            <button onClick={onLogout} className="w-full border border-destructive/20 rounded-lg px-4 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors text-start">
              {translations.logout[lang]}
            </button>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.dashboardLang[lang]}</h3>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setLang('he')} className={`flex-1 py-2 text-sm font-medium transition-colors ${lang === 'he' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>עברית</button>
              <button onClick={() => setLang('en')} className={`flex-1 py-2 text-sm font-medium border-s border-border transition-colors ${lang === 'en' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>English</button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{translations.dashboardLangDesc[lang]}</p>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.privacy[lang]}</h3>
            <Toggle checked={privacyMode} onChange={setPrivacyMode} label={translations.blurSensitive[lang]} />
            <p className="mt-2 text-xs text-muted-foreground">{translations.privacyDesc[lang]}</p>
          </section>

          {/* Alert Threshold */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.alertThreshold[lang]}</h3>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={14} value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))} className="flex-1 accent-zen-sage" />
              <span className="text-sm font-semibold text-foreground w-16 text-end">{alertDays} {alertDays === 1 ? translations.day[lang] : translations.days[lang]}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{translations.alertDesc[lang]}</p>
          </section>

          {/* Currency */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.currency[lang]}</h3>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setCurrency('ILS')} className={`flex-1 py-2 text-sm font-medium transition-colors ${currency === 'ILS' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>{translations.ils[lang]}</button>
              <button onClick={() => setCurrency('USD')} className={`flex-1 py-2 text-sm font-medium border-s border-border transition-colors ${currency === 'USD' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>{translations.usd[lang]}</button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{translations.currencyDesc[lang]}</p>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Nayeret.AI · Powered by Gemini + Supabase</p>
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
      <p className="text-muted-foreground font-medium">{isSearch ? translations.noMatch[lang] : translations.emptyVault[lang]}</p>
      {!isSearch && <p className="text-sm text-muted-foreground/70">{translations.uploadFirst[lang]}</p>}
    </div>
  );
}

// ─── Supported file types ─────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'];
function isSupportedFile(name: string): boolean {
  return SUPPORTED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-6 py-3" dir="ltr">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">{statusText}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone && errors > 0 ? 'bg-destructive' : 'bg-zen-sage'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && errors > 0 && (
          <p className="text-xs text-destructive mt-1">
            {translations.progressFailed[lang]} {queue.filter(j => j.status === 'error').map(j => j.resolvedName).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Ingestion Hub ────────────────────────────────────────────────────────────

function IngestionHub({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled: boolean }) {
  const { lang } = useSettings();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Use "image/*" so iOS Safari shows the photo library and auto-converts HEIC→JPEG
  const accepted = 'image/*,.pdf,.heic,.heif';

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
      <Button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="bg-zen-sage text-white hover:bg-zen-sage/90 gap-2 rounded-lg"
      >
        {disabled ? (
          <><Spinner size="sm" /><span>{translations.analyzing[lang]}</span></>
        ) : (
          <><Plus className="w-4 h-4" /><span>{translations.addDocuments[lang]}</span><ChevronDown className="w-3.5 h-3.5 opacity-70" /></>
        )}
      </Button>

      {open && !disabled && (
        <div className={`absolute top-full mt-1.5 ${lang === 'he' ? 'left-0' : 'right-0'} w-44 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-30`}>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span>📄</span><span>{translations.selectFiles[lang]}</span>
          </button>
          <button onClick={() => folderInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary border-t border-border transition-colors" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span>📁</span><span>{translations.selectFolder[lang]}</span>
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
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

// ─── Document Modal ───────────────────────────────────────────────────────────

function DocumentModal({ doc, token, onClose }: { doc: VaultDoc; token: string; onClose: () => void }) {
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}`;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zen-stone/90" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 bg-zen-stone/60 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium text-white/80 truncate max-w-[80vw]">{doc.file_name}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white text-3xl leading-none ml-4" aria-label="Close">×</button>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4" onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={fileUrl} title={doc.file_name} className="w-full max-w-4xl rounded-lg shadow-2xl border-0" style={{ height: 'calc(100vh - 80px)' }} />
        ) : (
          <img src={fileUrl} alt={doc.file_name} className="max-h-[calc(100vh-80px)] max-w-full rounded-lg shadow-2xl object-contain" />
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ filename, onConfirm, onCancel }: { filename: string; onConfirm: () => void; onCancel: () => void }) {
  const { lang } = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zen-stone/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-border" dir={lang === 'he' ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground mb-1">{translations.confirmDeleteTitle[lang]}</h3>
        <p className="text-sm text-muted-foreground mb-1 truncate" title={filename}>"{filename}"</p>
        <p className="text-sm text-destructive mb-5">{translations.confirmDeleteBody[lang]}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>{translations.confirmCancel[lang]}</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>{translations.confirmDelete[lang]}</Button>
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
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 shadow-lg">
      <span>⚠️ {message}</span>
      <button onClick={onDismiss} className="text-destructive/60 hover:text-destructive font-bold leading-none">×</button>
    </div>
  );
}

// ─── Validation dot ───────────────────────────────────────────────────────────

function getValidationStatus(doc: VaultDoc): 'verified' | 'unsure' | 'missing' {
  const ra = doc.raw_analysis ?? {};
  if (ra.is_media) return 'unsure';
  if (!doc.summary_he && !doc.summary_en) return 'missing';
  switch (doc.document_type) {
    case 'bill':           if (!ra.total_amount && !ra.provider) return 'missing'; if (!ra.due_date) return 'unsure'; break;
    case 'financial_report': if (!ra.total_balance) return 'unsure'; break;
    case 'receipt':        if (!ra.total_amount && !ra.merchant) return 'missing'; break;
    case 'claim':          if (!ra.total_amount && !ra.insurer) return 'missing'; break;
    case 'insurance':      if (!ra.insurer && !ra.policy_number) return 'missing'; break;
    case 'identification': if (!ra.id_number && !ra.full_name) return 'missing'; break;
  }
  return 'verified';
}

function ValidationDot({ doc }: { doc: VaultDoc }) {
  const { lang } = useSettings();
  const status = getValidationStatus(doc);
  const cfg = {
    verified: { cls: 'bg-zen-sage',   tip: lang === 'he' ? 'מאומת'    : 'Verified'     },
    unsure:   { cls: 'bg-zen-warm',   tip: lang === 'he' ? 'לא בטוח'  : 'AI Unsure'    },
    missing:  { cls: 'bg-destructive', tip: lang === 'he' ? 'חסר מידע' : 'Missing Data' },
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.cls}`} title={cfg.tip} />;
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortCol = 'name' | 'category' | 'amount' | 'due_date' | 'uploaded';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown className="w-3 h-3 opacity-30" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-zen-sage" />
    : <ChevronDown className="w-3 h-3 text-zen-sage" />;
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

// ─── Vault Table ──────────────────────────────────────────────────────────────

function VaultRow({
  doc, token, onDelete, expanded, onToggle, hasInsurance,
}: {
  doc: VaultDoc; token: string; onDelete: (id: string) => void;
  expanded: boolean; onToggle: () => void; hasInsurance: boolean;
}) {
  const { lang, alertDays, currency, privacyMode } = useSettings();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [imgError, setImgError] = useState(false);

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

  const metaEntries = Object.entries(ra).filter(([key, v]) => v !== null && v !== undefined && v !== '' && key !== 'is_media');

  const dots: Array<{ cls: string; tip: string }> = [];
  if (dueAlert === 'overdue')  dots.push({ cls: 'bg-destructive', tip: lang === 'he' ? 'באיחור' : 'Overdue' });
  if (dueAlert === 'due-soon') dots.push({ cls: 'bg-zen-warm',    tip: lang === 'he' ? 'בקרוב'  : 'Due Soon' });
  if (liquid)                  dots.push({ cls: 'bg-yellow-400',  tip: lang === 'he' ? 'נזילות' : 'Liquidity' });
  if (isPotentialClaim)        dots.push({ cls: 'bg-violet-500',  tip: lang === 'he' ? 'תביעה'  : 'Claim' });

  const rowCls = liquid
    ? 'bg-zen-warm/5 hover:bg-zen-warm/10'
    : dueAlert === 'overdue'
    ? 'bg-destructive/5 hover:bg-destructive/10'
    : expanded
    ? 'bg-secondary/50'
    : 'hover:bg-secondary/30';

  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); setShowConfirm(true); };

  const confirmDelete = async () => {
    setShowConfirm(false);
    setDeleting(true);
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: doc.id }),
    });
    if (res.ok) { onDelete(doc.id); }
    else { setDeleteError(translations.deleteFailMsg[lang]); setDeleting(false); }
  };

  const hasThumbnail = !!doc.thumbnail_url && !imgError;
  const { emoji } = typeConfig(doc.document_type);

  return (
    <>
      {showConfirm && <ConfirmDialog filename={doc.file_name} onConfirm={confirmDelete} onCancel={() => setShowConfirm(false)} />}
      {deleteError && <ErrorToast message={deleteError} onDismiss={() => setDeleteError(null)} />}
      {showModal && <DocumentModal doc={doc} token={token} onClose={() => setShowModal(false)} />}

      <TableRow className={`cursor-pointer transition-all duration-200 border-b border-border/50 ${rowCls}`} onClick={onToggle}>
        {/* Filename + Thumbnail with HoverCard */}
        <TableCell className="py-4">
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0 cursor-zoom-in"
                  onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                >
                  {hasThumbnail ? (
                    <img src={doc.thumbnail_url!} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base select-none">{emoji}</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[160px]" title={doc.file_name}>{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </HoverCardTrigger>
            {hasThumbnail && (
              <HoverCardContent side="left" align="start" className="w-72 p-0 overflow-hidden rounded-xl border-border shadow-lg">
                <div className="relative aspect-[4/3] bg-secondary">
                  <img src={doc.thumbnail_url!} alt={`תצוגה מקדימה: ${doc.file_name}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zen-stone/80 to-transparent p-3">
                    <p className="text-xs text-white/90 font-medium">{doc.file_name}</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TypeBadge type={doc.document_type} />
                    {amount && <span className="text-[10px] text-muted-foreground tabular-nums">{amount}</span>}
                  </div>
                </div>
              </HoverCardContent>
            )}
          </HoverCard>
        </TableCell>

        {/* Category */}
        <TableCell className="py-4">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={doc.document_type} />
            <ValidationDot doc={doc} />
          </div>
        </TableCell>

        {/* Amount */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm tabular-nums text-foreground font-medium">
            {amount ? (privacyMode ? <PrivateValue value={amount} /> : amount) : <span className="text-muted-foreground/40">—</span>}
          </span>
        </TableCell>

        {/* Due Date */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm text-muted-foreground">{dueDateStr ?? <span className="text-muted-foreground/40">—</span>}</span>
        </TableCell>

        {/* Uploaded */}
        <TableCell className="py-4 hidden sm:table-cell">
          <span className="text-sm text-muted-foreground tabular-nums">
            {new Date(doc.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </TableCell>

        {/* Status dots */}
        <TableCell className="text-center py-4">
          <div className="flex items-center justify-center gap-1">
            {dots.length > 0
              ? dots.map((dot, i) => <span key={i} className={`inline-block w-2.5 h-2.5 rounded-full ${dot.cls}`} title={dot.tip} />)
              : <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            }
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded row */}
      {expanded && (
        <TableRow className="border-b border-border/50">
          <TableCell colSpan={6} className="p-0">
            <div className="bg-secondary/30 border-t border-border/30">
              <div className="p-6 max-w-3xl ms-0 me-auto" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                {ra.is_media ? (
                  <div className="mb-5 text-start">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{translations.mediaDescription[lang]}</h4>
                    <p className="text-sm text-muted-foreground italic mb-1">{translations.mediaNote[lang]}</p>
                    {(doc.summary_he || doc.summary_en) && (
                      <p className="text-sm text-foreground leading-relaxed">
                        {lang === 'he' ? (doc.summary_he || doc.summary_en) : (doc.summary_en || doc.summary_he)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {summary && (
                      <div className="mb-5 text-start">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{translations.tableSummary[lang]}</h4>
                        <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                      </div>
                    )}
                    {metaEntries.length > 0 && (
                      <div className="mb-5 text-start">
                        <h4 className="text-xs font-medium text-muted-foreground mb-3">{translations.tableDetails[lang]}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {metaEntries.map(([key, value]) => {
                            const rawStr = String(value);
                            const isMoney = SENSITIVE_KEYS.has(key) && !isNaN(Number(value));
                            let displayStr = rawStr;
                            if (isMoney) {
                              displayStr = fmtMoney(convertAmount(Number(value), String(ra.currency ?? 'ILS'), currency), symbol);
                            }
                            return (
                              <div key={key} className="bg-card rounded-lg border border-border/50 p-3 text-start">
                                <p className="text-[10px] text-muted-foreground tracking-wide mb-1">{key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-medium text-foreground">
                                  {SENSITIVE_KEYS.has(key) ? <PrivateValue value={displayStr} /> : displayStr}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive gap-1.5 text-xs"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? translations.deletingDoc[lang] : translations.deleteDoc[lang]}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {translations.viewDoc[lang]}
                  </Button>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function VaultTable({ docs, token, onDelete }: { docs: VaultDoc[]; token: string; onDelete: (id: string) => void }) {
  const { lang } = useSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('uploaded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const hasInsurance = docs.some(d => d.document_type === 'insurance');

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = sortDocs(docs, sortCol, sortDir);

  const thBtn = 'flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors';

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead>
              <button onClick={() => handleSort('name')} className={thBtn}>
                {translations.colFilename[lang]}<SortIcon active={sortCol === 'name'} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button onClick={() => handleSort('category')} className={thBtn}>
                {translations.colCategory[lang]}<SortIcon active={sortCol === 'category'} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <button onClick={() => handleSort('amount')} className={thBtn}>
                {translations.colAmount[lang]}<SortIcon active={sortCol === 'amount'} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <button onClick={() => handleSort('due_date')} className={thBtn}>
                {translations.colDueDate[lang]}<SortIcon active={sortCol === 'due_date'} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <button onClick={() => handleSort('uploaded')} className={thBtn}>
                {translations.colUploaded[lang]}<SortIcon active={sortCol === 'uploaded'} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="text-center w-20">
              <span className="text-xs font-medium text-muted-foreground">{translations.colStatus[lang]}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(doc => (
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
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                {translations.noMatch[lang]}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [lang, setLangState] = useState<Lang>('he');
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [alertDays, setAlertDaysState] = useState(7);
  const [currency, setCurrencyState] = useState<Currency>('ILS');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session) router.replace('/login');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) router.replace('/login');
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Settings persistence ───────────────────────────────────────────────────

  const saveSettings = (patch: Partial<AppSettings>) => {
    try {
      const current: Partial<AppSettings> = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}');
      localStorage.setItem('vaultSettings', JSON.stringify({ ...current, ...patch }));
    } catch {}
  };

  useEffect(() => {
    try {
      const saved: Partial<AppSettings> = JSON.parse(localStorage.getItem('vaultSettings') ?? '{}');
      if (saved.lang === 'he' || saved.lang === 'en') setLangState(saved.lang);
      if (typeof saved.privacyMode === 'boolean') setPrivacyModeState(saved.privacyMode);
      if (typeof saved.alertDays === 'number' && saved.alertDays >= 1 && saved.alertDays <= 14) setAlertDaysState(saved.alertDays);
      if (saved.currency === 'ILS' || saved.currency === 'USD') setCurrencyState(saved.currency);
    } catch {}
  }, []);

  const setLang = (l: Lang) => { setLangState(l); saveSettings({ lang: l }); };
  const setPrivacyMode = (v: boolean) => { setPrivacyModeState(v); saveSettings({ privacyMode: v }); };
  const setAlertDays = (v: number) => { setAlertDaysState(v); saveSettings({ alertDays: v }); };
  const setCurrency = (v: Currency) => { setCurrencyState(v); saveSettings({ currency: v }); };

  // ── Load library ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !session) return;
    setLoadingLibrary(true);
    fetch('/api/documents', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setDocs(d.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoadingLibrary(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    if (!session) return;
    const supported = files.filter(f => isSupportedFile(f.name));
    if (supported.length === 0) return;

    const existingNames = new Set(docs.map(d => d.file_name));
    const jobs: UploadJob[] = supported.map(file => {
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

        if (supabaseId) {
          const ext = job.resolvedName.split('.').pop()?.toLowerCase() ?? '';
          const thumbPromise = ext === 'pdf' ? renderPdfThumbnail(job.originalFile) : renderImageThumbnail(job.originalFile);
          thumbPromise
            .then(base64 => fetch('/api/thumbnail', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ documentId: supabaseId, thumbnailBase64: base64 }),
            }))
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.thumbnailUrl) setDocs(prev => prev.map(doc => doc.id === supabaseId ? { ...doc, thumbnail_url: data.thumbnailUrl } : doc));
            })
            .catch(() => {});
        }
      } catch (err) {
        setUploadQueue(prev => prev.map(j => j.id === job.id
          ? { ...j, status: 'error', errorMsg: err instanceof Error ? err.message : 'Unknown error' }
          : j));
      }
    }

    const jobIds = new Set(jobs.map(j => j.id));
    setTimeout(() => setUploadQueue(prev => prev.filter(j => !jobIds.has(j.id))), 4000);
  };

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'] },
    noClick: true,
    noKeyboard: true,
  });

  const isUploading = uploadQueue.some(j => j.status === 'queued' || j.status === 'analyzing');
  const handleDelete = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  const q = search.toLowerCase();
  const filtered = docs.filter(d =>
    d.file_name.toLowerCase().includes(q) ||
    d.document_type.toLowerCase().includes(q) ||
    String(d.raw_analysis?.provider ?? '').toLowerCase().includes(q)
  );

  // ── Auth loading gate ──────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const ctx: SettingsCtx = { lang, setLang, privacyMode, setPrivacyMode, alertDays, setAlertDays, currency, setCurrency };
  const initials = (user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase();

  return (
    <SettingsContext.Provider value={ctx}>
      <Head><title>Nayeret.AI</title></Head>
      <div {...getRootProps()} className="min-h-screen bg-background" dir={lang === 'he' ? 'rtl' : 'ltr'}>

        {/* Drag-over overlay */}
        {isDragActive && (
          <div className="fixed inset-0 z-50 bg-zen-sage/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-card rounded-2xl shadow-2xl border-2 border-dashed border-zen-sage px-12 py-10 text-center">
              <div className="text-5xl mb-3">📂</div>
              <p className="text-xl font-bold text-zen-sage">{translations.dropOverlay[lang]}</p>
              <p className="text-sm text-muted-foreground mt-1">{translations.dropOverlayHint[lang]}</p>
            </div>
          </div>
        )}

        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} onLogout={handleLogout} />

        {/* Header (v0 design) */}
        <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              Nayeret<span className="text-zen-sage">.AI</span>
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lang === 'he' ? 'מנהל מסמכים חכם' : 'AI-powered document manager'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <IngestionHub onFiles={handleFiles} disabled={isUploading} />

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-zen-sage/20 flex items-center justify-center text-xs font-medium text-zen-stone overflow-hidden flex-shrink-0">
              {user.user_metadata?.avatar_url && !headerAvatarError ? (
                <img src={user.user_metadata.avatar_url as string} alt="avatar" className="w-full h-full object-cover" onError={() => setHeaderAvatarError(true)} />
              ) : initials}
            </div>

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground hover:bg-border transition-colors"
              title={lang === 'he' ? 'הגדרות' : 'Settings'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-6">
          {/* Summary cards */}
          {!loadingLibrary && <VaultSummaryBar docs={docs} />}

          {/* Search (v0 design) */}
          <div className={`relative flex items-center bg-card rounded-xl border transition-all duration-300 mb-5 ${searchFocused ? 'border-zen-sage shadow-sm' : 'border-border'}`}>
            <Search className="w-4 h-4 text-muted-foreground absolute start-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={lang === 'he' ? 'חיפוש לפי שם קובץ, סוג, או ספק...' : 'Search by filename, type, or provider…'}
              className="w-full bg-transparent py-3.5 pe-4 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Library */}
          {loadingLibrary ? (
            <div className="flex flex-col items-center justify-center mt-24 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">{lang === 'he' ? 'טוען כספת…' : 'Loading vault…'}</p>
            </div>
          ) : filtered.length > 0 ? (
            <VaultTable docs={filtered} token={session?.access_token ?? ''} onDelete={handleDelete} />
          ) : (
            <EmptyState isSearch={search.length > 0} />
          )}
        </main>
      </div>
      <BulkProgressBar queue={uploadQueue} />
    </SettingsContext.Provider>
  );
}
