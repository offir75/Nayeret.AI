import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowRight, ArrowLeft, Check, RotateCcw, Trash2, X, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CaptureMode, CapturedPage } from './CaptureWizard';
import { useLanguage } from '@/lib/context/settings';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tiff,.bmp,.pdf';

interface CameraStepProps {
  mode: CaptureMode;
  pages: CapturedPage[];
  onCapture: (dataUrl: string) => void;
  onRetake: (id: string, newDataUrl: string) => void;
  onDelete: (id: string) => void;
  onDone: () => void;
  onBack: () => void;
  onAddFiles?: (files: FileList) => void;
}

export const CameraStep = ({ mode, pages, onCapture, onRetake, onDelete, onDone, onBack, onAddFiles }: CameraStepProps) => {
  const { t, isRtl } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewPage, setPreviewPage] = useState<CapturedPage | null>(null);
  const retakeRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDropFiles = useCallback((files: FileList) => {
    if (onAddFiles) { onAddFiles(files); return; }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => onCapture(ev.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, [onCapture, onAddFiles]);

  const handleFileCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (onAddFiles) { onAddFiles(files); e.target.value = ''; return; }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => { onCapture(ev.target?.result as string); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onCapture, onAddFiles]);

  const handleRetakeFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !previewPage) return;
    const reader = new FileReader();
    reader.onload = (ev) => { onRetake(previewPage.id, ev.target?.result as string); setPreviewPage(null); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [previewPage, onRetake]);

  const isMulti = mode !== 'single';
  const modeLabel = mode === 'multipage' ? t('multiPageContract') : mode === 'bundle' ? t('documentBundle') : t('singleDocument');
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">{modeLabel}</span>
        {isMulti && pages.length > 0 ? (
          <Button size="sm" onClick={onDone} className="gap-1.5">
            <Check className="w-4 h-4" />{t('finish')} ({pages.length})
          </Button>
        ) : (<div className="w-16" />)}
      </motion.div>

      {/* Viewfinder area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: isDragging ? 1.03 : 1 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleDropFiles(e.dataTransfer.files); }}
          className={`relative w-full max-w-sm aspect-[3/4] max-h-full rounded-2xl border-2 border-dashed bg-card/40 flex flex-col items-center justify-center gap-4 overflow-hidden transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-primary/30'}`}>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
          <motion.div className="absolute inset-x-0 h-[2px] bg-gradient-to-l from-transparent via-primary/60 to-transparent pointer-events-none"
            animate={{ top: ['8%', '92%', '8%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
          <Camera className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center px-4">
            {isDragging ? t('dropHere') : t('positionDoc')}
          </p>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={handleFileCapture} />
        </motion.div>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.25 }} className="py-4 flex items-center justify-center gap-6">
          <button onClick={() => {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = ACCEPT; inp.multiple = true;
            inp.onchange = (e) => { const files = (e.target as HTMLInputElement).files; if (!files) return;
              if (onAddFiles) { onAddFiles(files); return; }
              Array.from(files).forEach((file) => { const reader = new FileReader(); reader.onload = (ev) => onCapture(ev.target?.result as string); reader.readAsDataURL(file); }); };
            inp.click();
          }} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="w-5 h-5" />
          </button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full border-4 border-primary bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <div className="w-14 h-14 rounded-full bg-primary" />
          </motion.button>
          <div className="w-12 h-12" />
        </motion.div>

        <AnimatePresence>
          {isMulti && pages.length > 0 && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }} className="border-t border-border/50 bg-card/60 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
              <ScrollArea className="w-full">
                <div className="flex gap-3 p-4">
                  {pages.map((page, i) => {
                    const isPdf = page.mimeType === 'application/pdf';
                    const previewSrc = page.thumbnailUrl ?? page.dataUrl;
                    return (
                    <motion.button key={page.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }} onClick={() => setPreviewPage(page)}
                      className="relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors">
                      {isPdf && !page.thumbnailUrl ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={previewSrc} alt={`${t('pageWord')} ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                      {isPdf && (
                        <span className="absolute top-0.5 start-0.5 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1 py-px rounded">PDF</span>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] text-center py-0.5 font-mono text-muted-foreground">{i + 1}</span>
                    </motion.button>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="max-w-md p-0 bg-background border-border overflow-hidden">
          {previewPage && (() => {
            const isPdf = previewPage.mimeType === 'application/pdf';
            const previewSrc = previewPage.thumbnailUrl ?? previewPage.dataUrl;
            return (
            <div className="flex flex-col">
              <div className="relative aspect-[3/4] bg-muted">
                {isPdf && !previewPage.thumbnailUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <FileText className="w-16 h-16 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">PDF</span>
                  </div>
                ) : (
                  <img src={previewSrc} alt={t('preview')} className="w-full h-full object-contain" />
                )}
                <button onClick={() => setPreviewPage(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 p-4">
                {!isPdf && (
                  <>
                    <input ref={retakeRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleRetakeFile} />
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => retakeRef.current?.click()}>
                      <RotateCcw className="w-4 h-4" />{t('retake')}
                    </Button>
                  </>
                )}
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => { onDelete(previewPage.id); setPreviewPage(null); }}>
                  <Trash2 className="w-4 h-4" />{t('deleteText')}
                </Button>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
