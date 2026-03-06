import Head from 'next/head';
import { Settings, Shield, Camera, Upload, Loader2, CheckCircle2, Sparkles, X, Search } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';

import { translations } from '@/lib/vault/translations';
import { SettingsContext, useSettings } from '@/lib/context/settings';
import type { SettingsCtx } from '@/lib/context/settings';
import type { VaultDoc, UploadJob, AppSettings, Lang, Currency, DuplicateDocInfo, SemanticMatchInfo } from '@/lib/types';
import {
  isSupportedFile, sanitizeFilename, resolveFilename, readFileAsBase64,
  normalizeImageFile, renderPdfThumbnail, renderImageThumbnail, computeFileHash,
} from '@/lib/vault/helpers';
import { fetchDocuments, uploadFileApi, analyzeFileApi, saveThumbnailApi, deleteDocument, updateDocument } from '@/lib/services/documents';
import { SUPPORTED_CATEGORIES, categoryLabel } from '@/lib/vault/categories';
import { VaultSummaryBar, DuplicateDialog, SemanticMatchToast } from '@/components/vault';
import DocumentDrawer from '@/components/vault/DocumentDrawer';
import DocumentModal from '@/components/vault/DocumentModal';
import VaultCard from '@/components/vault/VaultCard';
import IngestionHub from '@/components/vault/IngestionHub';

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return size === 'lg' ? (
    <div className="w-8 h-8 border-4 border-zen-sage/30 border-t-zen-sage rounded-full animate-spin" />
  ) : (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

// ── PrivateValue ─────────────────────────────────────────────────────────────

function PrivateValue({ value }: { value: string }) {
  const { privacyMode } = useSettings();
  if (!privacyMode) return <>{value}</>;
  return (
    <span className="blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none" title="Hover to reveal">
      {value}
    </span>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────────

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

// ── Settings Panel ────────────────────────────────────────────────────────────

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

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.dashboardLang[lang]}</h3>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setLang('he')} className={`flex-1 py-2 text-sm font-medium transition-colors ${lang === 'he' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>עברית</button>
              <button onClick={() => setLang('en')} className={`flex-1 py-2 text-sm font-medium border-s border-border transition-colors ${lang === 'en' ? 'bg-zen-sage text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>English</button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{translations.dashboardLangDesc[lang]}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.privacy[lang]}</h3>
            <Toggle checked={privacyMode} onChange={setPrivacyMode} label={translations.blurSensitive[lang]} />
            <p className="mt-2 text-xs text-muted-foreground">{translations.privacyDesc[lang]}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translations.alertThreshold[lang]}</h3>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={14} value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))} className="flex-1 accent-zen-sage" />
              <span className="text-sm font-semibold text-foreground w-16 text-end">{alertDays} {alertDays === 1 ? translations.day[lang] : translations.days[lang]}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{translations.alertDesc[lang]}</p>
          </section>

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

// ── CaptureZone ───────────────────────────────────────────────────────────────

function CaptureZone({ onFiles, isDragActive, lang }: {
  onFiles: (files: File[]) => void;
  isDragActive: boolean;
  lang: Lang;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const desktopRef = useRef<HTMLInputElement>(null);

  const accepted = 'image/*,.pdf,.heic,.heif';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  const GalleryIcon = (props: { className?: string }) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );

  const FolderIcon = (props: { className?: string }) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );

  const mobileActions = [
    {
      ref: cameraRef,
      Icon: Camera,
      label: lang === 'he' ? 'מצלמה' : 'Camera',
      sublabel: lang === 'he' ? 'צלם מסמך' : 'Take photo',
      accept: 'image/*',
      capture: true,
      primary: true,
    },
    {
      ref: galleryRef,
      Icon: GalleryIcon,
      label: lang === 'he' ? 'גלריה' : 'Gallery',
      sublabel: lang === 'he' ? 'בחר תמונה' : 'Pick photo',
      accept: 'image/*',
      capture: false,
      primary: false,
    },
    {
      ref: filesRef,
      Icon: FolderIcon,
      label: lang === 'he' ? 'קבצים' : 'Files',
      sublabel: lang === 'he' ? 'עיון בקבצים' : 'Browse files',
      accept: accepted,
      capture: false,
      primary: false,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="px-4 pt-4 md:px-8"
    >
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        {lang === 'he' ? 'העלאת מסמכים' : 'Upload Documents'}
      </h2>

      {/* Mobile: 3-button grid */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        {mobileActions.map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.95 }}
            onClick={() => action.ref.current?.click()}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-colors ${
              action.primary
                ? 'border-zen-sage bg-zen-sage/5 text-zen-sage'
                : 'border-border bg-card text-muted-foreground hover:border-zen-sage/40 hover:text-foreground'
            }`}
          >
            <action.Icon className="h-7 w-7" />
            <div className="text-center">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-[10px] text-muted-foreground">{action.sublabel}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Desktop: drag-drop zone */}
      <motion.div
        whileHover={{ borderColor: '#7a8c6e' }}
        onClick={() => desktopRef.current?.click()}
        className={`hidden md:flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
          isDragActive
            ? 'border-zen-sage bg-zen-sage/5'
            : 'border-border bg-card hover:bg-secondary/50'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zen-sage/10">
          <Upload className="h-6 w-6 text-zen-sage" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            {lang === 'he' ? 'גרור קבצים לכאן או לחץ להעלאה' : 'Drop files here or click to upload'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === 'he' ? 'PDF, תמונות, מסמכים סרוקים' : 'PDF, images, scanned documents'}
          </p>
        </div>
      </motion.div>

      {/* Hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleChange} className="hidden" />
      <input ref={filesRef}   type="file" accept={accepted} multiple onChange={handleChange} className="hidden" />
      <input ref={desktopRef} type="file" accept={accepted} multiple onChange={handleChange} className="hidden" />
    </motion.section>
  );
}

// ── EmptyVault ────────────────────────────────────────────────────────────────

function EmptyVault({ lang, onSuggestedSearch }: { lang: Lang; onSuggestedSearch: (term: string) => void }) {
  const suggested = ['ארנונה', 'דרכון', 'ביטוח רכב', 'חשבון חשמל', 'חוזה שכירות'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-col items-center px-4 pb-32 pt-8 md:px-8"
    >
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.15 - i * 0.04, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4 + i * 0.2 }}
            className="absolute rounded-full border border-zen-sage/30"
            style={{ width: `${80 + i * 40}px`, height: `${80 + i * 40}px` }}
          />
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-zen-sage/10"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-zen-sage">
            <path d="M12 2C6.5 2 2 6.5 2 12c0 5 4 9.5 10 10-.5-1-1-2.5-1-4.5 0-3 2-5.5 2-8.5 0-2-1-4-1-7z" fill="currentColor" opacity="0.15" />
            <path d="M12 2c0 3 1 5 1 7 0 3-2 5.5-2 8.5 0 2 .5 3.5 1 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 2C17.5 2 22 6.5 22 12c0 5-4 9.5-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M12 2C6.5 2 2 6.5 2 12c0 5 4 9.5 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M12 8c2 1 4 2.5 5 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
            <path d="M12 8c-2 1-4 2.5-5 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
          </svg>
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-2 text-center text-base font-bold text-foreground"
      >
        {lang === 'he' ? 'הכספת שלך מוכנה' : 'Your vault is ready'}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mb-8 max-w-xs text-center text-sm leading-relaxed text-muted-foreground"
      >
        {lang === 'he' ? 'העלה את המסמך הראשון שלך למעלה כדי להתחיל.' : 'Upload your first document above to get started.'}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="w-full max-w-sm"
      >
        <p className="mb-3 text-center text-xs font-semibold text-muted-foreground/70">
          {lang === 'he' ? 'חיפושים מומלצים' : 'Suggested searches'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggested.map((term, i) => (
            <motion.button
              key={term}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.9 + i * 0.07 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSuggestedSearch(term)}
              className="rounded-full bg-card px-4 py-2 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60 transition-colors hover:bg-secondary hover:ring-zen-sage/30"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── EmptySearch ───────────────────────────────────────────────────────────────

function EmptySearch({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="text-4xl">🔍</div>
      <p className="text-muted-foreground font-medium">{translations.noMatch[lang]}</p>
    </div>
  );
}

// ── SkeletonCards ─────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="px-4 pt-4 pb-28 space-y-3 md:px-8">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
          className="flex gap-3 rounded-xl bg-card p-4 ring-1 ring-border/60"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-md bg-muted/70" />
            <div className="h-2.5 w-1/3 animate-pulse rounded-md bg-muted/50" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

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
  const cancelledIds = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<VaultDoc | null>(null);
  const [fullViewDoc, setFullViewDoc] = useState<VaultDoc | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // ── Deduplication state ───────────────────────────────────────────────────────
  const [tier1Conflict, setTier1Conflict] = useState<{
    filename: string;
    existing: DuplicateDocInfo;
    resolve: (action: 'view' | 'replace' | 'cancel') => void;
  } | null>(null);
  const [semanticNotifications, setSemanticNotifications] = useState<{
    key: string;
    match: SemanticMatchInfo;
    newDocId: string;
    newDocData: Partial<VaultDoc>;
  }[]>([]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

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

  // ── Settings persistence ──────────────────────────────────────────────────────

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

  // ── Load library ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !session) return;
    setLoadingLibrary(true);
    fetchDocuments(session.access_token)
      .then(documents => setDocs(documents))
      .catch(() => setDocs([]))
      .finally(() => setLoadingLibrary(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // ── Upload ────────────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    if (!session) return;
    const supported = files.filter(f => isSupportedFile(f.name) || f.type.startsWith('image/') || f.type === 'application/pdf');
    if (supported.length === 0) return;

    const existingNames = new Set(docs.map(d => d.file_name));
    const jobs: UploadJob[] = supported.map(file => {
      // Sanitize to ASCII before dedup: Supabase Storage rejects non-ASCII keys
      const resolved = resolveFilename(sanitizeFilename(file.name), existingNames);
      existingNames.add(resolved);
      return { id: Math.random().toString(36).slice(2), originalFile: file, resolvedName: resolved, status: 'queued' as const };
    });

    cancelledIds.current.clear();
    setUploadQueue(prev => [...prev, ...jobs]);

    for (const job of jobs) {
      if (cancelledIds.current.has(job.id)) continue;
      setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'analyzing' } : j));
      try {
        const { data: { session: fresh } } = await supabase.auth.getSession();
        const token = fresh?.access_token ?? '';

        const normalizedFile = await normalizeImageFile(job.originalFile);
        const normalizedName = normalizedFile !== job.originalFile
          ? resolveFilename(normalizedFile.name, new Set(docs.map(d => d.file_name)))
          : job.resolvedName;

        const base64 = await readFileAsBase64(normalizedFile);
        const fileHash = await computeFileHash(normalizedFile);

        const uploadResult = await uploadFileApi(normalizedName, base64, token, fileHash);
        if (uploadResult.isDuplicate && uploadResult.existingDoc) {
          const action = await new Promise<'view' | 'replace' | 'cancel'>(resolve => {
            setTier1Conflict({ filename: normalizedName, existing: uploadResult.existingDoc!, resolve });
          });
          setTier1Conflict(null);
          if (action === 'cancel' || action === 'view') {
            setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' } : j));
            continue;
          }
          await uploadFileApi(normalizedName, base64, token, fileHash, true);
          setDocs(prev => prev.filter(d => d.id !== uploadResult.existingDoc!.id));
        }

        const d = await analyzeFileApi(normalizedName, normalizedFile.type, token, fileHash, job.originalFile.name);

        const supabaseId: string = d.supabaseId ?? '';
        const newDoc: VaultDoc = {
          id: supabaseId,
          file_name: normalizedName,
          document_type: d.document_type ?? 'other',
          summary_he: d.summary_he ?? null,
          summary_en: d.summary_en ?? null,
          raw_analysis: d.raw_metadata ?? null,
          insights: d.raw_metadata ?? null,
          thumbnail_url: null,
          created_at: new Date().toISOString(),
          user_notes: null,
          original_filename: job.originalFile.name,
        };
        setDocs(prev => [newDoc, ...prev.filter(p => p.id !== supabaseId)]);
        setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' } : j));

        if (d.semanticMatch) {
          setSemanticNotifications(prev => [...prev, {
            key: Math.random().toString(36).slice(2),
            match: d.semanticMatch!,
            newDocId: supabaseId,
            newDocData: {
              document_type: newDoc.document_type,
              raw_analysis: newDoc.raw_analysis,
              summary_he: newDoc.summary_he,
              summary_en: newDoc.summary_en,
            },
          }]);
        }

        if (supabaseId) {
          const ext = normalizedName.split('.').pop()?.toLowerCase() ?? '';
          const thumbPromise = ext === 'pdf' ? renderPdfThumbnail(normalizedFile) : renderImageThumbnail(normalizedFile);
          thumbPromise
            .then(base64 => saveThumbnailApi(supabaseId, base64, token))
            .then(thumbnailUrl => {
              if (thumbnailUrl) setDocs(prev => prev.map(doc => doc.id === supabaseId ? { ...doc, thumbnail_url: thumbnailUrl } : doc));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, docs]);

  const dismissSemanticNotification = (key: string) => {
    setSemanticNotifications(prev => prev.filter(n => n.key !== key));
  };

  const handleSemanticMerge = async (key: string, matchId: string, newDocId: string, patchData: Partial<VaultDoc>) => {
    dismissSemanticNotification(key);
    if (!session) return;
    const token = session.access_token;
    try {
      const patch: Parameters<typeof updateDocument>[1] = {};
      if (patchData.document_type) patch.document_type = patchData.document_type;
      if (patchData.raw_analysis) patch.raw_analysis = patchData.raw_analysis as Record<string, unknown>;
      if (patchData.summary_he != null) patch.summary_he = patchData.summary_he;
      if (patchData.summary_en != null) patch.summary_en = patchData.summary_en;
      const updated = await updateDocument(matchId, patch, token);
      await deleteDocument(newDocId, token);
      setDocs(prev => [updated, ...prev.filter(d => d.id !== matchId && d.id !== newDocId)]);
    } catch {}
  };

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'] },
    noClick: true,
    noKeyboard: true,
  });

  const isUploading = uploadQueue.some(j => j.status === 'queued' || j.status === 'analyzing');
  const handleDelete = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));
  const handleUpdate = (updated: VaultDoc) => {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDoc(prev => prev?.id === updated.id ? updated : prev);
    setFullViewDoc(prev => prev?.id === updated.id ? updated : prev);
  };

  const q = search.toLowerCase();
  const filtered = useMemo(() => docs.filter(d =>
    d.file_name.toLowerCase().includes(q) ||
    d.document_type.toLowerCase().includes(q) ||
    String(d.raw_analysis?.provider ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.merchant ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.insurer ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.institution ?? '').toLowerCase().includes(q) ||
    (d.user_notes ?? '').toLowerCase().includes(q) ||
    (d.original_filename ?? '').toLowerCase().includes(q)
  ), [docs, q]);

  const RECENT_LIMIT = 8;
  const isSearching = search.length > 0;

  const displayedDocs = useMemo(() => {
    const base = isSearching ? filtered : docs;
    const sorted = [...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const byTab = activeTab === 'recent' && !isSearching ? sorted.slice(0, RECENT_LIMIT) : sorted;
    return activeCategory ? byTab.filter(d => d.ui_category === activeCategory) : byTab;
  }, [docs, filtered, activeTab, isSearching, activeCategory]);

  // ── Auth loading gate ──────────────────────────────────────────────────────────

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

      <div
        {...getRootProps()}
        className="min-h-screen bg-background"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
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

        {tier1Conflict && (
          <DuplicateDialog
            filename={tier1Conflict.filename}
            existing={tier1Conflict.existing}
            onViewOriginal={() => tier1Conflict.resolve('view')}
            onReplace={() => tier1Conflict.resolve('replace')}
            onCancel={() => tier1Conflict.resolve('cancel')}
          />
        )}

        {semanticNotifications[0] && !tier1Conflict && (
          <SemanticMatchToast
            key={semanticNotifications[0].key}
            match={semanticNotifications[0].match}
            newDocId={semanticNotifications[0].newDocId}
            onUpdateExisting={(matchId, newDocId) =>
              handleSemanticMerge(semanticNotifications[0].key, matchId, newDocId, semanticNotifications[0].newDocData)
            }
            onKeepBoth={() => dismissSemanticNotification(semanticNotifications[0].key)}
          />
        )}

        <DocumentDrawer
          doc={selectedDoc}
          token={session?.access_token ?? ''}
          open={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onViewFull={() => selectedDoc && setFullViewDoc(selectedDoc)}
          hasPrev={selectedDoc ? displayedDocs.findIndex(d => d.id === selectedDoc.id) > 0 : false}
          hasNext={selectedDoc ? displayedDocs.findIndex(d => d.id === selectedDoc.id) < displayedDocs.length - 1 : false}
          onPrev={() => {
            if (!selectedDoc) return;
            const idx = displayedDocs.findIndex(d => d.id === selectedDoc.id);
            if (idx > 0) setSelectedDoc(displayedDocs[idx - 1]);
          }}
          onNext={() => {
            if (!selectedDoc) return;
            const idx = displayedDocs.findIndex(d => d.id === selectedDoc.id);
            if (idx < displayedDocs.length - 1) setSelectedDoc(displayedDocs[idx + 1]);
          }}
        />

        {/* Full-screen document viewer — outside Vaul so events are unaffected */}
        {fullViewDoc && session && (
          <DocumentModal
            doc={fullViewDoc}
            token={session.access_token}
            onClose={() => setFullViewDoc(null)}
            onUpdate={handleUpdate}
          />
        )}

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-4 py-4 md:px-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zen-sage">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Nayeret.AI</h1>
              <p className="text-xs text-muted-foreground">{lang === 'he' ? 'הכספת האישית שלך' : 'Your personal vault'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-zen-sage/20 flex items-center justify-center text-xs font-medium text-zen-stone overflow-hidden flex-shrink-0">
              {user.user_metadata?.avatar_url && !headerAvatarError ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={() => setHeaderAvatarError(true)}
                />
              ) : initials}
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
              title={lang === 'he' ? 'הגדרות' : 'Settings'}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </motion.header>

        {/* ── Main content ── */}
        <main className="max-w-2xl mx-auto">

          <CaptureZone onFiles={handleFiles} isDragActive={isDragActive} lang={lang} />

          {/* IngestionHub — inline below the drop area, matching its width */}
          <div className="px-4 md:px-8">
            <IngestionHub queue={uploadQueue} lang={lang} onCancel={id => {
              cancelledIds.current.add(id);
              setUploadQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' } : j));
            }} />
          </div>

          {!loadingLibrary && docs.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="px-4 pt-4 md:px-8"
            >
              <VaultSummaryBar docs={docs} />
            </motion.div>
          )}

          {loadingLibrary ? (
            <SkeletonCards />
          ) : docs.length === 0 && !isSearching ? (
            <EmptyVault lang={lang} onSuggestedSearch={q => { setSearch(q); setActiveTab('all'); }} />
          ) : (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="px-4 pb-28 pt-5 md:px-8"
            >
              {!isSearching && (
                <div className="mb-4 flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
                  {([['recent', lang === 'he' ? 'אחרונים' : 'Recent'], ['all', lang === 'he' ? 'הכל' : 'All']] as ['recent' | 'all', string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        activeTab === id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                      {id === 'all' && docs.length > 0 && (
                        <span className="ms-1.5 rounded-full bg-zen-sage/15 px-1.5 py-0.5 text-[10px] font-bold text-zen-sage">
                          {docs.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Category filter pills — visible when not searching */
              {!isSearching && (
                <div className="mb-4 -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeCategory === null
                        ? 'bg-zen-sage text-white'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {lang === 'he' ? 'הכל' : 'All'}
                  </button>
                  {SUPPORTED_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => { setActiveCategory(prev => prev === cat.key ? null : cat.key); setActiveTab('all'); }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeCategory === cat.key
                          ? 'bg-zen-sage text-white'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {categoryLabel(cat.key, lang)}
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {lang === 'he' ? `תוצאות חיפוש (${filtered.length})` : `Search results (${filtered.length})`}
                  </h2>
                </div>
              )}

              {displayedDocs.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {displayedDocs.map((doc, i) => (
                      <VaultCard
                        key={doc.id}
                        doc={doc}
                        index={i}
                        token={session?.access_token ?? ''}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onOpen={setSelectedDoc}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : isSearching ? (
                <EmptySearch lang={lang} />
              ) : null}
            </motion.section>
          )}
        </main>

        {/* ── Fixed bottom search bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-8"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-2xl">
            <div
              className={`flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-lg ring-1 transition-shadow ${
                isSearching
                  ? 'shadow-xl ring-zen-sage/40'
                  : 'ring-border/60 focus-within:shadow-xl focus-within:ring-zen-sage/30'
              }`}
            >
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={lang === 'he' ? 'חפש בכספת...' : 'Search your vault...'}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                dir={lang === 'he' ? 'rtl' : 'ltr'}
              />
              {isSearching ? (
                <button
                  onClick={() => setSearch('')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zen-sage text-white transition-transform hover:scale-105 active:scale-95"
                  aria-label="AI Search"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </SettingsContext.Provider>
  );
}
