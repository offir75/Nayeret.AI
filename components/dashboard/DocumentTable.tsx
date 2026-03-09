import { useState, useMemo } from 'react';

/** Safely coerce any unknown value to a display string. Handles {value: ...} objects from raw AI output. */
function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && 'value' in (v as object))
    return String((v as Record<string, unknown>).value ?? '');
  return String(v);
}
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, ArrowUpDown, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { DashboardCategoryBadge } from './DashboardCategoryBadge';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { formatLocalizedDate } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/lib/context/settings';
import { toast } from 'sonner';
import { CurrencyAmount } from '@/components/ui/currency-amount';

type SortField = 'type' | 'provider' | 'category' | 'amount' | 'date' | 'status' | 'transaction';
type SortDir = 'asc' | 'desc';

function SortableHeader({ label, field, currentField, currentDir, onSort }: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="p-4 text-xs font-semibold text-muted-foreground tracking-wide cursor-pointer select-none hover:text-foreground transition-colors group text-start"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </th>
  );
}

function getDocSortValue(doc: RichDoc, field: SortField): string | number {
  switch (field) {
    case 'type':        return doc.document_type;
    case 'provider':    return doc.provider;
    case 'category':    return doc.ui_category ?? '';
    case 'amount':      return doc.amount ?? -Infinity;
    case 'date':        return doc.issue_date || '';
    case 'status':      return doc.reviewed ? 1 : 0;
    case 'transaction': return doc.transaction_type;
  }
}

/* ═══════════════════════════════════════════════
   Transaction Type Toggle Button
   ═══════════════════════════════════════════════ */

const TRANSACTION_TYPES: Array<'income' | 'expense' | 'neutral'> = ['income', 'expense', 'neutral'];

function TransactionTypeButton({ doc, onUpdateDoc, size = 'sm' }: { doc: RichDoc; onUpdateDoc?: (doc: RichDoc) => void; size?: 'sm' | 'xs' }) {
  const { lang } = useLanguage();
  if (!onUpdateDoc) {
    return <TransactionTypeBadge type={doc.transaction_type} size={size} />;
  }

  const cycleType = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = TRANSACTION_TYPES.indexOf(doc.transaction_type);
    const nextIdx = (currentIdx + 1) % TRANSACTION_TYPES.length;
    const nextType = TRANSACTION_TYPES[nextIdx];
    onUpdateDoc({ ...doc, transaction_type: nextType });

    const labels = {
      income:  lang === 'en' ? 'Income'  : 'הכנסה',
      expense: lang === 'en' ? 'Expense' : 'הוצאה',
      neutral: lang === 'en' ? 'Neutral' : 'ניטרלי',
    };
    toast.success(lang === 'en' ? `Set as ${labels[nextType]}` : `סומן כ${labels[nextType]}`);
  };

  return (
    <button onClick={cycleType} className="shrink-0" title={lang === 'en' ? 'Click to change type' : 'לחץ לשינוי סוג'}>
      <TransactionTypeBadge type={doc.transaction_type} size={size} interactive />
    </button>
  );
}

function TransactionTypeBadge({ type, size = 'sm', interactive = false }: { type: 'income' | 'expense' | 'neutral'; size?: 'sm' | 'xs'; interactive?: boolean }) {
  const { lang } = useLanguage();

  const config = {
    income:  { icon: ArrowUpCircle,  label: lang === 'en' ? 'Income'  : 'הכנסה',  className: 'text-success bg-success/10 border-success/20'                              },
    expense: { icon: ArrowDownCircle, label: lang === 'en' ? 'Expense' : 'הוצאה', className: 'text-destructive bg-destructive/10 border-destructive/20'                    },
    neutral: { icon: MinusCircle,    label: lang === 'en' ? 'Neutral'  : 'ניטרלי', className: 'text-muted-foreground bg-muted/50 border-muted-foreground/20'               },
  };

  const { icon: Icon, label, className } = config[type];
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${className} ${interactive ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}

function sortDocuments(docs: RichDoc[], field: SortField | null, dir: SortDir): RichDoc[] {
  if (!field) return docs;
  return [...docs].sort((a, b) => {
    const va = getDocSortValue(a, field);
    const vb = getDocSortValue(b, field);
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb));
    }
    return dir === 'desc' ? -cmp : cmp;
  });
}

function TaxTagButton({ doc, onUpdateDoc, size = 'sm' }: { doc: RichDoc; onUpdateDoc?: (doc: RichDoc) => void; size?: 'sm' | 'xs' }) {
  const { t } = useLanguage();
  if (!onUpdateDoc) return null;
  const tagged = !!doc.tax_tagged;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const next = !tagged;
        onUpdateDoc({ ...doc, tax_tagged: next });
        toast.success(next ? t('addedToTax') : t('removedFromTax'));
      }}
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
        tagged
          ? 'text-primary bg-primary/10 hover:bg-primary/20'
          : 'text-muted-foreground/40 hover:text-primary hover:bg-primary/5'
      }`}
      title={tagged ? t('removeFromTax') : t('addToTax')}
    >
      <FileSpreadsheet className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
    </button>
  );
}

interface DocumentTableProps {
  documents: RichDoc[];
  onDocClick: (doc: RichDoc) => void;
  onDeleteDoc?: (doc: RichDoc) => void;
  onUpdateDoc?: (doc: RichDoc) => void;
}

/* ═══════════════════════════════════════════════
   Single document row (swipeable on mobile)
   ═══════════════════════════════════════════════ */

function SwipeableRow({ doc, onDocClick, onDeleteDoc, onUpdateDoc }: { doc: RichDoc; onDocClick: (doc: RichDoc) => void; onDeleteDoc?: (doc: RichDoc) => void; onUpdateDoc?: (doc: RichDoc) => void }) {
  const { t, lang } = useLanguage();
  const [swiped, setSwiped] = useState(false);
  const threshold = 80;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > threshold) {
      setSwiped(true);
    } else {
      setSwiped(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      <motion.div
        className="absolute inset-0 bg-destructive/90 flex items-center px-5 z-0"
        style={{ justifyContent: swiped ? 'flex-start' : 'flex-end' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteDoc?.(doc); }}
          className="flex items-center gap-2 text-destructive-foreground font-medium text-sm"
        >
          <Trash2 className="w-5 h-5" />
          {t('deleteText')}
        </button>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: swiped ? 120 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => !swiped && onDocClick(doc)}
        className="glass-card p-4 space-y-2 relative z-10 cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground text-sm">{toStr(doc.document_type)}</span>
          <TransactionTypeButton doc={doc} onUpdateDoc={onUpdateDoc} size="xs" />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{toStr(doc.provider)}</span>
          <span className="font-mono text-foreground">
            {doc.amount !== null && doc.amount !== undefined
              ? <CurrencyAmount value={Number(doc.amount)} currency={doc.currency || 'ILS'} className="text-foreground" />
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatLocalizedDate(doc.issue_date, lang)}</span>
            <DashboardCategoryBadge category={doc.ui_category} />
          </div>
          <div className="flex items-center gap-1.5">
            <TaxTagButton doc={doc} onUpdateDoc={onUpdateDoc} size="xs" />
            <ReviewStatusBadge reviewed={doc.reviewed} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main DocumentTable component
   ═══════════════════════════════════════════════ */

export function DocumentTable({ documents, onDocClick, onDeleteDoc, onUpdateDoc }: DocumentTableProps) {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedDocs = useMemo(() => sortDocuments(documents, sortField, sortDir), [documents, sortField, sortDir]);

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
      >
        <AnimatePresence>
          {sortedDocs.map((doc) => (
            <motion.div key={doc.id} layout exit={{ opacity: 0, x: 200, transition: { duration: 0.3 } }}>
              <SwipeableRow doc={doc} onDocClick={onDocClick} onDeleteDoc={onDeleteDoc} onUpdateDoc={onUpdateDoc} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <SortableHeader label={t('docType')}    field="type"        currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={t('provider')}   field="provider"    currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={lang === 'en' ? 'Type' : 'סוג'} field="transaction" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={t('category')}   field="category"    currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={t('amount')}     field="amount"      currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={t('date')}       field="date"        currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label={t('status')}     field="status"      currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <th className="w-12"></th>
            </tr>
          </thead>
          <AnimatePresence>
            <tbody>
              {sortedDocs.map((doc) => {
                return (
                  <motion.tr
                    key={doc.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group"
                    onClick={() => onDocClick(doc)}
                  >
                    <td className="p-4 font-medium text-foreground">{toStr(doc.document_type)}</td>
                    <td className="p-4 text-muted-foreground">{toStr(doc.provider)}</td>
                    <td className="p-4">
                      <TransactionTypeButton doc={doc} onUpdateDoc={onUpdateDoc} size="sm" />
                    </td>
                    <td className="p-4"><DashboardCategoryBadge category={doc.ui_category} /></td>
                    <td className="p-4 font-mono text-foreground">
                      {doc.amount !== null && doc.amount !== undefined
                        ? <CurrencyAmount value={Number(doc.amount)} currency={doc.currency || 'ILS'} className="text-foreground" />
                        : '—'}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{formatLocalizedDate(doc.issue_date, lang)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <ReviewStatusBadge reviewed={doc.reviewed} />
                        <TaxTagButton doc={doc} onUpdateDoc={onUpdateDoc} />
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteDoc?.(doc); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title={t('deleteDoc')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </AnimatePresence>
        </table>
      </div>
    </motion.div>
  );
}
