import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, ScanLine, Calendar, Banknote, FileText, Coins,
  CalendarDays, FileCheck, X, Plus, Loader2, Maximize2, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  pageNames?: string[];
  bundleName?: string;
  onDone: () => void;
  onScanMore?: () => void;
  /** Called when the user taps a result card — navigate to that doc */
  onCardClick?: (card: DocResultCard) => void;
  /** Called when the user clicks "Replace" on a duplicate card */
  onForceReupload?: (key: string) => void;
  /** True while capture.tsx is actually uploading / analysing */
  isExiting?: boolean;
  /** Grows as each document is analysed (one entry per page) */
  exitResults?: DocResultCard[];
}

const PARTICLE_ICONS = [Coins, CalendarDays, FileCheck, Banknote, Calendar, FileText];

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪', NIS: '₪', USD: '$', EUR: '€', GBP: '£',
};

interface Particle { id: number; x: number; y: number; icon: typeof Coins; rotation: number; scale: number; delay: number; }
interface QueueItem { id: string; name: string; status: 'pending' | 'processing' | 'done' | 'removed'; progress: number; }

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: (Math.random() - 0.5) * 180, y: -(40 + Math.random() * 120),
    icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length], rotation: (Math.random() - 0.5) * 360,
    scale: 0.5 + Math.random() * 0.5, delay: Math.random() * 0.3,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const ProcessingStep = ({
  pageCount, pageNames, bundleName, onDone, onScanMore, onCardClick, onForceReupload, isExiting, exitResults,
}: ProcessingStepProps) => {
  const isMulti = pageCount > 1 && pageNames && pageNames.length > 1;
  if (isMulti) return (
    <MultiProcessing
      pageNames={pageNames!} bundleName={bundleName}
      onDone={onDone} onScanMore={onScanMore} onCardClick={onCardClick} onForceReupload={onForceReupload}
      isExiting={isExiting} exitResults={exitResults}
    />
  );
  return (
    <SingleProcessing
      pageCount={pageCount}
      onDone={onDone} onScanMore={onScanMore} onCardClick={onCardClick} onForceReupload={onForceReupload}
      isExiting={isExiting} exitResults={exitResults}
    />
  );
};

// ─── SingleProcessing ─────────────────────────────────────────────────────────

const SingleProcessing = ({
  pageCount, onDone, onScanMore, onCardClick, onForceReupload, isExiting, exitResults,
}: {
  pageCount: number; onDone: () => void; onScanMore?: () => void;
  onCardClick?: (card: DocResultCard) => void;
  onForceReupload?: (key: string) => void;
  isExiting?: boolean; exitResults?: DocResultCard[];
}) => {
  const { t } = useLanguage();
  const [currentStage, setCurrentStage] = useState(0);
  const [done, setDone] = useState(false);
  const particles = useMemo(() => generateParticles(14), []);

  const stages = [
    { label: t('readingText'), emoji: '📖' },
    { label: t('identifyingDates'), emoji: '📅' },
    { label: t('calculatingAmounts'), emoji: '💰' },
    { label: t('classifyingDocs'), emoji: '🏷️' },
    { label: t('securingVault'), emoji: '🔐' },
  ];
  const stageCount = stages.length;

  useEffect(() => {
    if (currentStage < stageCount) {
      const timer = setTimeout(() => setCurrentStage((s) => s + 1), 1000 + Math.random() * 600);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStage, stageCount]);

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto min-h-0">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="relative w-32 h-40 mb-10">
              <div className="absolute inset-0 rounded-xl border-2 border-primary/30 bg-card/40" />
              <motion.div className="absolute inset-x-0 h-[2px] rounded-full shadow-[0_0_12px_2px_hsl(var(--primary)/0.5)] bg-gradient-to-l from-transparent via-primary to-transparent"
                animate={{ top: ['8%', '92%', '8%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
              <div className="absolute inset-0 flex items-center justify-center"><ScanLine className="w-8 h-8 text-primary/60" /></div>
            </motion.div>
            <p className="text-lg font-bold text-foreground mb-2">
              {t('processingPages')} {pageCount} {pageCount === 1 ? t('pageWord') : t('pagesWord')}...
            </p>
            <div className="flex flex-col gap-3 mt-6 w-full max-w-xs">
              {stages.map((stage, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={i <= currentStage ? { opacity: 1, x: 0 } : { opacity: 0.2, x: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }} className="flex items-center gap-3">
                  <motion.span className="text-lg" animate={i === currentStage ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>{stage.emoji}</motion.span>
                  <span className={`text-sm font-medium transition-colors duration-200 ${i < currentStage ? 'text-primary' : i === currentStage ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {i < currentStage ? stage.label.replace('...', ' ✓') : stage.label}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="w-full max-w-xs mt-8">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(currentStage / stageCount) * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
              </div>
            </div>
          </motion.div>
        ) : (
          <SuccessView
            particles={particles} pageCount={pageCount}
            onDone={onDone} onScanMore={onScanMore} onCardClick={onCardClick} onForceReupload={onForceReupload}
            isLoading={isExiting ?? false} results={exitResults ?? []}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MultiProcessing ──────────────────────────────────────────────────────────

const MultiProcessing = ({
  pageNames, bundleName, onDone, onScanMore, onCardClick, onForceReupload, isExiting, exitResults,
}: {
  pageNames: string[]; bundleName?: string; onDone: () => void; onScanMore?: () => void;
  onCardClick?: (card: DocResultCard) => void;
  onForceReupload?: (key: string) => void;
  isExiting?: boolean; exitResults?: DocResultCard[];
}) => {
  const { t } = useLanguage();
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    pageNames.map((name, i) => ({ id: `doc-${i}`, name, status: 'pending', progress: 0 }))
  );
  const [halted, setHalted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particles = useMemo(() => generateParticles(14), []);

  const clearTimer = useCallback(() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.map((item) => item.id === id ? { ...item, status: 'removed' as const } : item));
    if (currentProcessingId === id) { clearTimer(); setCurrentProcessingId(null); }
  }, [currentProcessingId, clearTimer]);

  useEffect(() => {
    if (allDone || currentProcessingId) return;
    const active = queue.filter((q) => q.status !== 'removed');
    const processing = active.find((q) => q.status === 'processing');
    if (processing) { setCurrentProcessingId(processing.id); return; }
    if (!halted) { const nextPending = active.find((q) => q.status === 'pending'); if (nextPending) { setQueue((prev) => prev.map((q) => q.id === nextPending.id ? { ...q, status: 'processing' } : q)); setCurrentProcessingId(nextPending.id); return; } }
    const hasProcessing = active.some((q) => q.status === 'processing');
    const hasPending = active.some((q) => q.status === 'pending');
    const hasDone = active.some((q) => q.status === 'done');
    if (!hasProcessing && !hasPending && hasDone) { const t2 = setTimeout(() => setAllDone(true), 450); return () => clearTimeout(t2); }
  }, [queue, halted, currentProcessingId, allDone]);

  useEffect(() => {
    if (!currentProcessingId) return;
    const tick = () => {
      let shouldStop = false;
      setQueue((prev) => {
        const item = prev.find((q) => q.id === currentProcessingId);
        if (!item || item.status === 'removed' || item.status !== 'processing') { shouldStop = true; return prev; }
        const p = item.progress;
        let increment = 1;
        if (p < 12) increment = 3 + Math.random() * 5;
        else if (p < 38) increment = 1.6 + Math.random() * 2.8;
        else if (p < 72) increment = 0.4 + Math.random() * 1.4;
        else if (p < 92) increment = 0.9 + Math.random() * 2.2;
        else increment = 0.2 + Math.random() * 0.9;
        if (Math.random() < 0.14) increment = 0;
        const nextProgress = Math.min(100, Math.round(p + increment));
        if (nextProgress >= 100) { shouldStop = true; return prev.map((q) => q.id === currentProcessingId ? { ...q, progress: 100, status: 'done' as const } : q); }
        return prev.map((q) => q.id === currentProcessingId ? { ...q, progress: nextProgress } : q);
      });
      if (shouldStop) { clearTimer(); setCurrentProcessingId(null); return; }
      const delay = 45 + Math.random() * 120;
      timerRef.current = setTimeout(tick, delay);
    };
    timerRef.current = setTimeout(tick, 220 + Math.random() * 240);
    return clearTimer;
  }, [currentProcessingId, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const activeQueue = queue.filter((q) => q.status !== 'removed');
  const completedCount = activeQueue.filter((q) => q.status === 'done').length;
  const totalCount = activeQueue.length;
  const hasPending = activeQueue.some((q) => q.status === 'pending');

  if (allDone) {
    return (
      <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto min-h-0">
        <SuccessView
          particles={particles} pageCount={completedCount} bundleName={bundleName}
          onDone={onDone} onScanMore={onScanMore} onCardClick={onCardClick} onForceReupload={onForceReupload}
          isLoading={isExiting ?? false} results={exitResults ?? []}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto min-h-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center w-full max-w-md">
        <p className="text-lg font-bold text-foreground mb-1">
          {bundleName ? `${t('processing')} ${bundleName}` : t('processingDocs')} ({completedCount}/{totalCount})
        </p>
        <p className="text-xs text-muted-foreground mb-6">{t('eachDocProcessed')}</p>
        <div className="w-full space-y-3 mb-6">
          <AnimatePresence>
            {activeQueue.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, overflow: 'hidden' }} transition={{ duration: 0.3 }} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {item.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.status === 'pending' && t('waiting')}
                      {item.status === 'processing' && `${t('processingPercent')} ${item.progress}%`}
                      {item.status === 'done' && t('completed')}
                    </p>
                  </div>
                  {item.status !== 'done' && (
                    <button onClick={() => removeFromQueue(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {!halted && hasPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button onClick={() => setHalted(true)} variant="ghost" className="h-10 text-sm text-muted-foreground gap-2">
              <X className="w-3.5 h-3.5" />{t('stopProcessing')}
            </Button>
          </motion.div>
        )}
        {halted && <motion.p className="text-xs text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{t('waitingForCurrent')}</motion.p>}
      </motion.div>
    </div>
  );
};

// ─── SuccessView ──────────────────────────────────────────────────────────────

const SuccessView = ({
  particles, pageCount, bundleName, onDone, onScanMore, onCardClick, onForceReupload, isLoading, results,
}: {
  particles: Particle[];
  pageCount: number;
  bundleName?: string;
  onDone: () => void;
  onScanMore?: () => void;
  onCardClick?: (card: DocResultCard) => void;
  onForceReupload?: (key: string) => void;
  isLoading: boolean;
  results: DocResultCard[];
}) => {
  const { t, lang } = useLanguage();

  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center text-center w-full max-w-md relative"
    >
      {/* Particle burst */}
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

      {/* Check icon */}
      <motion.div
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

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3, ease: 'easeOut' }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        {t('allReady')}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.3, ease: 'easeOut' }}
        className="text-muted-foreground text-sm mb-6"
      >
        {bundleName ? `${bundleName} — ` : ''}
        {pageCount} {pageCount === 1 ? t('processedSuccessSingle') : t('processedSuccess')}
      </motion.p>

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
            const sym = CURRENCY_SYMBOLS[card.currency] || card.currency + ' ';
            const confidencePct = card.confidence != null
              ? Math.round(card.confidence * (card.confidence <= 1 ? 100 : 1))
              : null;
            const formattedAmount = card.amount != null
              ? `${sym}${card.amount.toLocaleString('en-US')}`
              : null;
            const formattedDate = card.date ? formatLocalizedDate(card.date, lang) : null;

            // Build summary line (same logic as command-center)
            const summaryLine = (() => {
              if (card.summaryHe || card.summaryEn) {
                return lang === 'he' ? card.summaryHe : card.summaryEn;
              }
              if (formattedAmount) {
                return lang === 'he'
                  ? `נמצא ${card.documentType} על סך ${formattedAmount}`
                  : `Found ${card.documentType} for ${formattedAmount}`;
              }
              return lang === 'he'
                ? `זוהה ${card.documentType}${card.provider ? ` מ${card.provider}` : ''}`
                : `Identified ${card.documentType}${card.provider ? ` from ${card.provider}` : ''}`;
            })();

            return (
              <motion.div
                key={i}
                {...animation}
                className="glass-card p-4 sm:p-5 border border-border/40 rounded-2xl shadow-sm text-start cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                onClick={() => onCardClick && card.supabaseId ? onCardClick(card) : onDone()}
              >
                {/* Summary line */}
                {summaryLine && (
                  <p className="text-sm font-semibold text-primary mb-3 leading-relaxed">
                    {summaryLine}
                  </p>
                )}

                {/* Thumbnail + info row */}
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Document thumbnail mock */}
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
                    {/* Confidence badge — top corner */}
                    {confidencePct != null && (
                      <div className="absolute -top-px -end-px text-[10px] font-mono px-1.5 py-0.5 rounded-bl-md bg-primary/12 text-primary border-b border-s border-primary/20">
                        {confidencePct}%
                      </div>
                    )}
                  </div>

                  {/* Info column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{card.documentType}</p>
                    {card.provider && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.provider}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      {formattedAmount && (
                        <div className="flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-mono font-semibold text-foreground">{formattedAmount}</span>
                        </div>
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

                {/* View document footer */}
                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-primary/85 font-medium">
                  <span>{t('viewDocument')}</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading skeleton card — shown while uploading and no real cards yet */}
        {isLoading && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 sm:p-5 border border-border/40 rounded-2xl shadow-sm"
          >
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
              <Loader2 className="w-3 h-3 animate-spin" />
              {lang === 'he' ? 'שולח ומנתח...' : 'Uploading & analysing…'}
            </div>
          </motion.div>
        )}
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
