import { useSettings } from '@/lib/context/settings';
import { translations } from '@/lib/vault/translations';
import type { DuplicateDocInfo } from '@/lib/types';

interface Props {
  filename: string;
  existing: DuplicateDocInfo;
  onViewOriginal: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

export default function DuplicateDialog({ filename, existing, onViewOriginal, onReplace, onCancel }: Props) {
  const { lang } = useSettings();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{translations.dupDetectedTitle[lang]}</h3>
            <p className="text-xs text-white/50 mt-0.5">{translations.dupDetectedBody[lang]}</p>
          </div>
        </div>

        {/* File names */}
        <div className="bg-zinc-800 rounded-lg px-3 py-2.5 mb-5 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-white/40">
            <span className="flex-shrink-0">↑</span>
            <span className="truncate text-white/60" title={filename}>{filename}</span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <span className="flex-shrink-0">↗</span>
            <span className="truncate text-zen-sage/80" title={existing.file_name}>{existing.file_name}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onViewOriginal}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
          >
            {translations.dupViewOriginal[lang]}
          </button>
          <button
            onClick={onReplace}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
          >
            {translations.dupReplace[lang]}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
          >
            {translations.dupCancel[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
