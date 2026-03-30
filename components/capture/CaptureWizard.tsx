import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IntakeStep } from './IntakeStep';
import { CameraStep } from './CameraStep';
import { ReviewStep } from './ReviewStep';
import { ProcessingStep, type DocResultCard } from './ProcessingStep';
import { renderPdfThumbnail } from '@/lib/vault/helpers';

export type { DocResultCard };
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
  thumbnailUrl?: string;   // pre-rendered JPEG thumbnail (required for PDFs)
  mimeType?: string;       // e.g. 'application/pdf', 'image/jpeg'
  timestamp: number;
}

const pageVariants = {
  enter: { opacity: 0, x: -40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

async function fileToPage(file: File): Promise<CapturedPage> {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.readAsDataURL(file);
  });
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  let thumbnailUrl: string | undefined;
  if (isPdf) {
    try {
      const b64 = await renderPdfThumbnail(file);
      thumbnailUrl = `data:image/jpeg;base64,${b64}`;
    } catch { /* no thumbnail — PDF preview will use generic icon */ }
  }
  return {
    id: crypto.randomUUID(),
    dataUrl,
    thumbnailUrl,
    mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    timestamp: Date.now(),
  };
}

function buildInitialPages(initialFiles?: string[]): CapturedPage[] {
  if (!initialFiles || initialFiles.length === 0) return [];
  return initialFiles.map((dataUrl) => {
    const mimeType = dataUrl.split(';')[0].replace('data:', '') || 'image/jpeg';
    return { id: crypto.randomUUID(), dataUrl, mimeType, timestamp: Date.now() };
  });
}

export const CaptureWizard = ({ onExit, onClose, initialFiles, isExiting, exitResults, pendingQueue, activeFileName, onComplete, onCardClick, onForceReupload, onCancelQueued }: {
  onExit: (result: CaptureResult) => void;
  onClose?: () => void;
  initialFiles?: string[];
  isExiting?: boolean;
  exitResults?: DocResultCard[];
  pendingQueue?: { id: string; name: string }[];
  activeFileName?: string | null;
  onComplete?: () => void;
  onCardClick?: (card: DocResultCard) => void;
  onForceReupload?: (key: string) => void;
  onCancelQueued?: (id: string) => void;
}) => {
  const { t, lang, isRtl } = useLanguage();
  const hasInitial = initialFiles && initialFiles.length > 0;
  const [step, setStep] = useState(hasInitial ? 2 : 0);
  const [mode, setMode] = useState<CaptureMode>(hasInitial ? (initialFiles!.length > 1 ? 'bundle' : 'single') : 'single');
  const [pages, setPages] = useState<CapturedPage[]>(() => buildInitialPages(initialFiles));
  const [bundleName, setBundleName] = useState('');

  const handleModeSelect = (m: CaptureMode) => { setMode(m); setStep(1); };

  const handleGalleryUpload = async (files: FileList) => {
    const newPages = await Promise.all(Array.from(files).map(fileToPage));
    const galleryMode: CaptureMode = newPages.length > 1 ? 'bundle' : 'single';
    setPages(newPages);
    setMode(galleryMode);
    // Skip ReviewStep — start upload + processing immediately
    onExit({ mode: galleryMode, pageCount: newPages.length, bundleName: '', dataUrls: newPages.map((p) => p.dataUrl) });
    setStep(3);
  };

  const handleAddFiles = async (files: FileList) => {
    const newPages = await Promise.all(Array.from(files).map(fileToPage));
    setPages((prev) => [...prev, ...newPages]);
    setStep(2); // advance to ReviewStep so user can confirm before uploading
  };

  const handleCapture = (dataUrl: string) => {
    setPages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl, mimeType: 'image/jpeg', timestamp: Date.now() }]);
    if (mode === 'single') setStep(2);
  };

  const handleRetake = (id: string, newDataUrl: string) => { setPages((prev) => prev.map((p) => (p.id === id ? { ...p, dataUrl: newDataUrl } : p))); };
  const handleDelete = (id: string) => { setPages((prev) => { const next = prev.filter((p) => p.id !== id); if (next.length === 0 && step === 2) setStep(1); return next; }); };
  const handleFinish = () => {
    onExit({ mode, pageCount: pages.length, bundleName, dataUrls: pages.map((p) => p.dataUrl) });
    setStep(3);
  };
  const handleDone = () => onComplete?.();

  const docLabel = lang === 'en' ? 'Document' : 'מסמך';
  const steps = [
    <IntakeStep key="intake" onModeSelect={handleModeSelect} onGalleryUpload={handleGalleryUpload} />,
    <CameraStep key="camera" mode={mode} pages={pages} onCapture={handleCapture} onRetake={handleRetake} onDelete={handleDelete} onDone={() => setStep(2)} onBack={() => { setStep(0); setPages([]); }} onAddFiles={handleAddFiles} />,
    <ReviewStep key="review" mode={mode} pages={pages} bundleName={bundleName} onBundleNameChange={setBundleName} onDelete={handleDelete} onFinish={handleFinish} onBack={() => setStep(1)} />,
    <ProcessingStep
      key="processing"
      pageCount={pages.length}
      bundleName={bundleName}
      onDone={handleDone}
      onScanMore={() => { setPages([]); setStep(0); }}
      onCardClick={onCardClick}
      onForceReupload={onForceReupload}
      onCancelQueued={onCancelQueued}
      isExiting={isExiting}
      exitResults={exitResults}
      pendingQueue={pendingQueue}
      activeFileName={activeFileName}
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
