import { motion } from 'framer-motion';
import type { TranslationKey } from '@/lib/vault/translations';
import type { MetricFilter } from './MetricCards';

interface FilterEmptyStateProps {
  metricFilter: MetricFilter;
  search: string;
  lang: string;
  t: (key: TranslationKey) => string;
  onClearFilter: () => void;
  onClearSearch: () => void;
}

const filterConfig: Partial<Record<Exclude<MetricFilter, null>, { emoji: string; titleKey: TranslationKey; descKey: TranslationKey }>> = {
  assets: { emoji: '💰', titleKey: 'emptyFilterAssets', descKey: 'emptyFilterAssetsDesc' },
  upcoming: { emoji: '🎉', titleKey: 'emptyFilterUpcoming', descKey: 'emptyFilterUpcomingDesc' },
  pending: { emoji: '✅', titleKey: 'emptyFilterPending', descKey: 'emptyFilterPendingDesc' },
};

export function FilterEmptyState({
  metricFilter,
  search,
  lang,
  t,
  onClearFilter,
  onClearSearch,
}: FilterEmptyStateProps) {
  const config = metricFilter ? filterConfig[metricFilter] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-12 text-center space-y-3"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
        <span className="text-3xl">{config?.emoji || '🔍'}</span>
      </div>
      <p className="text-foreground font-medium text-sm">
        {config ? t(config.titleKey) : `${t('noResults')} "${search}"`}
      </p>
      <p className="text-muted-foreground text-xs max-w-xs mx-auto">
        {config
          ? t(config.descKey)
          : (lang === 'en' ? 'Try a different search term or clear your filter' : 'נסה מילת חיפוש אחרת או נקה את הסינון')}
      </p>
      {config ? (
        <button onClick={onClearFilter} className="text-xs text-primary hover:underline font-medium">
          {t('clearFilter')}
        </button>
      ) : (
        <button onClick={onClearSearch} className="text-xs text-primary hover:underline font-medium">
          {lang === 'en' ? 'Clear search' : 'נקה חיפוש'}
        </button>
      )}
    </motion.div>
  );
}
