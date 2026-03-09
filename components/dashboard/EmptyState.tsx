import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Upload } from 'lucide-react';
import { useLanguage } from '@/lib/context/settings';

interface EmptyStateProps {
  onFiles: (files: File[]) => void;
}

const CATEGORY_HINTS = [
  { emoji: '🪪', he: 'תעודת זהות / דרכון', en: 'ID / Passport' },
  { emoji: '⚡', he: 'חשבון חשמל', en: 'Electricity bill' },
  { emoji: '🛡️', he: 'ביטוח', en: 'Insurance policy' },
  { emoji: '💰', he: 'תלוש שכר', en: 'Salary slip' },
  { emoji: '✈️', he: 'כרטיס טיסה', en: 'Flight ticket' },
  { emoji: '🏠', he: 'חוזה שכירות', en: 'Rental contract' },
];

export function EmptyState({ onFiles }: EmptyStateProps) {
  const { lang } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileList = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  }, [onFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileList(e.dataTransfer.files);
  }, [handleFileList]);

  return (
    <motion.div
      className="max-w-lg mx-auto mt-8 px-4 space-y-6 pb-32 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => handleFileList(e.target.files)}
      />

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`glass-card p-12 text-center space-y-5 cursor-pointer transition-all duration-200 border-2 border-dashed ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
        }`}
      >
        <motion.div
          className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-primary/20' : 'bg-primary/10'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {isDragging ? (
            <Upload className="w-10 h-10 text-primary animate-bounce" />
          ) : (
            <FileUp className="w-10 h-10 text-primary" />
          )}
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            {isDragging
              ? (lang === 'he' ? 'שחרר כאן' : 'Drop it here')
              : (lang === 'he' ? 'הכספת שלך מוכנה' : 'Your vault is ready')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {isDragging
              ? (lang === 'he' ? 'שחרר את הקובץ להעלאה' : 'Release to upload')
              : (lang === 'he'
                  ? 'גרור קבצים לכאן או לחץ להעלאת מסמך ראשון'
                  : 'Drag files here or click to upload your first document')}
          </p>
        </div>
      </div>

      {/* Category hints */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground tracking-wide text-center">
          {lang === 'he' ? 'סוגי מסמכים נפוצים' : 'Common document types'}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORY_HINTS.map((hint, i) => (
            <motion.div
              key={hint.en}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
              className="glass-card p-3 space-y-1 rounded-xl border border-border/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{hint.emoji}</span>
                <span className="text-xs font-medium text-foreground truncate">
                  {lang === 'he' ? hint.he : hint.en}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
