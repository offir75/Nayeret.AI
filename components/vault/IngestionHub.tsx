import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress logic:
//  Phase 1 — "upload"  (status = queued → analyzing):  0 → 20%  (fast, ~400ms ticks)
//  Phase 2 — "AI"      (status = analyzing):           20 → 90% (slow, 1.5s ticks, step cycling)
//  Phase 3 — "done"    (all statuses = done/error):   100%      (instant, spring checkmark)
// ─────────────────────────────────────────────────────────────────────────────

export default function IngestionHub({ queue, lang }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [pct, setPct]             = useState(0);
  const prevQueueLen              = useRef(0);

  const isQueued    = queue.some(j => j.status === 'queued');
  const isAnalyzing = queue.some(j => j.status === 'analyzing');
  const isComplete  = queue.length > 0 && queue.every(j => j.status === 'done' || j.status === 'error');
  const hasError    = isComplete && queue.some(j => j.status === 'error') && !queue.some(j => j.status === 'done');
  const errorMsg    = hasError ? (queue.find(j => j.status === 'error')?.errorMsg ?? null) : null;
  const isVisible   = queue.length > 0;

  // Reset state when a fresh batch of files lands
  useEffect(() => {
    if (queue.length > 0 && prevQueueLen.current === 0) {
      setPct(0);
      setStepIndex(0);
    }
    prevQueueLen.current = queue.length;
  }, [queue.length]);

  // Phase 3: snap to 100% and trigger haptic on completion
  useEffect(() => {
    if (isComplete) {
      setPct(100);
      triggerHaptic();
    }
  }, [isComplete]);

  // Phase 1: quick upload ticks — 0 → 20% at ~400ms per tick
  useEffect(() => {
    if (!isQueued || isComplete) return;
    const id = setInterval(() => {
      setPct(prev => Math.min(15, prev + 4));
    }, 400);
    return () => clearInterval(id);
  }, [isQueued, isComplete]);

  // Phase 2: AI processing — cycle step labels every 1.5s, ease bar toward 90%
  useEffect(() => {
    if (!isAnalyzing || isComplete) return;
    // Jump to at least 20% as soon as AI phase starts
    setPct(prev => Math.max(prev, 20));
    const id = setInterval(() => {
      setStepIndex(prev => (prev + 1) % STEPS.length);
      setPct(prev => {
        if (prev >= 90) return prev;
        const remaining = 90 - prev;
        // Logarithmic slow-down: moves quickly at first, slows near 90%
        return prev + Math.max(1.5, remaining * 0.22);
      });
    }, 1500);
    return () => clearInterval(id);
  }, [isAnalyzing, isComplete]);

  const step = STEPS[stepIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-3 rounded-xl bg-secondary/80 backdrop-blur-md px-4 py-3 ring-1 ring-border/40"
        >
          {/* ── Status row ── */}
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit   ={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {hasError
                    ? <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    : <CheckCircle2 className="h-4 w-4 shrink-0 text-zen-sage" />
                  }
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${hasError ? 'text-destructive' : 'text-zen-sage'}`}>
                    {hasError
                      ? (lang === 'he' ? 'שגיאה בעיבוד המסמך' : 'Processing failed')
                      : (lang === 'he' ? 'העיבוד הושלם בהצלחה' : 'Processing complete!')}
                  </p>
                  {errorMsg && (
                    <p className="truncate text-xs text-destructive/70 mt-0.5">{errorMsg}</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit   ={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zen-sage" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {lang === 'he' ? step.he : step.en}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Progress bar with RTL gradient + shimmer ── */}
          <div className="relative mt-2.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
            <motion.div
              className="absolute inset-y-0 rounded-full"
              style={{
                // RTL: gradient flows right→left (bright at leading right edge)
                // LTR: gradient flows left→right (bright at leading left edge)
                background: hasError
                  ? '#ef4444'
                  : lang === 'he'
                    ? 'linear-gradient(to left,  #96a884, #7a8c6e 60%)'
                    : 'linear-gradient(to right, #96a884, #7a8c6e 60%)',
                // In RTL the width anchors to the right automatically via inherited dir
                [lang === 'he' ? 'right' : 'left']: 0,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Shimmer — light passes across the bar while processing */}
              {!isComplete && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-1/3 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                  }}
                  animate={{ x: lang === 'he' ? ['120%', '-220%'] : ['-120%', '320%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
