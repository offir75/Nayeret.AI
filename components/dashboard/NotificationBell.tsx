import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle2, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { formatLocalizedDate } from '@/lib/dateUtils';
import { useLanguage } from '@/lib/context/settings';
import { CurrencyAmount } from '@/components/ui/currency-amount';

interface Reminder {
  id: string;
  doc: RichDoc;
  type: 'overdue' | 'urgent' | 'upcoming';
  daysUntil: number;
}

function getReminderLabel(r: Reminder, lang: string): string {
  if (r.type === 'overdue') {
    const d = Math.abs(r.daysUntil);
    return lang === 'en' ? `${d} day${d > 1 ? 's' : ''} overdue` : `באיחור של ${d} ימים`;
  }
  if (r.daysUntil === 0) return lang === 'en' ? 'Due today' : 'להיום';
  if (r.daysUntil === 1) return lang === 'en' ? 'Due tomorrow' : 'למחר';
  return lang === 'en' ? `Due in ${r.daysUntil} days` : `בעוד ${r.daysUntil} ימים`;
}

function getReminderIcon(type: Reminder['type']) {
  if (type === 'overdue') return AlertTriangle;
  if (type === 'urgent') return Clock;
  return CheckCircle2;
}

function getReminderColor(type: Reminder['type']) {
  if (type === 'overdue') return 'text-destructive';
  if (type === 'urgent') return 'text-warning';
  return 'text-muted-foreground';
}

function getReminderBg(type: Reminder['type']) {
  if (type === 'overdue') return 'bg-destructive/10';
  if (type === 'urgent') return 'bg-warning/10';
  return 'bg-muted/30';
}

interface NotificationBellProps {
  documents: RichDoc[];
  onDocClick: (doc: RichDoc) => void;
}

export function NotificationBell({ documents, onDocClick }: NotificationBellProps) {
  const { lang, isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nayeret_dismissed_reminders');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const reminders = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const items: Reminder[] = [];

    documents.forEach((doc) => {
      const dateStr = doc.due_date || doc.next_reminder_date;
      if (!dateStr) return;
      const due = new Date(dateStr);
      due.setHours(0, 0, 0, 0);
      const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diff > 14) return;

      const type: Reminder['type'] = diff < 0 ? 'overdue' : diff <= 3 ? 'urgent' : 'upcoming';
      items.push({ id: doc.id, doc, type, daysUntil: diff });
    });

    items.sort((a, b) => {
      const order = { overdue: 0, urgent: 1, upcoming: 2 };
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return a.daysUntil - b.daysUntil;
    });

    return items;
  }, [documents]);

  const activeReminders = reminders.filter((r) => !dismissed.has(r.id));
  const overdueCount = activeReminders.filter((r) => r.type === 'overdue').length;
  const urgentCount = activeReminders.filter((r) => r.type === 'urgent').length;
  const badgeCount = overdueCount + urgentCount;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('nayeret_dismissed_reminders', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer shrink-0">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {badgeCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1"
            >
              {badgeCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 max-h-[70vh] flex flex-col">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-foreground">
            {lang === 'en' ? 'Reminders' : 'תזכורות'}
          </h3>
          <span className="text-xs text-muted-foreground">
            {activeReminders.length} {lang === 'en' ? 'active' : 'פעילות'}
          </span>
        </div>

        <div className="overflow-y-auto flex-1">
          {activeReminders.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-primary/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {lang === 'en' ? 'All clear! No upcoming deadlines.' : 'הכל בסדר! אין תאריכי יעד קרובים.'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activeReminders.map((r) => {
                const Icon = getReminderIcon(r.type);
                const docName = r.doc.document_type;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0">
                      <div className={`w-8 h-8 rounded-lg ${getReminderBg(r.type)} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${getReminderColor(r.type)}`} />
                      </div>
                      <button
                        onClick={() => { onDocClick(r.doc); setOpen(false); }}
                        className="flex-1 min-w-0 text-start"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{docName}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.doc.provider}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold ${getReminderColor(r.type)}`}>
                            {getReminderLabel(r, lang)}
                          </span>
                          {r.doc.amount != null && (
                            <CurrencyAmount value={Number(r.doc.amount)} currency={r.doc.currency || 'ILS'} className="text-xs text-muted-foreground" />
                          )}
                        </div>
                        {r.doc.due_date && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatLocalizedDate(r.doc.due_date, lang)}
                          </p>
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDismiss(r.id)}
                          className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title={lang === 'en' ? 'Dismiss' : 'הסתר'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { onDocClick(r.doc); setOpen(false); }}
                          className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Chevron className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
