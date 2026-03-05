import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/context/settings';

const t = {
  confirmDeleteTitle: { en: 'Delete document?',     he: 'מחיקת מסמך?'           },
  confirmDeleteBody:  { en: 'This cannot be undone.', he: 'פעולה זו אינה ניתנת לביטול.' },
  confirmCancel:      { en: 'Cancel',               he: 'ביטול'                 },
  confirmDelete:      { en: 'Delete',               he: 'מחק'                   },
};

export default function ConfirmDialog({ filename, onConfirm, onCancel }: { filename: string; onConfirm: () => void; onCancel: () => void }) {
  const { lang } = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zen-stone/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-border" dir={lang === 'he' ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground mb-1">{t.confirmDeleteTitle[lang]}</h3>
        <p className="text-sm text-muted-foreground mb-1 truncate" title={filename}>"{filename}"</p>
        <p className="text-sm text-destructive mb-5">{t.confirmDeleteBody[lang]}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>{t.confirmCancel[lang]}</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>{t.confirmDelete[lang]}</Button>
        </div>
      </div>
    </div>
  );
}
