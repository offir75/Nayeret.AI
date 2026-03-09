import { motion } from 'framer-motion';
import { Flame, ShieldCheck } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { useLanguage } from '@/lib/context/settings';
import { useStreak } from '@/hooks/useStreak';

// nayeret.ai canonical categories
const ALL_CATEGORIES = ['Identity', 'Money', 'Bills & Receipts', 'Insurance & Contracts', 'Trips & Tickets'] as const;

const CATEGORY_LABELS: Record<string, { en: string; he: string; emoji: string }> = {
  'Identity':              { en: 'Identity',   he: 'זהות',              emoji: '🪪' },
  'Money':                 { en: 'Money',      he: 'כספים',             emoji: '💰' },
  'Bills & Receipts':      { en: 'Bills',      he: 'חשבונות',           emoji: '🧾' },
  'Insurance & Contracts': { en: 'Insurance',  he: 'ביטוח',             emoji: '🛡️' },
  'Trips & Tickets':       { en: 'Trips',      he: 'טיולים',            emoji: '✈️' },
};

interface EngagementBarProps {
  documents: RichDoc[];
}

export function EngagementBar({ documents }: EngagementBarProps) {
  const { lang } = useLanguage();
  const streak = useStreak();

  const coveredCategories = new Set(documents.map((d) => d.ui_category));
  const completeness = Math.round((coveredCategories.size / ALL_CATEGORIES.length) * 100);

  if (documents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row gap-3"
    >
      {/* Streak */}
      {streak > 0 && (
        <div className="glass-card px-4 py-3 flex items-center gap-3 sm:min-w-[180px]">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono text-foreground leading-tight">
              {streak} {streak === 1 ? (lang === 'en' ? 'day' : 'יום') : (lang === 'en' ? 'days' : 'ימים')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {lang === 'en' ? 'Active streak 🔥' : 'רצף פעילות 🔥'}
            </p>
          </div>
        </div>
      )}

      {/* Completeness */}
      <div className="glass-card px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {lang === 'en' ? 'Document Coverage' : 'כיסוי מסמכים'}
            </span>
          </div>
          <span className={`text-sm font-bold font-mono ${
            completeness === 100 ? 'text-success' : completeness >= 60 ? 'text-primary' : 'text-caution'
          }`}>
            {completeness}%
          </span>
        </div>
        <div className="flex gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const covered = coveredCategories.has(cat);
            const info = CATEGORY_LABELS[cat];
            return (
              <motion.div
                key={cat}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-center transition-colors ${
                  covered
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30 border border-border/30'
                }`}
                initial={false}
                animate={covered ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
                title={lang === 'en' ? info.en : info.he}
              >
                <span className={`text-sm ${covered ? '' : 'grayscale opacity-40'}`}>{info.emoji}</span>
                <span className={`text-[9px] font-medium leading-tight ${
                  covered ? 'text-foreground' : 'text-muted-foreground/50'
                }`}>
                  {lang === 'en' ? info.en : info.he}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
