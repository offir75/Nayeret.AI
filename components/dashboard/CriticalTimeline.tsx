import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Bell, ChevronDown } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { formatLocalizedDate, daysUntil, getUrgencyLevel } from '@/lib/dateUtils';
import { useLanguage } from '@/lib/context/settings';
import { usePersistentCollapsed } from '@/hooks/usePersistentCollapsed';

interface CriticalTimelineProps {
  documents: RichDoc[];
  onDocClick: (doc: RichDoc) => void;
}

export function CriticalTimeline({ documents, onDocClick }: CriticalTimelineProps) {
  const { t, lang, isRtl } = useLanguage();
  const { collapsed, toggleCollapsed } = usePersistentCollapsed('nayeret_critical_collapsed');

  const urgencyConfig = {
    urgent: {
      icon: AlertTriangle,
      border: 'border-urgent/40',
      bg: 'bg-urgent/5',
      dot: 'bg-urgent',
      text: 'text-urgent',
      label: t('overdue'),
    },
    caution: {
      icon: Clock,
      border: 'border-caution/40',
      bg: 'bg-caution/5',
      dot: 'bg-caution',
      text: 'text-caution',
      label: t('soon'),
    },
    notice: {
      icon: Bell,
      border: 'border-notice/40',
      bg: 'bg-notice/5',
      dot: 'bg-notice',
      text: 'text-notice',
      label: t('reminder'),
    },
  };

  const critical = documents
    .filter((d) => getUrgencyLevel(d.next_reminder_date) !== null)
    .sort((a, b) => {
      const da = daysUntil(a.next_reminder_date) ?? 999;
      const db = daysUntil(b.next_reminder_date) ?? 999;
      return da - db;
    });

  if (critical.length === 0) return null;

  return (
    <motion.div
      className="glass-card p-4 sm:p-6 space-y-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
    >
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-between w-full group cursor-pointer text-start"
      >
        <div className="text-start">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {t('criticalAlerts')}
            </h2>
            <motion.div
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.div>
          </div>
          <p className="text-sm text-muted-foreground">
            {lang === 'en' ? 'Upcoming and overdue reminders' : 'תזכורות קרובות ופגות תוקף'}
          </p>
        </div>
        <div className="text-end">
          <div className="text-2xl font-bold text-foreground">{critical.length}</div>
          <div className="text-xs text-muted-foreground">
            {lang === 'en' ? 'critical items' : 'התראות פעילות'}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="space-y-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {critical.map((doc, i) => {
              const level = getUrgencyLevel(doc.next_reminder_date)!;
              const config = urgencyConfig[level];
              const days = daysUntil(doc.next_reminder_date);
              const Icon = config.icon;

              return (
                <motion.button
                  key={doc.id}
                  onClick={() => onDocClick(doc)}
                  initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.35, ease: 'easeOut' }}
                  className={`w-full glass-card ${config.bg} ${config.border} border p-4 rounded-xl flex items-center gap-4 hover:scale-[1.01] transition-all cursor-pointer group ${isRtl ? 'text-right' : 'text-left'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${config.dot} shrink-0 animate-pulse`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {doc.document_type}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.provider} · {formatLocalizedDate(doc.next_reminder_date, lang)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-lg font-bold font-mono ${config.text}`}>
                      {days !== null && days <= 0 ? t('passed') : `${days} ${t('days')}`}
                    </span>
                  </div>
                  <Icon className={`w-4 h-4 ${config.text} shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
