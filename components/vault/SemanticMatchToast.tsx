import { useEffect } from 'react';
import { useSettings } from '@/lib/context/settings';
import { translations } from '@/lib/vault/translations';
import type { SemanticMatchInfo } from '@/lib/types';

interface Props {
  match: SemanticMatchInfo;
  newDocId: string;
  onUpdateExisting: (matchId: string, newDocId: string) => void;
  onKeepBoth: () => void;
}

export default function SemanticMatchToast({ match, newDocId, onUpdateExisting, onKeepBoth }: Props) {
  const { lang } = useSettings();

  // Auto-dismiss after 12 seconds if user takes no action
  useEffect(() => {
    const timer = setTimeout(onKeepBoth, 12000);
    return () => clearTimeout(timer);
  }, [onKeepBoth]);

  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-[65] px-4 pointer-events-none">
      <div
        className="bg-zinc-800 border border-white/10 rounded-xl shadow-xl px-4 py-3 max-w-sm w-full pointer-events-auto"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>

          {/* Text + actions */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">{translations.semanticMatchTitle[lang]}</p>
            <p className="text-[11px] text-white/50 mt-0.5 mb-2.5 truncate" title={match.file_name}>
              {translations.semanticMatchBody[lang]} &ldquo;{match.file_name}&rdquo;
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateExisting(match.id, newDocId)}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
              >
                {translations.semanticUpdateExisting[lang]}
              </button>
              <button
                onClick={onKeepBoth}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white/70 transition-colors"
              >
                {translations.semanticKeepBoth[lang]}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
