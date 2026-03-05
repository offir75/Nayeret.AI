import { useSettings } from '@/lib/context/settings';
import type { UploadJob } from '@/lib/types';
import { translations } from '@/lib/vault/translations';

export default function BulkProgressBar({ queue }: { queue: UploadJob[] }) {
  const { lang } = useSettings();
  const done   = queue.filter(j => j.status === 'done' || j.status === 'error').length;
  const errors = queue.filter(j => j.status === 'error').length;
  const total  = queue.length;
  if (total === 0) return null;
  const pct     = Math.round((done / total) * 100);
  const allDone = done === total;

  const statusText = allDone
    ? errors > 0
      ? lang === 'he' ? `הסתיים — ${errors} שגיאות` : `Completed — ${errors} error${errors > 1 ? 's' : ''}`
      : lang === 'he' ? `✓ ${total} מסמכים נותחו` : `✓ ${total} document${total > 1 ? 's' : ''} analyzed`
    : lang === 'he' ? `מנתח ${done + 1} מתוך ${total}…` : `Analyzing ${done + 1} of ${total} document${total > 1 ? 's' : ''}…`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-6 py-3" dir="ltr">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">{statusText}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone && errors > 0 ? 'bg-destructive' : 'bg-zen-sage'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && errors > 0 && (
          <div className="mt-1 space-y-0.5">
            {queue.filter(j => j.status === 'error').map(j => (
              <p key={j.id} className="text-xs text-destructive">
                {translations.progressFailed[lang]} {j.resolvedName}{j.errorMsg ? ` — ${j.errorMsg}` : ''}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
