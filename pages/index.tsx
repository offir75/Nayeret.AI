import Head from 'next/head';
import { Settings, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';

import { translations } from '@/lib/vault/translations';
import { SettingsContext, useSettings } from '@/lib/context/settings';
import type { SettingsCtx } from '@/lib/context/settings';
import type { VaultDoc, UploadJob, AppSettings, Lang, Currency, SortCol, DuplicateDocInfo, SemanticMatchInfo } from '@/lib/types';
import {
  isSupportedFile, resolveFilename, readFileAsBase64,
  normalizeImageFile, renderPdfThumbnail, renderImageThumbnail, computeFileHash,
} from '@/lib/vault/helpers';
import { fetchDocuments, uploadFileApi, analyzeFileApi, saveThumbnailApi, deleteDocument, updateDocument } from '@/lib/services/documents';
import { VaultSummaryBar, BulkProgressBar, IngestionHub, DocumentRow, DuplicateDialog, SemanticMatchToast } from '@/components/vault';

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return size === 'lg' ? (
    <div className="w-8 h-8 border-4 border-zen-sage/30 border-t-zen-sage rounded-full animate-spin" />
  ) : (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

// ─── PrivateValue ─────────────────────────────────────────────────────────────

function PrivateValue({ value }: { value: string }) {
  const { privacyMode } = useSettings();
  if (!privacyMode) return <>{value}</>;
  return (
    <span className="blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none" title="Hover to reveal">
      {value}
    </span>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

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

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown className="w-3 h-3 opacity-30" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-zen-sage" />
    : <ChevronDown className="w-3 h-3 text-zen-sage" />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

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

// ─── ValidationDot ────────────────────────────────────────────────────────────

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

// ─── ErrorToast ───────────────────────────────────────────────────────────────

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

// ─── Sort helpers ─────────────────────────────────────────────────────────────

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

// ─── VaultTable ───────────────────────────────────────────────────────────────

function VaultTable({ docs, token, onDelete, onUpdate }: { docs: VaultDoc[]; token: string; onDelete: (id: string) => void; onUpdate: (updated: VaultDoc) => void }) {
  const { lang } = useSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>('uploaded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const hasInsurance = docs.some(d => d.document_type === 'insurance');

  const toggle = useCallback((id: string) => setExpandedId(prev => prev === id ? null : id), []);

  const handleSort = useCallback((col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }, [sortCol]);

  const sorted = useMemo(() => sortDocs(docs, sortCol, sortDir), [docs, sortCol, sortDir]);

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
            <DocumentRow
              key={doc.id}
              doc={doc}
              token={token}
              onDelete={onDelete}
              onUpdate={onUpdate}
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

  // ── Deduplication state ─────────────────────────────────────────────────────────────────────────────
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
    fetchDocuments(session.access_token)
      .then(documents => setDocs(documents))
      .catch(() => setDocs([]))
      .finally(() => setLoadingLibrary(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    if (!session) return;
    // Accept by extension OR by MIME type (handles iOS photos with no/unknown extension)
    const supported = files.filter(f => isSupportedFile(f.name) || f.type.startsWith('image/') || f.type === 'application/pdf');
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

        // Normalize: convert HEIC/HEIF → JPEG on the client before uploading
        const normalizedFile = await normalizeImageFile(job.originalFile);
        const normalizedName = normalizedFile !== job.originalFile
          ? resolveFilename(normalizedFile.name, new Set(docs.map(d => d.file_name)))
          : job.resolvedName;

        const base64 = await readFileAsBase64(normalizedFile);

        const fileHash = await computeFileHash(normalizedFile);

        // Tier 1: Check for byte-level duplicate
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
          // replace: re-upload with force=true (deletes old doc server-side)
          await uploadFileApi(normalizedName, base64, token, fileHash, true);
          setDocs(prev => prev.filter(d => d.id !== uploadResult.existingDoc!.id));
        }

        const d = await analyzeFileApi(normalizedName, normalizedFile.type, token, fileHash);

        const supabaseId: string = d.supabaseId ?? '';
        const newDoc: VaultDoc = {
          id: supabaseId,
          file_name: normalizedName,
          document_type: d.document_type ?? 'other',
          summary_he: d.summary_he ?? null,
          summary_en: d.summary_en ?? null,
          raw_analysis: d.raw_metadata ?? null,
          thumbnail_url: null,
          created_at: new Date().toISOString(),
          user_notes: null,
        };
        setDocs(prev => [newDoc, ...prev.filter(p => p.id !== supabaseId)]);
        setUploadQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' } : j));

        // Tier 2: Show semantic match toast
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
  };

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
    } catch {
      // Silently fail — user keeps both
    }
  };

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'] },
    noClick: true,
    noKeyboard: true,
  });

  const isUploading = uploadQueue.some(j => j.status === 'queued' || j.status === 'analyzing');
  const handleDelete = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));
  const handleUpdate = (updated: VaultDoc) => setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));

  const q = search.toLowerCase();
  const filtered = useMemo(() => docs.filter(d =>
    d.file_name.toLowerCase().includes(q) ||
    d.document_type.toLowerCase().includes(q) ||
    String(d.raw_analysis?.provider ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.merchant ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.insurer ?? '').toLowerCase().includes(q) ||
    String(d.raw_analysis?.institution ?? '').toLowerCase().includes(q) ||
    (d.user_notes ?? '').toLowerCase().includes(q)
  ), [docs, q]);

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

        {/* Tier 1: Duplicate dialog */}
        {tier1Conflict && (
          <DuplicateDialog
            filename={tier1Conflict.filename}
            existing={tier1Conflict.existing}
            onViewOriginal={() => tier1Conflict.resolve('view')}
            onReplace={() => tier1Conflict.resolve('replace')}
            onCancel={() => tier1Conflict.resolve('cancel')}
          />
        )}

        {/* Tier 2: Semantic match toasts (show one at a time) */}
        {semanticNotifications[0] && (
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
            <VaultTable docs={filtered} token={session?.access_token ?? ''} onDelete={handleDelete} onUpdate={handleUpdate} />
          ) : (
            <EmptyState isSearch={search.length > 0} />
          )}
        </main>
      </div>
      <BulkProgressBar queue={uploadQueue} />
    </SettingsContext.Provider>
  );
}
