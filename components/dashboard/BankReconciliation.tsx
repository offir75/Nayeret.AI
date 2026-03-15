import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Search, ChevronDown, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/context/settings';
import { usePersistentCollapsed } from '@/hooks/usePersistentCollapsed';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { CurrencyAmount } from '@/components/ui/currency-amount';
import { formatLocalizedDate } from '@/lib/dateUtils';

// ─── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'nayeret_reconciled_ids';

function loadReconciledIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReconciledIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch { /* storage quota */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BankReconciliationProps {
  documents: RichDoc[];
}

export const BankReconciliation = ({ documents }: BankReconciliationProps) => {
  const { lang } = useLanguage();
  const { collapsed, toggleCollapsed } = usePersistentCollapsed('nayeret_bank_reconciliation_collapsed');
  const [searchTerm, setSearchTerm] = useState('');
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(() => loadReconciledIds());

  // Only show documents that have an amount (income/expense transactions)
  const reconcilableItems = useMemo(() =>
    documents
      .filter((d) => d.amount != null)
      .sort((a, b) => {
        const da = a.issue_date ?? a.created_at ?? '';
        const db = b.issue_date ?? b.created_at ?? '';
        return db.localeCompare(da);
      }),
    [documents],
  );

  const toggleReconciled = (id: string) => {
    setReconciledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReconciledIds(next);
      return next;
    });
  };

  const reconciledCount = reconcilableItems.filter((d) => reconciledIds.has(d.id)).length;
  const total = reconcilableItems.length;
  const rate = total > 0 ? (reconciledCount / total) * 100 : 0;

  const filtered = reconcilableItems.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.provider ?? '').toLowerCase().includes(term) ||
      (d.document_type ?? '').toLowerCase().includes(term) ||
      (d.summary_he ?? '').toLowerCase().includes(term) ||
      (d.summary_en ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <Card className="p-6">
      {/* Header */}
      <button onClick={toggleCollapsed} className="flex items-center justify-between w-full mb-4 group text-start">
        <div className="flex items-center justify-between flex-1">
          <div className="text-start">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {lang === 'en' ? 'Document Reconciliation' : 'התאמת מסמכים'}
              </h3>
              <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.div>
            </div>
            <p className="text-sm text-muted-foreground">
              {lang === 'en'
                ? 'Mark income & expense documents as verified'
                : 'סמנו מסמכי הכנסות והוצאות כמאומתים'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <div className="text-2xl font-bold text-foreground">{rate.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">
                {reconciledCount}/{total} {lang === 'en' ? 'verified' : 'מאומתים'}
              </div>
            </div>
          </div>
        </div>
      </button>

      {!collapsed && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {total === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Landmark className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {lang === 'en' ? 'No transaction documents yet' : 'עדיין אין מסמכי עסקאות'}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {lang === 'en'
                  ? 'Upload invoices, receipts, or pay stubs to begin reconciliation.'
                  : 'העלה חשבוניות, קבלות או תלושי שכר כדי להתחיל.'}
              </p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === 'en' ? 'Search documents...' : 'חפש מסמכים...'}
                  className="ps-9"
                />
              </div>

              {/* Document list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filtered.map((doc) => {
                  const isReconciled = reconciledIds.has(doc.id);
                  const dateStr = doc.issue_date ?? doc.created_at?.split('T')[0];
                  const displayDate = dateStr ? formatLocalizedDate(dateStr, lang as 'he' | 'en') : '—';
                  const isIncome = doc.transaction_type === 'income';
                  const label = (lang === 'en'
                    ? (doc.summary_en ?? doc.document_type)
                    : (doc.summary_he ?? doc.document_type)
                  ) || doc.provider || doc.document_type;

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border transition-colors ${
                        isReconciled
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => toggleReconciled(doc.id)}
                          className="mt-0.5 shrink-0 focus:outline-none"
                          aria-label={isReconciled
                            ? (lang === 'en' ? 'Mark unverified' : 'הסר אימות')
                            : (lang === 'en' ? 'Mark verified' : 'סמן כמאומת')}
                        >
                          {isReconciled
                            ? <CheckCircle2 className="w-4 h-4 text-primary" />
                            : <Circle className="w-4 h-4 text-muted-foreground" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{label}</span>
                            {doc.transaction_type && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 gap-1">
                                {isIncome
                                  ? <TrendingUp className="w-2.5 h-2.5 text-green-600" />
                                  : <TrendingDown className="w-2.5 h-2.5 text-foreground" />}
                                {lang === 'en' ? (isIncome ? 'Income' : 'Expense') : (isIncome ? 'הכנסה' : 'הוצאה')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground ms-0">
                            <span>{displayDate}</span>
                            {doc.provider && <><span>•</span><span className="truncate">{doc.provider}</span></>}
                          </div>
                        </div>

                        <div className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-green-600' : 'text-foreground'}`}>
                          {isIncome ? '+' : ''}
                          <CurrencyAmount value={Number((doc.amount ?? 0).toFixed(2))} currency={doc.currency || 'ILS'} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {filtered.length === 0 && searchTerm && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    {lang === 'en' ? 'No results' : 'אין תוצאות'}
                  </div>
                )}
              </div>

              {/* Bank sync CTA */}
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-dashed border-border/60">
                <Landmark className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {lang === 'en' ? 'Automatic bank sync — coming soon' : 'סנכרון בנק אוטומטי — בקרוב'}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {lang === 'en'
                      ? 'Connect your bank to auto-match transactions with documents.'
                      : 'חבר את הבנק שלך כדי להתאים תנועות למסמכים אוטומטית.'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
