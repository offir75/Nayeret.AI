import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupportedFile } from '@/lib/vault/helpers';
import { translations } from '@/lib/vault/translations';
import { useSettings } from '@/lib/context/settings';

function Spinner() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}

export default function IngestionHub({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled: boolean }) {
  const { lang } = useSettings();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Use "image/*" so iOS Safari shows the photo library and auto-converts HEIC→JPEG
  const accepted = 'image/*,.pdf,.heic,.heif';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setOpen(false);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => isSupportedFile(f.name));
    if (files.length) onFiles(files);
    if (folderInputRef.current) folderInputRef.current.value = '';
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="bg-zen-sage text-white hover:bg-zen-sage/90 gap-2 rounded-lg"
      >
        {disabled ? (
          <><Spinner /><span>{translations.analyzing[lang]}</span></>
        ) : (
          <><Plus className="w-4 h-4" /><span>{translations.addDocuments[lang]}</span><ChevronDown className="w-3.5 h-3.5 opacity-70" /></>
        )}
      </Button>

      {open && !disabled && (
        <div className={`absolute top-full mt-1.5 ${lang === 'he' ? 'left-0' : 'right-0'} w-44 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-30`}>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span>📄</span><span>{translations.selectFiles[lang]}</span>
          </button>
          <button onClick={() => folderInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary border-t border-border transition-colors" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span>📁</span><span>{translations.selectFolder[lang]}</span>
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept={accepted} multiple onChange={handleFileChange} className="hidden" />
      <input ref={folderInputRef} type="file" accept={accepted} multiple onChange={handleFolderChange} className="hidden" {...({ webkitdirectory: '' } as {})} />
    </div>
  );
}
