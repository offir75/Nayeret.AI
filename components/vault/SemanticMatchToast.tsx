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
  const displayName = match.original_filename ?? match.file_name;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onKeepBoth}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{translations.semanticMatchTitle[lang]}</h3>
            <p className="text-xs text-white/50 mt-0.5">{translations.semanticMatchBody[lang]}</p>
          </div>
        </div>

        {/* Matching file name */}
        <div className="bg-zinc-800 rounded-lg px-3 py-2.5 mb-5">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex-shrink-0 text-white/40">↗</span>
            <span className="truncate text-white/80" title={displayName}>{displayName}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onUpdateExisting(match.id, newDocId)}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
          >
            {translations.semanticUpdateExisting[lang]}
          </button>
          <button
            onClick={onKeepBoth}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
          >
            {translations.semanticKeepBoth[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
