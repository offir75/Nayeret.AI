import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IntakeStep } from './IntakeStep';
import { CameraStep } from './CameraStep';
import { ReviewStep } from './ReviewStep';
import { ProcessingStep } from './ProcessingStep';
import { useLanguage } from '@/lib/context/settings';

export type CaptureMode = 'single' | 'multipage' | 'bundle';

export interface CaptureResult {
  mode: CaptureMode;
  pageCount: number;
  bundleName: string;
  dataUrls?: string[];
}

export interface CapturedPage {
  id: string;
  dataUrl: string;
  timestamp: number;
}

const pageVariants = {
  enter: { opacity: 0, x: -40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

function buildInitialPages(initialFiles?: string[]): CapturedPage[] {
  if (!initialFiles || initialFiles.length === 0) return [];
  return initialFiles.map((dataUrl) => ({ id: crypto.randomUUID(), dataUrl, timestamp: Date.now() }));
}

export const CaptureWizard = ({ onExit, onClose, initialFiles }: {
  onExit: (result: CaptureResult) => void;
  onClose?: () => void;
  initialFiles?: string[];
}) => {
  const { t, lang, isRtl } = useLanguage();
  const hasInitial = initialFiles && initialFiles.length > 0;
  const [step, setStep] = useState(hasInitial ? 2 : 0);
  const [mode, setMode] = useState<CaptureMode>(hasInitial ? (initialFiles!.length > 1 ? 'bundle' : 'single') : 'single');
  const [pages, setPages] = useState<CapturedPage[]>(() => buildInitialPages(initialFiles));
  const [bundleName, setBundleName] = useState('');

  const handleModeSelect = (m: CaptureMode) => { setMode(m); setStep(1); };

  const handleGalleryUpload = (files: FileList) => {
    const newPages: CapturedPage[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPages.push({ id: crypto.randomUUID(), dataUrl: e.target?.result as string, timestamp: Date.now() });
        if (newPages.length === files.length) { setPages((prev) => [...prev, ...newPages]); setMode(files.length > 1 ? 'bundle' : 'single'); setStep(2); }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCapture = (dataUrl: string) => {
    setPages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl, timestamp: Date.now() }]);
    if (mode === 'single') setStep(2);
  };

  const handleRetake = (id: string, newDataUrl: string) => { setPages((prev) => prev.map((p) => (p.id === id ? { ...p, dataUrl: newDataUrl } : p))); };
  const handleDelete = (id: string) => { setPages((prev) => { const next = prev.filter((p) => p.id !== id); if (next.length === 0 && step === 2) setStep(1); return next; }); };
  const handleFinish = () => setStep(3);
  const handleDone = () => onExit({ mode, pageCount: pages.length, bundleName, dataUrls: pages.map((p) => p.dataUrl) });

  const docLabel = lang === 'en' ? 'Document' : 'מסמך';
  const steps = [
    <IntakeStep key="intake" onModeSelect={handleModeSelect} onGalleryUpload={handleGalleryUpload} />,
    <CameraStep key="camera" mode={mode} pages={pages} onCapture={handleCapture} onRetake={handleRetake} onDelete={handleDelete} onDone={() => setStep(2)} onBack={() => { setStep(0); setPages([]); }} />,
    <ReviewStep key="review" mode={mode} pages={pages} bundleName={bundleName} onBundleNameChange={setBundleName} onDelete={handleDelete} onFinish={handleFinish} onBack={() => setStep(1)} />,
    <ProcessingStep
      key="processing"
      pageCount={pages.length}
      pageNames={pages.map((_, i) => `${docLabel} ${i + 1}`)}
      bundleName={bundleName}
      onDone={handleDone}
      onScanMore={() => { setPages([]); setStep(0); }}
    />,
  ];

  return (
    <div className="h-dvh min-h-dvh bg-background flex flex-col overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {step < 3 && (
        <div className="flex items-center gap-3 px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <button onClick={() => onClose ? onClose() : onExit({ mode, pageCount: 0, bundleName: '' })}
            className="p-2 -m-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" aria-label={t('backToDashboard')}>
            <X className="w-5 h-5" />
          </button>
          <div className={`flex gap-1.5 flex-1 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} variants={pageVariants} initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }} className="flex-1 flex flex-col min-h-0">
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
