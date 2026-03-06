import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/lib/context/settings';
import { getTypeLabel } from '@/lib/vault/fieldMeta';

export const TYPE_CONFIG: Record<string, { label: { en: string; he: string }; color: string; emoji: string }> = {
  bill:             { label: { en: 'Bill',             he: 'חשבון'        }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '🧾' },
  financial_report: { label: { en: 'Financial Report', he: 'דוח פיננסי'   }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '📊' },
  receipt:          { label: { en: 'Receipt',          he: 'קבלה'          }, color: 'bg-zen-warm/10 text-zen-warm border-zen-warm/20',       emoji: '🧾' },
  claim:            { label: { en: 'Claim',            he: 'תביעה'         }, color: 'bg-destructive/10 text-destructive border-destructive/20', emoji: '📋' },
  insurance:        { label: { en: 'Insurance Policy', he: 'פוליסת ביטוח' }, color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',    emoji: '🛡' },
  identification:   { label: { en: 'Identity',         he: 'זיהוי'         }, color: 'bg-zen-warm/10 text-zen-warm border-zen-warm/20',       emoji: '🪪' },
  other:            { label: { en: 'Other',            he: 'אחר'           }, color: 'bg-secondary text-secondary-foreground border-border',  emoji: '📄' },
};

/** hebrewName: persisted display_name_he from insights — used when lang==='he' and type is free-form */
export function typeConfig(type: string, lang: 'en' | 'he' = 'en', hebrewName?: string | null) {
  const cfg = TYPE_CONFIG[type.toLowerCase()];
  if (cfg) return { label: cfg.label[lang], color: cfg.color, emoji: cfg.emoji };
  // Free-form taxonomy name — use persisted Hebrew name, static map, or raw name
  return {
    label: getTypeLabel(type, lang, hebrewName),
    color: 'bg-zen-sage-light text-zen-sage border-zen-sage/20',
    emoji: '📄',
  };
}

export default function CategoryBadge({ type, hebrewName }: { type: string; hebrewName?: string | null }) {
  const { lang } = useSettings();
  const { label, color } = typeConfig(type, lang, hebrewName);
  return (
    <Badge variant="outline" className={`text-xs font-normal ${color}`}>
      {label}
    </Badge>
  );
}
