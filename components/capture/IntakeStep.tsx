import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Files, FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CaptureMode } from './CaptureWizard';
import { useLanguage } from '@/lib/context/settings';

interface IntakeStepProps {
  onModeSelect: (mode: CaptureMode) => void;
  onGalleryUpload: (files: FileList) => void;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export const IntakeStep = ({ onModeSelect, onGalleryUpload }: IntakeStepProps) => {
  const { t, lang, isRtl } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const modes: { mode: CaptureMode; icon: typeof FileText; title: string; desc: string }[] = [
    { mode: 'single', icon: FileText, title: t('singleDoc'), desc: t('singleDocDesc') },
    { mode: 'multipage', icon: Files, title: t('multiPage'), desc: t('multiPageDesc') },
    { mode: 'bundle', icon: FolderOpen, title: t('bundleDocs'), desc: t('bundleDocsDesc') },
  ];

  return (
    <div className={`flex-1 flex flex-col px-6 py-8 ${isRtl ? 'text-right' : 'text-left'}`}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('whatToScan')}</h2>
        <p className="text-muted-foreground text-sm">{t('scanModeDesc')}</p>
      </motion.div>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 flex-1">
        {modes.map(({ mode, icon: Icon, title, desc }) => (
          <motion.button key={mode} variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onModeSelect(mode)}
            className={`glass-card p-5 flex items-center gap-4 text-start transition-colors duration-150 hover:border-primary/50 group ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className={`text-base font-semibold text-foreground ${isRtl ? 'text-right' : 'text-left'}`}>{title}</h3>
              <p className={`text-xs text-muted-foreground mt-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>{desc}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.25 }} className="mt-6 pt-6 border-t border-border/50">
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tiff,.bmp,.pdf" multiple className="hidden"
          onChange={(e) => e.target.files && onGalleryUpload(e.target.files)} />
        <Button variant="outline" className="w-full h-14 text-base gap-3" onClick={() => fileRef.current?.click()}>
          <Upload className="w-5 h-5" />{lang === 'en' ? 'Upload File' : 'העלה קובץ'}
        </Button>
      </motion.div>
    </div>
  );
};
