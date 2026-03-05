import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc } from '@/lib/types';
import { translations } from '@/lib/vault/translations';

export default function DocumentModal({ doc, token, onClose }: { doc: VaultDoc; token: string; onClose: () => void }) {
  const { lang } = useSettings();
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const fileUrl = `/api/file?id=${doc.id}&t=${encodeURIComponent(token)}`;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zen-stone/90" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-zen-stone/60 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium text-white/80 truncate min-w-0 mr-3">{doc.file_name}</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white transition-colors flex-shrink-0"
          aria-label={translations.closeViewer[lang]}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative" onClick={e => e.stopPropagation()}>
        {/* Loading overlay */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-white/70">{translations.viewerLoading[lang]}</p>
          </div>
        )}

        {isPdf ? (
          <iframe
            src={fileUrl}
            title={doc.file_name}
            className={`w-full max-w-4xl rounded-lg shadow-2xl border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ height: 'calc(100vh - 80px)' }}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <img
            src={fileUrl}
            alt={doc.file_name}
            className={`max-h-[calc(100vh-80px)] max-w-full rounded-lg shadow-2xl object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
