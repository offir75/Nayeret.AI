import { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lang } from '@/lib/types';

const ACCEPTED = '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tiff,.bmp,.pdf';

const GalleryIcon = (props: { className?: string }) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const FolderIcon = (props: { className?: string }) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

interface CaptureZoneProps {
  onFiles: (files: File[]) => void;
  isDragActive: boolean;
  lang: Lang;
}

export function CaptureZone({ onFiles, isDragActive, lang }: CaptureZoneProps) {
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const filesRef   = useRef<HTMLInputElement>(null);
  const desktopRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  const mobileActions = [
    {
      ref: cameraRef,
      Icon: Camera,
      label:    lang === 'he' ? 'מצלמה' : 'Camera',
      sublabel: lang === 'he' ? 'צלם מסמך' : 'Take photo',
      accept: 'image/*',
      capture: true,
      primary: true,
    },
    {
      ref: galleryRef,
      Icon: GalleryIcon,
      label:    lang === 'he' ? 'גלריה' : 'Gallery',
      sublabel: lang === 'he' ? 'בחר תמונה' : 'Pick photo',
      accept: ACCEPTED,
      capture: false,
      primary: false,
    },
    {
      ref: filesRef,
      Icon: FolderIcon,
      label:    lang === 'he' ? 'קבצים' : 'Files',
      sublabel: lang === 'he' ? 'עיון בקבצים' : 'Browse files',
      accept: ACCEPTED,
      capture: false,
      primary: false,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Mobile: 3-button grid */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        {mobileActions.map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.95 }}
            onClick={() => action.ref.current?.click()}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-colors ${
              action.primary
                ? 'border-zen-sage bg-zen-sage/5 text-zen-sage'
                : 'border-border bg-card text-muted-foreground hover:border-zen-sage/40 hover:text-foreground'
            }`}
          >
            <action.Icon className="h-7 w-7" />
            <div className="text-center">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-[10px] text-muted-foreground">{action.sublabel}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Desktop: drag-drop zone */}
      <motion.div
        whileHover={{ borderColor: '#7a8c6e' }}
        onClick={() => desktopRef.current?.click()}
        className={`hidden md:flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
          isDragActive ? 'border-zen-sage bg-zen-sage/5' : 'border-border bg-card hover:bg-secondary/50'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zen-sage/10">
          <Upload className="h-6 w-6 text-zen-sage" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            {lang === 'he' ? 'גרור קבצים לכאן או לחץ להעלאה' : 'Drop files here or click to upload'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === 'he' ? 'PDF, תמונות, מסמכים סרוקים' : 'PDF, images, scanned documents'}
          </p>
        </div>
      </motion.div>

      {/* Hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
      <input ref={galleryRef} type="file" accept={ACCEPTED} multiple onChange={handleChange} className="hidden" />
      <input ref={filesRef}   type="file" accept={ACCEPTED} multiple onChange={handleChange} className="hidden" />
      <input ref={desktopRef} type="file" accept={ACCEPTED} multiple onChange={handleChange} className="hidden" />
    </motion.section>
  );
}
