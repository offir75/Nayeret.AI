import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Trash2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CaptureMode, CapturedPage } from './CaptureWizard';
import { useLanguage } from '@/lib/context/settings';

interface ReviewStepProps {
  mode: CaptureMode;
  pages: CapturedPage[];
  bundleName: string;
  onBundleNameChange: (v: string) => void;
  onDelete: (id: string) => void;
  onFinish: () => void;
  onBack: () => void;
}

const gridItem = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export const ReviewStep = ({ mode, pages, bundleName, onBundleNameChange, onDelete, onFinish, onBack }: ReviewStepProps) => {
  const { t, isRtl } = useLanguage();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="flex-1 flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] min-h-0 h-full overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="flex items-center justify-between mb-6 shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">{t('reviewAndFinish')}</h2>
        <div className="w-5" />
      </motion.div>

      {(mode === 'bundle' || mode === 'multipage') && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.25 }} className="mb-6 shrink-0">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">{t('bundleNameLabel')}</label>
          <Input value={bundleName} onChange={(e) => onBundleNameChange(e.target.value)} placeholder={t('bundleNamePlaceholder')} className="h-12 text-base" />
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {pages.length === 1 && mode === 'single' ? (
          /* Single page: full-space preview */
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
            className="relative w-full h-full flex items-center justify-center p-2">
            <div className="relative w-full max-w-md h-full rounded-2xl overflow-hidden border border-border/50 bg-card shadow-lg">
              {pages[0].mimeType === 'application/pdf' && !pages[0].thumbnailUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <FileText className="w-16 h-16" />
                  <span className="text-sm font-medium">PDF</span>
                </div>
              ) : (
                <img src={pages[0].thumbnailUrl ?? pages[0].dataUrl} alt={t('pageWord')} className="w-full h-full object-contain" />
              )}
              <motion.div className="absolute inset-x-0 h-[1px] bg-gradient-to-l from-transparent via-primary/40 to-transparent pointer-events-none"
                initial={{ top: '0%' }} animate={{ top: ['0%', '100%'] }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
              <button onClick={() => onDelete(pages[0].id)}
                className="absolute top-3 end-3 w-9 h-9 rounded-full bg-destructive/90 flex items-center justify-center text-destructive-foreground shadow-md hover:bg-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Multi-page: grid view */
          <>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.2 }} className="text-sm text-muted-foreground mb-3">
              {pages.length} {pages.length === 1 ? t('pageForProcessing') : t('pagesForProcessing')}
            </motion.p>
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="grid grid-cols-2 gap-3 pb-4">
              {pages.map((page, i) => {
                const isPdf = page.mimeType === 'application/pdf';
                const previewSrc = page.thumbnailUrl ?? page.dataUrl;
                return (
                <motion.div key={page.id} variants={gridItem} className="relative rounded-xl overflow-hidden border border-border/50 bg-card group">
                  {isPdf && !page.thumbnailUrl ? (
                    <div className="w-full aspect-[3/4] flex items-center justify-center bg-muted">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                  ) : (
                    <img src={previewSrc} alt={`${t('pageWord')} ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
                  )}
                  {isPdf && (
                    <span className="absolute top-1 start-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-px rounded">PDF</span>
                  )}
                  <motion.div className="absolute inset-x-0 h-[1px] bg-gradient-to-l from-transparent via-primary/40 to-transparent pointer-events-none"
                    initial={{ top: '0%' }} animate={{ top: ['0%', '100%'] }} transition={{ duration: 1.5, delay: i * 0.2, ease: 'easeInOut' }} />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => onDelete(page.id)} className="w-10 h-10 rounded-full bg-destructive/90 flex items-center justify-center text-destructive-foreground">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-2 end-2 bg-background/80 text-[11px] font-mono px-2 py-0.5 rounded-md text-muted-foreground">{i + 1}</span>
                </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.25 }} className="shrink-0 pt-4 border-t border-border/50 bg-background pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <Button onClick={onFinish} disabled={pages.length === 0} className="w-full h-14 text-base gap-2 font-semibold">
          <Sparkles className="w-5 h-5" />{t('finishAndProcess')}
        </Button>
      </motion.div>
    </div>
  );
};
