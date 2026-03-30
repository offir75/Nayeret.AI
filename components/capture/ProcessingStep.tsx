import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Calendar, Banknote, FileText, Coins,
  CalendarDays, FileCheck, Plus, Loader2, Maximize2, Copy, ScanLine, AlertTriangle, X, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyAmount } from '@/components/ui/currency-amount';
import { useLanguage } from '@/lib/context/settings';
import { formatLocalizedDate } from '@/lib/dateUtils';

// ─── Shared result type ───────────────────────────────────────────────────────

export interface DocResultCard {
  documentType: string;
  summaryHe: string | null;
  summaryEn: string | null;
  amount: number | null;
  currency: string;
  provider: string | null;
  date: string | null;
  confidence: number | null;
  supabaseId?: string | null;
  /** True when the upload API returned isDuplicate=true for this file */
  isDuplicate?: boolean;
  /** Opaque key used to trigger a force re-upload from the SuccessView */
  _forceReuploadKey?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessingStepProps {
  pageCount: number;
  bundleName?: string;
  onDone: () => void;
  onScanMore?: () => void;
  /** Called when the user taps a result card — navigate to that doc */
  onCardClick?: (card: DocResultCard) => void;
  /** Called when the user clicks "Replace" on a duplicate card */
  onForceReupload?: (key: string) => void;
  /** Called when the user cancels a queued (not yet started) file */
  onCancelQueued?: (id: string) => void;
  /** True while capture.tsx is actually uploading / analysing */
  isExiting?: boolean;
  /** Grows as each document is analysed (one entry per page) */
  exitResults?: DocResultCard[];
  /** Files waiting to be processed (not yet started) */
  pendingQueue?: { id: string; name: string }[];
  /** Name of the file currently being processed */
  activeFileName?: string | null;
}

const PARTICLE_ICONS = [Coins, CalendarDays, FileCheck, Banknote, Calendar, FileText];

interface Particle { id: number; x: number; y: number; icon: typeof Coins; rotation: number; scale: number; delay: number; }

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: (Math.random() - 0.5) * 180, y: -(40 + Math.random() * 120),
    icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length], rotation: (Math.random() - 0.5) * 360,
    scale: 0.5 + Math.random() * 0.5, delay: Math.random() * 0.3,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const ProcessingStep = ({
  pageCount, bundleName, onDone, onScanMore, onCardClick, onForceReupload, onCancelQueued,
  isExiting, exitResults, pendingQueue, activeFileName,
}: ProcessingStepProps) => {
  const particles = useMemo(() => generateParticles(14), []);
  return (
    <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto min-h-0">
      <SuccessView
        particles={particles}
        pageCount={exitResults?.length ?? pageCount}
        totalCount={pageCount}
        bundleName={bundleName}
        onDone={onDone}
        onScanMore={onScanMore}
        onCardClick={onCardClick}
        onForceReupload={onForceReupload}
        onCancelQueued={onCancelQueued}
        isLoading={isExiting ?? true}
        results={exitResults ?? []}
        pendingQueue={pendingQueue ?? []}
        activeFileName={activeFileName ?? null}
      />
    </div>
  );
};

// ─── SuccessView ──────────────────────────────────────────────────────────────

const SuccessView = ({
  particles, pageCount, totalCount, bundleName, onDone, onScanMore, onCardClick, onForceReupload,
  onCancelQueued, isLoading, results, pendingQueue, activeFileName,
}: {
  particles: Particle[];
  pageCount: number;
  totalCount: number;
  bundleName?: string;
  onDone: () => void;
  onScanMore?: () => void;
  onCardClick?: (card: DocResultCard) => void;
  onForceReupload?: (key: string) => void;
  onCancelQueued?: (id: string) => void;
  isLoading: boolean;
  results: DocResultCard[];
  pendingQueue: { id: string; name: string }[];
  activeFileName: string | null;
}) => {
  const { t, lang } = useLanguage();
  // True whenever any file is still being processed
  const isAnalysing = isLoading;
  const isDuplicateOnly = !isLoading && results.length > 0 && results.every(r => r.isDuplicate);

  const UPLOAD_STEPS = lang === 'he'
    ? ['קורא טקסט…', 'מזהה תאריכים…', 'מחשב סכומים…', 'מסווג מסמך…', 'שומר בכספת…']
    : ['Reading text…', 'Identifying dates…', 'Calculating amounts…', 'Classifying document…', 'Securing in vault…'];

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isAnalysing) return;
    const timer = setInterval(() => setStepIndex((i) => (i + 1) % UPLOAD_STEPS.length), 1800);
    return () => clearInterval(timer);
  }, [isAnalysing, UPLOAD_STEPS.length]);

  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center text-center w-full max-w-md relative"
    >
      {/* Particle burst — only on successful completion (not for duplicates) */}
      {!isAnalysing && !isDuplicateOnly && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 pointer-events-none">
          {particles.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                className="absolute"
                initial={{ opacity: 0.9, x: 0, y: 0, scale: p.scale, rotate: 0 }}
                animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotation }}
                transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
              >
                <Icon className="w-4 h-4 text-primary/50" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Spinner while analysing, warning for duplicate-only, checkmark when done */}
      <AnimatePresence mode="wait">
        {isAnalysing ? (
          <motion.div
            key="analysing-icon"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative z-10"
          >
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <ScanLine className="w-10 h-10 text-primary/70" />
          </motion.div>
        ) : isDuplicateOnly ? (
          <motion.div
            key="duplicate-icon"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ times: [0, 0.6, 1], duration: 0.5, ease: 'easeOut' }}
            className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 relative z-10"
          >
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </motion.div>
        ) : (
          <motion.div
            key="done-icon"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.25, 1] }}
            transition={{ times: [0, 0.6, 1], duration: 0.6, ease: 'easeOut' }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative z-10"
          >
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            />
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isAnalysing ? (
          <motion.div
            key="analysing-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {totalCount > 1
                ? (lang === 'he'
                    ? `מעבד מסמכים... (${results.length}/${totalCount})`
                    : `Processing… (${results.length}/${totalCount})`)
                : (lang === 'he' ? 'מנתח את המסמך...' : 'Analysing your document...')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {bundleName ? `${bundleName} — ` : ''}
              {lang === 'he' ? 'אנא המתן' : 'Please wait'}
            </p>
          </motion.div>
        ) : isDuplicateOnly ? (
          <motion.div
            key="duplicate-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              {lang === 'he' ? 'קובץ קיים בכספת' : 'File already in vault'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {lang === 'he' ? 'המסמך שהעלית כבר קיים' : 'This document was already uploaded'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="done-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('allReady')}</h2>
            <p className="text-muted-foreground text-sm">
              {bundleName ? `${bundleName} — ` : ''}
              {pageCount} {pageCount === 1 ? t('processedSuccessSingle') : t('processedSuccess')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Per-document result cards ── */}
      <div className="w-full space-y-3 mb-8">
        <AnimatePresence>
          {results.map((card, i) => {
            const animation = {
              initial: { opacity: 0, y: 30 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.9 + i * 0.12, duration: 0.35, ease: 'easeOut' as const },
            };

            // ── Duplicate card ──────────────────────────────────────────────
            if (card.isDuplicate) {
              return (
                <motion.div
                  key={i}
                  {...animation}
                  className="glass-card p-4 sm:p-5 border border-amber-400/30 rounded-2xl shadow-sm text-start bg-amber-500/5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Copy className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {t('dupDetectedTitle')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t('dupDetectedBody')}</p>
                  {card.documentType && (
                    <p className="text-sm font-medium text-foreground truncate mb-4">{card.documentType}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs border-amber-400/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50/50"
                      onClick={() => onCardClick && card.supabaseId ? onCardClick(card) : onDone()}
                    >
                      {t('dupViewOriginal')}
                    </Button>
                    {card._forceReuploadKey && onForceReupload && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 text-xs"
                        onClick={() => onForceReupload(card._forceReuploadKey!)}
                      >
                        {t('dupReplace')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            }

            // ── Normal card ─────────────────────────────────────────────────
            const confidencePct = card.confidence != null
              ? Math.round(card.confidence * (card.confidence <= 1 ? 100 : 1))
              : null;
            const formattedDate = card.date ? formatLocalizedDate(card.date, lang) : null;

            // Summary line — use pre-built API strings when available; otherwise compose as JSX
            const summaryNode = (() => {
              const text = card.summaryHe || card.summaryEn
                ? (lang === 'he' ? card.summaryHe : card.summaryEn)
                : null;
              if (text) return <>{text}</>;
              if (card.amount != null) {
                return lang === 'he' ? (
                  <>נמצא {card.documentType} על סך <CurrencyAmount value={card.amount} currency={card.currency || 'ILS'} className="font-semibold" /></>
                ) : (
                  <>Found {card.documentType} for <CurrencyAmount value={card.amount} currency={card.currency || 'ILS'} className="font-semibold" /></>
                );
              }
              return lang === 'he'
                ? <>זוהה {card.documentType}{card.provider ? ` מ${card.provider}` : ''}</>
                : <>Identified {card.documentType}{card.provider ? ` from ${card.provider}` : ''}</>;
            })();

            return (
              <motion.div
                key={i}
                {...animation}
                className="glass-card p-4 sm:p-5 border border-border/40 rounded-2xl shadow-sm text-start cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                onClick={() => onCardClick && card.supabaseId ? onCardClick(card) : onDone()}
              >
                <p className="text-sm font-semibold text-primary mb-3 leading-relaxed">
                  {summaryNode}
                </p>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl border border-border/60 bg-background/90 shrink-0 overflow-hidden">
                    <div className="absolute inset-0 p-2.5 flex flex-col gap-1.5">
                      <div className="h-2 rounded-full bg-primary/25 w-3/4" />
                      <div className="h-1.5 rounded-full bg-muted w-full" />
                      <div className="h-1.5 rounded-full bg-muted w-5/6" />
                      <div className="h-1.5 rounded-full bg-muted w-2/3" />
                      <div className="h-1.5 rounded-full bg-muted w-full" />
                      <div className="mt-auto h-5 rounded-md bg-primary/12 border border-primary/25 flex items-center justify-center">
                        <FileText className="w-3 h-3 text-primary/80" />
                      </div>
                    </div>
                    {confidencePct != null && (
                      <div className="absolute -top-px -end-px text-[10px] font-mono px-1.5 py-0.5 rounded-bl-md bg-primary/12 text-primary border-b border-s border-primary/20">
                        {confidencePct}%
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{card.documentType}</p>
                    {card.provider && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.provider}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      {card.amount != null && (
                        <div className="flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                          <CurrencyAmount value={card.amount} currency={card.currency || 'ILS'} className="text-sm font-semibold text-foreground" /></div>
                      )}
                      {formattedDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-primary/85 font-medium">
                  <span>{t('viewDocument')}</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Active processing skeleton — shown for the currently processing file */}
        <AnimatePresence>
          {isLoading && (activeFileName != null || results.length === 0) && (
            <motion.div
              key="active-skeleton"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-4 sm:p-5 border border-primary/20 rounded-2xl shadow-sm"
            >
              {activeFileName && (
                <p className="text-xs font-medium text-primary/70 truncate mb-3">{activeFileName}</p>
              )}
              <div className="h-3 rounded-full bg-primary/15 w-3/5 mb-4 animate-pulse" />
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-muted/60 shrink-0 animate-pulse" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-3.5 rounded-full bg-muted w-3/4 animate-pulse" />
                  <div className="h-2.5 rounded-full bg-muted/70 w-1/2 animate-pulse" />
                  <div className="h-2.5 rounded-full bg-muted/50 w-2/3 animate-pulse mt-4" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    {UPLOAD_STEPS[stepIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Queued files — shown below the active card, each with a cancel button */}
        <AnimatePresence>
          {pendingQueue.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="glass-card p-3.5 sm:p-4 border border-border/20 rounded-2xl opacity-70"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                    {lang === 'he' ? 'ממתין' : 'Queued'}
                  </span>
                </div>
                <button
                  onClick={() => onCancelQueued?.(item.id)}
                  className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label={lang === 'he' ? 'ביטול' : 'Cancel'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 + Math.max(results.length, 1) * 0.12 + 0.15, duration: 0.3 }}
        className="w-full space-y-3 sticky bottom-0 pt-4 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-background via-background to-transparent"
      >
        <Button
          onClick={onDone}
          disabled={isLoading}
          className="h-14 px-8 text-base font-semibold gap-2 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {lang === 'he' ? 'מעבד מסמכים...' : 'Processing…'}
            </>
          ) : (
            t('backToMyDocs')
          )}
        </Button>
        {!isLoading && onScanMore && (
          <Button onClick={onScanMore} variant="outline" className="h-12 px-6 text-sm gap-2 w-full">
            <Plus className="w-4 h-4" />{t('scanMore')}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};
