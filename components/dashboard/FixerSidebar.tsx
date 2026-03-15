import { X, AlertTriangle, FileText, Pencil, Trash2, Maximize2, MessageSquare, ChevronLeft, ChevronRight, Bell, BellOff, Share2, Mail, Copy, MessageCircle, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { DashboardCategoryBadge } from './DashboardCategoryBadge';
import { CATEGORY_MAP } from '@/lib/vault/categoryMap';
import { formatLocalizedDate } from '@/lib/dateUtils';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/context/settings';
import { CurrencyAmount } from '@/components/ui/currency-amount';

// ─── Inline currency symbols ─────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

// ─── Hook: swipe navigation ───────────────────────────────────────────────────

function useSwipeNavigation(onPrev: () => void, onNext: () => void, isRtl: boolean) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) { if (isRtl) onPrev(); else onNext(); }
    else        { if (isRtl) onNext(); else onPrev(); }
  }, [onPrev, onNext, isRtl]);
  return { onTouchStart, onTouchEnd };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixerSidebarProps {
  document: RichDoc | null;
  documents?: RichDoc[];
  open: boolean;
  onClose: () => void;
  onDelete?: (doc: RichDoc) => void;
  onUpdateDoc?: (doc: RichDoc) => void;
  onNavigate?: (doc: RichDoc) => void;
  token: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDocName(doc: RichDoc, lang: string): string {
  const insightsHe = (doc.insights?.document_type_name_he ?? doc.raw_analysis?.document_type_name_he) as string | null | undefined;
  const insightsEn = (doc.insights?.document_type_name_en ?? doc.raw_analysis?.document_type_name_en) as string | null | undefined;
  if (lang === 'en' && insightsEn) return insightsEn;
  if (insightsHe) return insightsHe;
  return doc.document_type;
}

function getDocSummary(doc: RichDoc, lang: string): string {
  return (lang === 'en' ? doc.summary_en : doc.summary_he) ?? '';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { value: '0',  labelEn: 'No reminder',    labelHe: 'ללא תזכורת'   },
  { value: '1',  labelEn: '1 day before',   labelHe: 'יום לפני'     },
  { value: '3',  labelEn: '3 days before',  labelHe: '3 ימים לפני'  },
  { value: '7',  labelEn: '1 week before',  labelHe: 'שבוע לפני'    },
  { value: '14', labelEn: '2 weeks before', labelHe: 'שבועיים לפני' },
  { value: '30', labelEn: '1 month before', labelHe: 'חודש לפני'    },
];

function DocReminderControl({ docId, hasDueDate, lang }: { docId: string; hasDueDate: boolean; lang: string }) {
  const [value, setValue] = useState(() => {
    try { const map = JSON.parse(localStorage.getItem('nayeret_doc_reminders') || '{}'); return map[docId] || '0'; }
    catch { return '0'; }
  });

  const handleChange = (v: string) => {
    setValue(v);
    try {
      const map = JSON.parse(localStorage.getItem('nayeret_doc_reminders') || '{}');
      map[docId] = v;
      localStorage.setItem('nayeret_doc_reminders', JSON.stringify(map));
    } catch {}
    toast.success(v === '0'
      ? (lang === 'en' ? 'Reminder removed' : 'תזכורת הוסרה')
      : (lang === 'en' ? 'Reminder set' : 'תזכורת הוגדרה'));
  };

  if (!hasDueDate) return null;
  const active = value !== '0';

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {active ? <Bell className="w-3 h-3 text-primary" /> : <BellOff className="w-3 h-3" />}
        {lang === 'en' ? 'Reminder' : 'תזכורת'}
      </Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className={`bg-muted/50 border-border text-foreground ${active ? 'border-primary/40' : ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {REMINDER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {lang === 'en' ? opt.labelEn : opt.labelHe}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DocThumbnail({ doc, onClick }: { doc: RichDoc; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[3/4] max-h-48 rounded-xl border border-border/50 bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
    >
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 bg-foreground/10 rounded" />
        <div className="h-2 w-full bg-foreground/5 rounded" />
        <div className="h-2 w-5/6 bg-foreground/5 rounded" />
        <div className="h-2 w-full bg-foreground/5 rounded" />
        <div className="h-2 w-2/3 bg-foreground/5 rounded" />
        <div className="mt-3 h-2.5 w-1/2 bg-primary/10 rounded" />
        <div className="h-2 w-full bg-foreground/5 rounded" />
        <div className="h-2 w-4/5 bg-foreground/5 rounded" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <FileText className="w-20 h-20 text-foreground" />
      </div>
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Maximize2 className="w-4 h-4" />
          {t('viewDocument')}
        </div>
      </div>
      <div className="absolute bottom-2 end-2 bg-background/80 backdrop-blur-sm text-[10px] font-mono px-2 py-0.5 rounded-md text-muted-foreground">
        {doc.original_filename}
      </div>
    </button>
  );
}

function FullScreenViewer({
  doc, open, onClose, onDelete, onToggleTax,
  amount, setAmount, dueDate, setDueDate, category, setCategory, userNotes, setUserNotes,
  onSave, onPrev, onNext, hasPrev, hasNext, swipeHandlers, isDirty, token,
}: {
  doc: RichDoc; open: boolean; onClose: () => void; onDelete: () => void; onToggleTax: () => void;
  amount: string; setAmount: (v: string) => void;
  dueDate: string; setDueDate: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  userNotes: string; setUserNotes: (v: string) => void;
  onSave: () => void;
  onPrev?: () => void; onNext?: () => void; hasPrev: boolean; hasNext: boolean;
  swipeHandlers?: { onTouchStart: (e: React.TouchEvent) => void; onTouchEnd: (e: React.TouchEvent) => void };
  isDirty: boolean;
  token: string;
}) {
  const { t, lang, isRtl } = useLanguage();
  const evidence = (doc.insights?._field_evidence ?? {}) as Record<string, { source: string; value: string; page?: number }>;
  const warnings = (doc.insights?.warnings ?? []) as string[];
  const docName = getDocName(doc, lang);
  const fileUrl = token ? `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}` : null;
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const [viewerLoaded, setViewerLoaded] = useState(false);
  useEffect(() => { setViewerLoaded(false); }, [fileUrl]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[98vw] w-[100vw] sm:w-[98vw] h-[100dvh] sm:h-[92vh] sm:rounded-xl rounded-none p-0 bg-background border-border overflow-hidden flex flex-col [&>button]:hidden"
        onTouchStart={swipeHandlers?.onTouchStart} onTouchEnd={swipeHandlers?.onTouchEnd}
      >
        {/* Header */}
        <div className="border-b border-border/50 shrink-0 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev} disabled={!hasPrev}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={onNext} disabled={!hasNext}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex-1 min-w-0 text-end">
            <h2 className="text-sm font-bold text-foreground truncate">{docName}</h2>
            <span className="text-[11px] text-muted-foreground">{doc.provider} · {doc.original_filename}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-muted/20">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            {/* Document preview panel */}
            <div className={`min-h-0 overflow-hidden flex flex-col ${isRtl ? 'lg:order-1' : 'lg:order-2'}`}>
              <div className="relative flex-1 min-h-[40vh] overflow-hidden bg-card/60">
                {/* Shimmer skeleton — shown while file is loading or unavailable */}
                {(!fileUrl || !viewerLoaded) && (
                  <div className="absolute inset-0 z-10 p-6 sm:p-10 space-y-3 bg-card/60">
                    <div className="h-4 w-3/4 rounded bg-foreground/10 animate-pulse" />
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-5/6 rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
                    <div className="mt-6 h-3.5 w-1/2 rounded bg-primary/10 animate-pulse" />
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-foreground/5 animate-pulse" />
                    <div className="mt-6 h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-5/6 rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-foreground/5 animate-pulse" />
                  </div>
                )}
                {fileUrl && isPdf && (
                  <iframe
                    src={`${fileUrl}#pagemode=none`}
                    className="w-full h-full border-0"
                    title={docName}
                    onLoad={() => setViewerLoaded(true)}
                  />
                )}
                {fileUrl && !isPdf && (
                  <img
                    src={fileUrl}
                    alt={docName}
                    className={`w-full h-full object-contain transition-opacity duration-300 ${viewerLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setViewerLoaded(true)}
                  />
                )}
              </div>
            </div>

            {/* Detail / edit panel */}
            <div className={`min-h-0 overflow-y-auto border-t lg:border-t-0 border-border/50 bg-card/70 ${isRtl ? 'lg:order-2 lg:border-l' : 'lg:order-1 lg:border-r'}`}>
              <div className="p-4 sm:p-5 space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <DashboardCategoryBadge category={doc.ui_category} />
                  <ReviewStatusBadge reviewed={doc.reviewed} />
                  {doc.amount != null && (
                    <CurrencyAmount
                      value={Number(doc.amount)}
                      currency={doc.currency || 'ILS'}
                      className="font-semibold text-foreground text-sm"
                    />
                  )}
                  {(doc.due_date || doc.issue_date) && (
                    <span>{formatLocalizedDate(doc.due_date || doc.issue_date, lang)}</span>
                  )}
                </div>

                {/* Summary */}
                <div className="glass-card p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground tracking-wide">{t('summary')}</h3>
                  <p className="text-sm text-foreground leading-relaxed" style={{ fontSize: '0.9375rem', lineHeight: '1.75' }}>
                    {getDocSummary(doc, lang)}
                  </p>
                </div>

                {/* Tax toggle */}
                <button
                  onClick={onToggleTax}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    doc.tax_tagged
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : 'bg-muted/40 border border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {doc.tax_tagged ? t('removeFromTax') : t('addToTax')}
                </button>

                {/* Share buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={() => {
                    const text = `${docName} — ${doc.provider}\n${getDocSummary(doc, lang)}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}>
                    <MessageCircle className="w-3.5 h-3.5" />{t('shareViaWhatsApp')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={() => {
                    const subject = encodeURIComponent(docName);
                    const body = encodeURIComponent(`${docName} — ${doc.provider}\n\n${getDocSummary(doc, lang)}`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  }}>
                    <Mail className="w-3.5 h-3.5" />{t('shareViaEmail')}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                    navigator.clipboard.writeText(`${docName} — ${doc.provider}\n${getDocSummary(doc, lang)}`);
                    toast.success(t('linkCopied'));
                  }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="bg-urgent/5 border border-urgent/30 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-urgent text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />{t('warnings')}
                    </div>
                    {warnings.map((w, i) => (
                      <p key={i} className="text-xs text-urgent/80">{w}</p>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />{t('comment')}
                  </Label>
                  <Input
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder={t('addComment')}
                    className="bg-muted/50 border-border text-foreground text-sm h-9"
                  />
                </div>

                {/* Editable fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground tracking-wide">{t('editFields')}</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('amount')}</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm text-muted-foreground ${doc.currency === 'ILS' || !doc.currency ? 'currency-ils-symbol' : 'font-mono'}`}>
                        {CURRENCY_SYMBOLS[doc.currency || 'ILS'] || ''}
                      </span>
                      <Input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-muted/50 border-border text-foreground font-mono"
                        type="number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('dueDate')}</Label>
                    <Input
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-muted/50 border-border text-foreground font-mono"
                      type="date"
                    />
                  </div>
                  <DocReminderControl docId={doc.id} hasDueDate={!!dueDate} lang={lang} />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('category')}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-muted/50 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {lang === 'en' ? val.en : val.he}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Field evidence */}
                {Object.keys(evidence).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground tracking-wide flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />{t('fieldEvidence')}
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(evidence).filter(([, ev]) => ev != null).map(([field, ev]) => (
                        <div key={field} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-muted-foreground">{field}</span>
                            <span className="mx-2 text-border">→</span>
                            <span className="text-foreground font-medium font-mono">
                              {typeof ev.value === 'object' ? JSON.stringify(ev.value) : ev.value}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{ev.source}</span>
                            {ev.page && <span>{t('page')} {ev.page}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={onSave}
                    disabled={!isDirty && !!doc.reviewed}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {doc.reviewed ? t('updateDoc') : t('approveAndSave')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                        <Trash2 className="w-4 h-4" />{t('deleteDocument')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDocConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('deleteDocConfirmDesc')} &quot;{docName}&quot; {t('deleteDocConfirmFrom')}{doc.provider}? {t('deleteDocConfirmAction')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t('deleteText')}
                        </AlertDialogAction>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FixerSidebar({ document: doc, documents = [], open, onClose, onDelete, onUpdateDoc, onNavigate, token }: FixerSidebarProps) {
  const { t, lang, isRtl } = useLanguage();
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [userNotes, setUserNotes] = useState('');

  useEffect(() => {
    if (doc) {
      setAmount(doc.amount?.toString() || '');
      setDueDate(doc.due_date || '');
      setCategory(doc.ui_category ?? '');
      setUserNotes(doc.user_notes || '');
    }
  }, [doc?.id]);

  const isDirty = doc ? (
    amount     !== (doc.amount?.toString() || '') ||
    dueDate    !== (doc.due_date || '') ||
    category   !== (doc.ui_category ?? '') ||
    userNotes  !== (doc.user_notes || '')
  ) : false;

  const currentIdx = doc ? documents.findIndex((d) => d.id === doc.id) : -1;
  const hasPrev    = currentIdx > 0;
  const hasNext    = currentIdx >= 0 && currentIdx < documents.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev && onNavigate && doc) { onNavigate(documents[currentIdx - 1]); }
  }, [hasPrev, onNavigate, documents, currentIdx, doc]);

  const goNext = useCallback(() => {
    if (hasNext && onNavigate && doc) { onNavigate(documents[currentIdx + 1]); }
  }, [hasNext, onNavigate, documents, currentIdx, doc]);

  // Keyboard navigation (ArrowLeft/Right respects RTL)
  useEffect(() => {
    if (!open || !doc) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
      const nextKey = isRtl ? 'ArrowLeft'  : 'ArrowRight';
      if (e.key === prevKey) { e.preventDefault(); goPrev(); }
      else if (e.key === nextKey) { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, doc, goPrev, goNext, isRtl]);

  const swipeHandlers = useSwipeNavigation(goPrev, goNext, isRtl);

  if (!doc) return null;

  const handleSave = () => {
    try {
      if (doc && onUpdateDoc) {
        onUpdateDoc({
          ...doc,
          amount:     amount ? Number(amount) : null,
          due_date:   dueDate || null,
          ui_category: category,
          user_notes:  userNotes,
          reviewed:    true,
        });
      }
      toast.success(doc.reviewed ? t('docUpdated') : t('approveAndSave'), {
        description: t('docUpdatedDesc'),
      });
      onClose();
    } catch {
      toast.error(t('failedToSave'));
    }
  };

  const handleDelete = () => {
    try {
      onDelete?.(doc);
      onClose();
    } catch {
      toast.error(t('failedToDelete'));
    }
  };

  const handleToggleTax = () => {
    if (!doc || !onUpdateDoc) return;
    const next = !doc.tax_tagged;
    onUpdateDoc({ ...doc, tax_tagged: next });
    toast.success(next ? t('addedToTax') : t('removedFromTax'));
  };

  return (
    <FullScreenViewer
      doc={doc} open={open}
      onClose={onClose}
      onDelete={handleDelete}
      onToggleTax={handleToggleTax}
      amount={amount}    setAmount={setAmount}
      dueDate={dueDate}  setDueDate={setDueDate}
      category={category} setCategory={setCategory}
      userNotes={userNotes} setUserNotes={setUserNotes}
      onSave={handleSave}
      onPrev={goPrev} onNext={goNext}
      hasPrev={hasPrev} hasNext={hasNext}
      swipeHandlers={swipeHandlers}
      isDirty={isDirty}
      token={token}
    />
  );
}
