import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import type { UploadJob, Lang } from '@/lib/types';

// ── Status messages that cycle during the AI processing phase ─────────────────

const STEPS: { he: string; en: string }[] = [
  { he: 'מנתח את המסמך...',           en: 'Analyzing document...'        },
  { he: 'מזהה סוג המסמך...',          en: 'Identifying document type...' },
  { he: 'מחלץ נתונים חשובים...',     en: 'Extracting key data...'       },
  { he: 'מבצע זיהוי טקסט (OCR)...',  en: 'Running OCR on text...'       },
  { he: 'מעבד עם בינה מלאכותית...',  en: 'Processing with AI...'        },
  { he: 'מסכם את המסמך...',           en: 'Summarizing document...'      },
  { he: 'ממטב לעברית...',             en: 'Optimizing for Hebrew...'     },
  { he: 'כמעט מוכן...',               en: 'Almost ready...'              },
];

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

interface Props {
  queue: UploadJob[];
  lang: Lang;
  onCancel: (id: string) => void;
}

// ── FileRow ───────────────────────────────────────────────────────────────────

interface FileRowProps {
  job: UploadJob;
  lang: Lang;
  onCancel: (id: string) => void;
  isActive: boolean;
}

function FileRow({ job, lang, onCancel, isActive }: FileRowProps) {
  const [pct, setPct]             = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const prevActiveRef             = useRef(false);

  // Reset progress when this row becomes the active (analyzing) one
  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      setPct(0);
      setStepIndex(0);
    }
    prevActiveRef.current = isActive;
  }, [isActive]);

  // Phase 1: quick ticks toward 15% while queued
  useEffect(() => {
    if (job.status !== 'queued' || !isActive) return;
    const id = setInterval(() => {
      setPct(prev => Math.min(15, prev + 4));
    }, 400);
    return () => clearInterval(id);
  }, [job.status, isActive]);

  // Phase 2: AI processing — cycle steps and ease bar toward 90%
  useEffect(() => {
    if (job.status !== 'analyzing' || !isActive) return;
    setPct(prev => Math.max(prev, 20));
    const id = setInterval(() => {
      setStepIndex(prev => (prev + 1) % STEPS.length);
      setPct(prev => {
        if (prev >= 90) return prev;
        const remaining = 90 - prev;
        return prev + Math.max(1.5, remaining * 0.22);
      });
    }, 1500);
    return () => clearInterval(id);
  }, [job.status, isActive]);

  // Phase 3: snap to 100% on done
  useEffect(() => {
    if (job.status === 'done' || job.status === 'error') {
      setPct(100);
      if (job.status === 'done') triggerHaptic();
    }
  }, [job.status]);

  const step = STEPS[stepIndex];
  const shortName = job.resolvedName.length > 28
    ? job.resolvedName.slice(0, 25) + '...'
    : job.resolvedName;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Status icon */}
        <div className="shrink-0">
          {job.status === 'done' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              <CheckCircle2 className="h-3.5 w-3.5 text-zen-sage" />
            </motion.div>
          )}
          {job.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          {job.status === 'queued' && <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />}
          {job.status === 'analyzing' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zen-sage opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zen-sage" />
            </span>
          )}
        </div>

        {/* Filename */}
        <span
          className={`flex-1 min-w-0 truncate text-xs ${
            job.status === 'analyzing'
              ? 'font-semibold text-foreground'
              : job.status === 'done'
              ? 'text-muted-foreground/70'
              : job.status === 'error'
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}
          title={job.resolvedName}
        >
          {shortName}
        </span>

        {/* Right side: status label or cancel button */}
        {job.status === 'queued' && (
          <button
            onClick={() => onCancel(job.id)}
            className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/50 hover:bg-border hover:text-foreground transition-colors"
            aria-label="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {job.status === 'done' && (
          <span className="shrink-0 text-[10px] font-medium text-zen-sage">
            {lang === 'he' ? 'הושלם' : 'Done'}
          </span>
        )}
        {job.status === 'error' && (
          <span className="shrink-0 text-[10px] font-medium text-destructive">
            {lang === 'he' ? 'שגיאה' : 'Error'}
          </span>
        )}
        {job.status === 'analyzing' && (
          <span className="shrink-0 text-[10px] font-medium text-zen-sage tabular-nums">
            {Math.round(pct)}%
          </span>
        )}
      </div>

      {/* Step text — only for active analyzing row */}
      {job.status === 'analyzing' && isActive && (
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-muted-foreground ps-5 truncate"
          >
            {lang === 'he' ? step.he : step.en}
          </motion.p>
        </AnimatePresence>
      )}

      {/* Progress bar — only for active analyzing/done row */}
      {(job.status === 'analyzing' || (job.status === 'done' && isActive)) && (
        <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-border/60 ms-5" style={{ width: 'calc(100% - 1.25rem)' }}>
          <motion.div
            className="absolute inset-y-0 rounded-full"
            style={{
              background: lang === 'he'
                ? 'linear-gradient(to left,  #96a884, #7a8c6e 60%)'
                : 'linear-gradient(to right, #96a884, #7a8c6e 60%)',
              [lang === 'he' ? 'right' : 'left']: 0,
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {job.status === 'analyzing' && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-1/2 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }}
                animate={{ x: lang === 'he' ? ['120%', '-220%'] : ['-120%', '320%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Error detail */}
      {job.status === 'error' && job.errorMsg && (
        <p className="text-[10px] text-destructive/70 truncate ps-5">{job.errorMsg}</p>
      )}
    </motion.div>
  );
}

// ── IngestionHub ──────────────────────────────────────────────────────────────

export default function IngestionHub({ queue, lang, onCancel }: Props) {
  const visible = queue.filter(j => j.status !== 'cancelled');
  const isVisible = visible.length > 0;

  const analyzingJob = visible.find(j => j.status === 'analyzing');
  const activeId = analyzingJob?.id ?? null;

  // Split into active (non-queued) and waiting (queued)
  const activeRows  = visible.filter(j => j.status !== 'queued');
  const queuedRows  = visible.filter(j => j.status === 'queued');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-3 rounded-xl bg-secondary/80 backdrop-blur-md px-4 py-3 ring-1 ring-border/40 space-y-2"
        >
          <AnimatePresence initial={false}>
            {activeRows.map(job => (
              <FileRow
                key={job.id}
                job={job}
                lang={lang}
                onCancel={onCancel}
                isActive={job.id === activeId}
              />
            ))}
          </AnimatePresence>

          {/* Divider between active and queued */}
          {activeRows.length > 0 && queuedRows.length > 0 && (
            <div className="border-t border-border/40" />
          )}

          <AnimatePresence initial={false}>
            {queuedRows.map(job => (
              <FileRow
                key={job.id}
                job={job}
                lang={lang}
                onCancel={onCancel}
                isActive={false}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
