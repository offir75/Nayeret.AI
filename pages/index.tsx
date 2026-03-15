import Head from 'next/head';
import { Settings, Loader2, ScanLine, X, Eye, EyeOff, MoreVertical, RotateCcw, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/supabase/browser';
import type { User, Session } from '@supabase/supabase-js';

import { translations, type TranslationKey } from '@/lib/vault/translations';
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
import DocumentModal from '@/components/vault/DocumentModal';
import IngestionHub from '@/components/vault/IngestionHub';
import { enrichDocs, enrichDoc } from '@/lib/vault/docAdapter';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { FixerSidebar } from '@/components/dashboard/FixerSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettingsDrawer } from '@/components/dashboard/SettingsDrawer';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { MetricCards } from '@/components/dashboard/MetricCards';
import type { MetricFilter } from '@/components/dashboard/MetricCards';
import { CriticalTimeline } from '@/components/dashboard/CriticalTimeline';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { EngagementBar } from '@/components/dashboard/EngagementBar';
import { MilestoneCard } from '@/components/dashboard/MilestoneCard';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { GlobalSearch } from '@/components/dashboard/GlobalSearch';
import { DocumentTable } from '@/components/dashboard/DocumentTable';
import { FilterEmptyState } from '@/components/dashboard/FilterEmptyState';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';

// Chart components use recharts (ESM) — must be dynamically imported to avoid SSR issues
const SpendingInsights = dynamic(
  () => import('@/components/dashboard/SpendingInsights').then(m => ({ default: m.SpendingInsights })),
  { ssr: false },
);
const IncomeExpenseChart = dynamic(
  () => import('@/components/dashboard/IncomeExpenseChart').then(m => ({ default: m.IncomeExpenseChart })),
  { ssr: false },
);
const TaxSummaryCard = dynamic(
  () => import('@/components/dashboard/TaxSummaryCard').then(m => ({ default: m.TaxSummaryCard })),
  { ssr: false },
);
const BankReconciliation = dynamic(
  () => import('@/components/dashboard/BankReconciliation').then(m => ({ default: m.BankReconciliation })),
  { ssr: false },
);

import { CaptureZone } from '@/components/dashboard/CaptureZone';

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return size === 'lg' ? (
    <div className="w-8 h-8 border-4 border-zen-sage/30 border-t-zen-sage rounded-full animate-spin" />
  ) : (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type DashboardTabId = 'documents' | 'milestones' | 'income-expense' | 'spending' | 'tax' | 'reconciliation';

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
  const [selectedDoc, setSelectedDoc] = useState<RichDoc | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [fullViewDoc, setFullViewDoc] = useState<VaultDoc | null>(null);
  const [metricFilter, setMetricFilter] = useState<MetricFilter>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>('documents');
  const [taxJumpDate, setTaxJumpDate] = useState<{ year: number; month: number } | null>(null);
  const isMobile = useIsMobile();
  const swipeTabRef = useRef<{ x: number; y: number } | null>(null);

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

  // ── Onboarding state ─────────────────────────────────────────────────────────
  useEffect(() => {
    try { setOnboarded(localStorage.getItem('nayeret_onboarded') === 'true'); } catch { setOnboarded(true); }
  }, []);

  // ── Handle redirect from /capture ────────────────────────────────────────────
  useEffect(() => {
    if (router.query.docAdded !== '1') return;
    const targetId = typeof router.query.openDoc === 'string' ? router.query.openDoc : null;
    void router.replace('/');
    // Store targetId immediately so retry effect can open it once docs/session are ready
    if (targetId) setOpenDocId(targetId);
    if (!session) return;
    const token = session.access_token;
    // Uploads are complete before /capture redirects here, so a short delay is enough
    setTimeout(() => {
      fetchDocuments(token).then(docs => {
        setDocs(docs);
        if (targetId) {
          const match = enrichDocs(docs).find(d => d.id === targetId);
          if (match) { setSelectedDoc(match); setOpenDocId(null); }
          // else: openDocId stays set → retry effect fires when richDocs updates
        }
      }).catch(() => {});
    }, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.docAdded]);

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
          ui_category: null,
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

  // Route dropped/picked files through the capture wizard instead of direct upload
  const handleCaptureZoneFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => isSupportedFile(f.name) || f.type.startsWith('image/') || f.type === 'application/pdf');
    if (valid.length === 0) return;
    const dataUrls = await Promise.all(valid.map(f => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.readAsDataURL(f);
    })));
    sessionStorage.setItem('captureFiles', JSON.stringify(dataUrls));
    void router.push('/capture');
  }, [router]);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleCaptureZoneFiles,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'] },
    noClick: true,
    noKeyboard: true,
  });

  const isUploading = uploadQueue.some(j => j.status === 'queued' || j.status === 'analyzing');
  const handleDelete = useCallback(async (id: string) => {
    if (!session?.access_token) return;
    await deleteDocument(id, session.access_token); // throws on failure — callers handle the error
    setDocs(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  }, [session, selectedDoc]);
  const handleUpdate = (updated: VaultDoc) => {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDoc(prev => prev?.id === updated.id ? enrichDoc(updated) : prev);
    setFullViewDoc(prev => prev?.id === updated.id ? updated : prev);
  };

  // Bridge: FixerSidebar works with RichDoc; persists changes via the API then syncs local state.
  const handleFixerUpdate = useCallback((updatedDoc: RichDoc) => {
    // Detect tax_tagged transition to true so we can auto-navigate
    const prev = docs.find(d => d.id === updatedDoc.id);
    const prevTagged = !!(prev?.raw_analysis as Record<string, unknown> | null)?.tax_tagged
                    || !!(prev?.insights   as Record<string, unknown> | null)?.tax_tagged;
    const taxJustTagged = updatedDoc.tax_tagged === true && !prevTagged;

    // Optimistic update
    setSelectedDoc(updatedDoc);
    setDocs(prev => prev.map(d => d.id === updatedDoc.id ? (updatedDoc as unknown as VaultDoc) : d));

    if (taxJustTagged) {
      const dateStr = updatedDoc.issue_date || updatedDoc.created_at?.split('T')[0];
      const d = dateStr ? new Date(dateStr) : new Date();
      setTaxJumpDate({ year: d.getFullYear(), month: d.getMonth() });
      setActiveTab('tax');
    }

    if (!session) return;
    // Persist to DB: write user-edited fields back into raw_analysis so the adapter picks them up
    updateDocument(
      updatedDoc.id,
      {
        user_notes:  updatedDoc.user_notes ?? undefined,
        ui_category: updatedDoc.ui_category ?? undefined,
        raw_analysis: {
          ...updatedDoc.raw_analysis,
          total_amount:     updatedDoc.amount,
          due_date:         updatedDoc.due_date,
          tax_tagged:       updatedDoc.tax_tagged,
          transaction_type: updatedDoc.transaction_type,
        },
      },
      session.access_token,
    ).then(saved => handleUpdate(saved)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, docs]);

  // Handler for DocumentTable inline updates (tax tag, transaction type).
  // Persists the changed field into raw_analysis so enrichDoc picks it up after reload.
  const handleDocTableUpdate = useCallback((updatedRichDoc: RichDoc) => {
    const prev = docs.find(d => d.id === updatedRichDoc.id);
    const prevTagged = !!(prev?.raw_analysis as Record<string, unknown> | null)?.tax_tagged
                    || !!(prev?.insights   as Record<string, unknown> | null)?.tax_tagged;
    const taxJustTagged = updatedRichDoc.tax_tagged === true && !prevTagged;

    // Write derived fields back into raw_analysis for correct re-enrichment
    const patchedVaultDoc: VaultDoc = {
      ...(updatedRichDoc as unknown as VaultDoc),
      raw_analysis: {
        ...(prev?.raw_analysis as Record<string, unknown> ?? {}),
        tax_tagged:       updatedRichDoc.tax_tagged,
        transaction_type: updatedRichDoc.transaction_type,
      },
    };
    handleUpdate(patchedVaultDoc);

    if (taxJustTagged) {
      const dateStr = updatedRichDoc.issue_date || updatedRichDoc.created_at?.split('T')[0];
      const d = dateStr ? new Date(dateStr) : new Date();
      setTaxJumpDate({ year: d.getFullYear(), month: d.getMonth() });
      setActiveTab('tax');
    }

    if (!session) return;
    updateDocument(
      updatedRichDoc.id,
      {
        raw_analysis: {
          ...(prev?.raw_analysis as Record<string, unknown> ?? {}),
          tax_tagged:       updatedRichDoc.tax_tagged,
          transaction_type: updatedRichDoc.transaction_type,
        },
      },
      session.access_token,
    ).then(saved => handleUpdate(saved)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, docs]);

  const richDocs = useMemo(() => enrichDocs(docs), [docs]);

  // Open a specific doc after redirect from /capture (card click)
  useEffect(() => {
    if (!openDocId || richDocs.length === 0) return;
    const match = richDocs.find(d => d.id === openDocId);
    if (match) { setSelectedDoc(match); setOpenDocId(null); }
  }, [openDocId, richDocs]);

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

  const isSearching = search.length > 0;

  const displayedRichDocs = useMemo(() => {
    let result = richDocs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.file_name.toLowerCase().includes(q) ||
        r.document_type.toLowerCase().includes(q) ||
        (r.provider ?? '').toLowerCase().includes(q) ||
        (r.original_filename ?? '').toLowerCase().includes(q)
      );
    }
    if (!metricFilter) return result;
    return result.filter(r => {
      switch (metricFilter) {
        case 'upcoming':  return !!r.due_date;
        case 'tax':       return r.tax_tagged;
        case 'income':    return r.transaction_type === 'income';
        case 'expense':   return r.transaction_type === 'expense';
        case 'assets':    return r.ui_category === 'Money' || r.ui_category === 'Trips & Tickets';
        case 'pending':   return !r.reviewed;
        default:          return true;
      }
    });
  }, [richDocs, search, metricFilter]);

  // ── Dashboard tab helpers ──────────────────────────────────────────────────

  const TABS: Array<{ id: DashboardTabId; labelHe: string; labelEn: string }> = [
    { id: 'documents',      labelHe: 'מסמכים',            labelEn: 'Documents'          },
    { id: 'milestones',     labelHe: 'אבני דרך',           labelEn: 'Milestones'         },
    { id: 'tax',            labelHe: 'תיק מס',             labelEn: 'Tax Folder'         },
    { id: 'spending',       labelHe: 'תובנות הוצאות',      labelEn: 'Spending Insights'  },
    { id: 'income-expense', labelHe: 'הכנסות מול הוצאות',  labelEn: 'Income vs Expenses' },
    { id: 'reconciliation', labelHe: 'התאמת בנק',          labelEn: 'Bank Reconciliation'},
  ];

  const moveTab = useCallback((direction: 1 | -1) => {
    setActiveTab(prev => {
      const idx = TABS.findIndex(t => t.id === prev);
      const next = idx + direction;
      if (next < 0 || next >= TABS.length) return prev;
      return TABS[next].id;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || docs.length === 0) return;
    swipeTabRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [isMobile, docs.length]);

  const handleTabTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || docs.length === 0 || !swipeTabRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeTabRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeTabRef.current.y;
    swipeTabRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    // RTL: swipe left = next tab, swipe right = prev tab (same as LTR because tabs scroll horizontally)
    moveTab(dx < 0 ? 1 : -1);
  }, [isMobile, docs.length, moveTab]);

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

  const ctx: SettingsCtx = {
    lang, setLang, privacyMode, setPrivacyMode, alertDays, setAlertDays, currency, setCurrency,
    t: (key: string) => translations[key as TranslationKey]?.[lang] ?? key,
    isRtl: lang === 'he',
  };
  const initials = (user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase();

  return (
    <SettingsContext.Provider value={ctx}>
      <Head><title>Nayeret.AI</title></Head>

      {onboarded === false && (
        <OnboardingWizard onComplete={() => {
          try { localStorage.setItem('nayeret_onboarded', 'true'); } catch {}
          setOnboarded(true);
        }} />
      )}

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

        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} onLogout={handleLogout} />

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

        <FixerSidebar
          document={selectedDoc}
          documents={displayedRichDocs}
          open={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdateDoc={handleFixerUpdate}
          onDelete={(doc) => { void handleDelete(doc.id); }}
          onNavigate={(doc) => setSelectedDoc(doc)}
          token={session?.access_token ?? ''}
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
          className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-xl"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
            {/* ── Left: user identity pill (WorkspaceSwitcher-style) + desktop search ── */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <WorkspaceSwitcher
                lang={lang}
                userName={(user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Nayeret.AI'}
                userEmail={user.email ?? ''}
                avatarNode={
                  <div className="w-8 h-8 rounded-full bg-zen-sage/20 flex items-center justify-center text-xs font-semibold text-zen-stone overflow-hidden">
                    {user.user_metadata?.avatar_url && !headerAvatarError ? (
                      <img
                        src={user.user_metadata.avatar_url as string}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={() => setHeaderAvatarError(true)}
                      />
                    ) : initials}
                  </div>
                }
              />
              <div className="hidden sm:block flex-1 max-w-xs">
                <GlobalSearch value={search} onChange={setSearch} />
              </div>
            </div>

            {/* ── Right: actions ── */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Scan — always visible on desktop; mobile uses MobileBottomNav */}
              <button
                onClick={() => void router.push('/capture')}
                className="hidden sm:flex h-9 items-center gap-2 rounded-xl bg-zen-sage px-4 text-sm font-medium text-white transition-colors hover:bg-zen-sage/90"
              >
                <ScanLine className="h-4 w-4" />
                {lang === 'he' ? 'סרוק' : 'Scan'}
              </button>
              <NotificationBell documents={richDocs} onDocClick={(doc: RichDoc) => setSelectedDoc(doc)} />
              {/* Privacy mode toggle */}
              <button
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  privacyMode
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={privacyMode
                  ? (lang === 'he' ? 'הצג סכומים' : 'Show amounts')
                  : (lang === 'he' ? 'הסתר סכומים' : 'Hide amounts')}
              >
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {/* Settings button — always visible */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex w-9 h-9 rounded-xl bg-muted/50 items-center justify-center hover:bg-muted transition-colors cursor-pointer shrink-0"
                title={lang === 'he' ? 'הגדרות' : 'Settings'}
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
              {/* Overflow menu — desktop */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="hidden sm:flex w-9 h-9 rounded-xl bg-muted/50 items-center justify-center hover:bg-muted transition-colors cursor-pointer shrink-0">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1">
                  <button
                    onClick={() => { setOnboarded(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    {lang === 'he' ? 'הפעל מחדש' : 'Reset & Restart'}
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    onClick={() => void supabase.auth.signOut()}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {lang === 'he' ? 'התנתק' : 'Sign out'}
                  </button>
                </PopoverContent>
              </Popover>
              {/* Overflow menu — mobile */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="sm:hidden w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer shrink-0">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1">
                  <button
                    onClick={() => void router.push('/capture')}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <ScanLine className="w-4 h-4 text-muted-foreground" />
                    {lang === 'he' ? 'סרוק מסמך' : 'Scan Document'}
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    {lang === 'he' ? 'הגדרות' : 'Settings'}
                  </button>
                  <button
                    onClick={() => { setOnboarded(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    {lang === 'he' ? 'הפעל מחדש' : 'Reset & Restart'}
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    onClick={() => void supabase.auth.signOut()}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {lang === 'he' ? 'התנתק' : 'Sign out'}
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Mobile search row */}
          {docs.length > 0 && (
            <div className="sm:hidden px-3 pb-2.5">
              <GlobalSearch value={search} onChange={setSearch} />
            </div>
          )}
        </motion.header>

        {/* ── Main content ── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          <ErrorBoundary>
            <IngestionHub queue={uploadQueue} lang={lang} onCancel={id => {
              cancelledIds.current.add(id);
              setUploadQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' } : j));
            }} />
          </ErrorBoundary>

          {/* MetricCards — 4-column stat grid */}
          {!loadingLibrary && docs.length > 0 && (
            <MetricCards documents={richDocs} activeFilter={metricFilter} onFilterChange={setMetricFilter} />
          )}

          {!loadingLibrary && docs.length > 0 && (
            <VaultSummaryBar docs={docs} />
          )}

          {loadingLibrary ? (
            <DashboardSkeleton />
          ) : docs.length === 0 && !isSearching ? (
            <EmptyState onFiles={handleCaptureZoneFiles} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="space-y-6 pb-28"
            >
            {/* ── Dashboard tab bar ── */}
              {!isSearching && (
                <div className="sticky top-[3.2rem] sm:top-[3.7rem] z-20 bg-background/80 backdrop-blur-md border-b border-border/40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 overflow-x-auto scrollbar-thin">
                  <div className="flex items-center gap-1.5 min-w-max">
                    {TABS.map((tab) => {
                      const active = tab.id === activeTab;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-3.5 py-1.5 sm:px-3.5 sm:py-1 rounded-full text-sm sm:text-xs font-semibold tracking-wide transition-all whitespace-nowrap border ${
                            active
                              ? 'bg-primary/12 text-primary border-primary/30 shadow-sm'
                              : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {lang === 'he' ? tab.labelHe : tab.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Tab content panels ── */}
              {!isSearching && (
                <div onTouchStart={handleTabTouchStart} onTouchEnd={handleTabTouchEnd}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {activeTab === 'documents'      && <CriticalTimeline documents={displayedRichDocs} onDocClick={(doc) => setSelectedDoc(doc)} />}
                      {activeTab === 'milestones'     && <div className="space-y-6"><EngagementBar documents={richDocs} /><MilestoneCard documents={richDocs} /></div>}
                      {activeTab === 'income-expense' && <IncomeExpenseChart documents={richDocs} />}
                      {activeTab === 'spending'       && <SpendingInsights documents={richDocs} />}
                      {activeTab === 'tax'            && <TaxSummaryCard documents={richDocs} onDocClick={(doc) => setSelectedDoc(doc)} initialYear={taxJumpDate?.year} initialMonth={taxJumpDate?.month} />}
                      {activeTab === 'reconciliation' && <BankReconciliation documents={richDocs} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* ── Upload drop zone — same width as the table below ── */}
              {!isSearching && (
                <CaptureZone onFiles={handleCaptureZoneFiles} isDragActive={isDragActive} lang={lang} />
              )}

              {/* Documents section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
                    {isSearching
                      ? (lang === 'he' ? `תוצאות חיפוש (${displayedRichDocs.length})` : `Search results (${displayedRichDocs.length})`)
                      : (lang === 'he' ? `מסמכים (${displayedRichDocs.length})` : `Documents (${displayedRichDocs.length})`)}
                  </h2>
                  {metricFilter && (
                    <button onClick={() => setMetricFilter(null)} className="text-xs text-primary hover:underline font-medium">
                      {lang === 'he' ? 'נקה סינון' : 'Clear filter'}
                    </button>
                  )}
                </div>
                {displayedRichDocs.length === 0 ? (
                  <FilterEmptyState
                    metricFilter={metricFilter}
                    search={search}
                    lang={lang}
                    t={(key) => translations[key as TranslationKey]?.[lang] ?? key}
                    onClearFilter={() => setMetricFilter(null)}
                    onClearSearch={() => setSearch('')}
                  />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${metricFilter ?? 'all'}-${isSearching ? 'search' : 'browse'}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ErrorBoundary>
                        <DocumentTable
                          documents={displayedRichDocs}
                          onDocClick={(doc) => setSelectedDoc(doc)}
                          onDeleteDoc={(doc) => handleDelete(doc.id)}
                          onUpdateDoc={handleDocTableUpdate}
                        />
                      </ErrorBoundary>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav
          onSettingsOpen={() => setSettingsOpen(true)}
          hasDocuments={docs.length > 0}
          canUpload={!isUploading}
        />
      </div>
    </SettingsContext.Provider>
  );
}
