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
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 flex-shrink-0">
        <h2 className="text-base font-semibold text-white truncate min-w-0 mr-3 leading-tight">
          {doc.file_name}
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 active:bg-white/40 text-white transition-colors flex-shrink-0"
          aria-label={translations.closeViewer[lang]}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content area — clicks on the dark backdrop dismiss the modal */}
      <div className="relative flex-1 overflow-hidden" onClick={onClose}>
        {/* Loading overlay */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-white/70">{translations.viewerLoading[lang]}</p>
          </div>
        )}

        {isPdf ? (
          /* PDF: full-bleed iframe — no shadow box */
          <iframe
            src={fileUrl}
            title={doc.file_name}
            className={`w-full h-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onClick={e => e.stopPropagation()}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          /* Image: centered with click-through guard */
          <div
            className="flex items-center justify-center w-full h-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={fileUrl}
              alt={doc.file_name}
              className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
