import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lang } from '@/lib/types';

// No `capture` attribute — iOS Safari will present its native action sheet
// (Photo Library / Take Photo / Choose Files) automatically.
const ACCEPTED = 'image/*,application/pdf';

interface CaptureZoneProps {
  onFiles: (files: File[]) => void;
  isDragActive: boolean;
  lang: Lang;
}

export function CaptureZone({ onFiles, isDragActive, lang }: CaptureZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <motion.div
        whileHover={{ borderColor: 'hsl(var(--primary))' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:bg-secondary/50'
        }`}
      >
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
          isDragActive ? 'bg-primary/20' : 'bg-primary/10'
        }`}>
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            {lang === 'he' ? 'העלה מסמך' : 'Upload Document'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === 'he' ? 'PDF, תמונות, מסמכים סרוקים' : 'PDF, images, scanned documents'}
          </p>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </motion.section>
  );
}
