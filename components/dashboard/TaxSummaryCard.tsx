import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Download, ChevronDown, Receipt, MoreVertical } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { useLanguage } from '@/lib/context/settings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { usePersistentCollapsed } from '@/hooks/usePersistentCollapsed';
import { CurrencyAmount } from '@/components/ui/currency-amount';
import { TO_ILS } from '@/lib/fx';

// ─── Inline category map ──────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, { he: string; en: string; code: string; israeli_code: string }> = {
  'Identity':              { he: 'זהות',               en: 'Identity',              code: 'ID',  israeli_code: 'DOC' },
  'Money':                 { he: 'כספים',               en: 'Money',                 code: 'MON', israeli_code: 'FIN' },
  'Bills & Receipts':      { he: 'חשבונות וקבלות',     en: 'Bills & Receipts',      code: 'BIL', israeli_code: 'RCP' },
  'Insurance & Contracts': { he: 'ביטוח וחוזים',       en: 'Insurance & Contracts', code: 'INS', israeli_code: '461' },
  'Trips & Tickets':       { he: 'טיולים וכרטיסים',    en: 'Trips & Tickets',       code: 'TRV', israeli_code: '411' },
  'Office Supplies':       { he: 'ציוד משרדי',          en: 'Office Supplies',       code: 'OFF', israeli_code: '401' },
  'Travel':                { he: 'נסיעות',              en: 'Travel',                code: 'TRP', israeli_code: '412' },
  'Meals & Entertainment': { he: 'אוכל ואירוח',         en: 'Meals & Entertainment', code: 'MEL', israeli_code: '421' },
  'Equipment':             { he: 'ציוד',                en: 'Equipment',             code: 'EQP', israeli_code: '451' },
  'Utilities':             { he: 'שירותים',             en: 'Utilities',             code: 'UTL', israeli_code: '441' },
  'Professional Services': { he: 'שירותים מקצועיים',   en: 'Professional Services', code: 'PRO', israeli_code: '431' },
  'Marketing':             { he: 'שיווק',               en: 'Marketing',             code: 'MKT', israeli_code: '471' },
  'Education':             { he: 'חינוך והשתלמות',      en: 'Education',             code: 'EDU', israeli_code: '481' },
  'Healthcare':            { he: 'בריאות',              en: 'Healthcare',            code: 'HTH', israeli_code: '491' },
};

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

// ─── Tax period hook ──────────────────────────────────────────────────────────

export function useTaxPeriod() {
  const [taxPeriod, setTaxPeriodState] = useState<'monthly' | 'yearly'>(() =>
    (localStorage.getItem('nayeret_tax_period') as 'monthly' | 'yearly') || 'yearly'
  );
  const setTaxPeriod = (v: 'monthly' | 'yearly') => {
    localStorage.setItem('nayeret_tax_period', v);
    setTaxPeriodState(v);
    window.dispatchEvent(new Event('nayeret_tax_period_change'));
  };
  useEffect(() => {
    const handler = () =>
      setTaxPeriodState((localStorage.getItem('nayeret_tax_period') as 'monthly' | 'yearly') || 'yearly');
    window.addEventListener('nayeret_tax_period_change', handler);
    return () => window.removeEventListener('nayeret_tax_period_change', handler);
  }, []);
  return { taxPeriod, setTaxPeriod };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaxSummaryCardProps {
  documents: RichDoc[];
  onDocClick?: (doc: RichDoc) => void;
  /** When set, jumps the year/month selectors to the given date (e.g. after adding a document to the tax folder). */
  initialYear?: number;
  initialMonth?: number;
}

export function TaxSummaryCard({ documents, onDocClick, initialYear, initialMonth }: TaxSummaryCardProps) {
  const { t, lang } = useLanguage();
  const { taxPeriod } = useTaxPeriod();
  const { collapsed, toggleCollapsed } = usePersistentCollapsed('nayeret_tax_collapsed');
  const [selectedYear, setSelectedYear]   = useState(() => initialYear ?? new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => initialMonth ?? new Date().getMonth()); // 0-indexed

  // Sync selectors when parent triggers a jump (e.g. after tagging a document)
  useEffect(() => {
    if (initialYear != null) setSelectedYear(initialYear);
  }, [initialYear]);
  useEffect(() => {
    if (initialMonth != null) setSelectedMonth(initialMonth);
  }, [initialMonth]);

  const taxDocs = useMemo(() => {
    return documents.filter((d) => {
      if (!d.tax_tagged) return false;
      const dateStr = d.issue_date || d.created_at?.split('T')[0];
      if (!dateStr) return true;
      const date = new Date(dateStr);
      if (taxPeriod === 'monthly') {
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      }
      return date.getFullYear() === selectedYear;
    });
  }, [documents, selectedYear, selectedMonth, taxPeriod]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    documents.filter((d) => d.tax_tagged).forEach((d) => {
      const dateStr = d.issue_date || d.created_at?.split('T')[0];
      if (dateStr) years.add(new Date(dateStr).getFullYear());
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  const byCategory = useMemo(() => {
    const map: Record<string, { count: number; totalILS: number }> = {};
    taxDocs.forEach((d) => {
      const cat = d.ui_category ?? 'Other';
      if (!map[cat]) map[cat] = { count: 0, totalILS: 0 };
      map[cat].count += 1;
      if (d.amount != null) {
        map[cat].totalILS += d.amount * (TO_ILS[d.currency || 'ILS'] || 1);
      }
    });
    return Object.entries(map).sort((a, b) => b[1].totalILS - a[1].totalILS);
  }, [taxDocs]);

  const grandTotal = byCategory.reduce((s, [, v]) => s + v.totalILS, 0);
  const hasAnyTaxTaggedDocs = documents.some((d) => d.tax_tagged);

  const periodLabel = taxPeriod === 'monthly'
    ? `${lang === 'en' ? MONTH_NAMES_EN[selectedMonth] : MONTH_NAMES_HE[selectedMonth]} ${selectedYear}`
    : `${selectedYear}`;

  const exportCSV = () => {
    const headers = [
      'Document Type', 'Provider', 'Category', 'Israeli Tax Code', 'Total Amount',
      'Amount Before VAT', 'VAT Amount', 'VAT Rate %', 'Currency',
      'Deductible %', 'Date', 'Tax Notes', 'Mas Hachnasa Code', 'Summary',
    ];
    const rows = taxDocs.map((d) => {
      const ra = (d.raw_analysis ?? {}) as Record<string, unknown>;
      const categoryInfo = CATEGORY_MAP[d.ui_category ?? ''];
      const vatRate     = (ra.vat_rate     as number | null | undefined);
      const vatAmount   = (ra.vat_amount   as number | null | undefined);
      const beforeVat   = (ra.amount_before_vat as number | null | undefined);
      return [
        d.document_type,
        d.provider,
        d.ui_category ?? '',
        categoryInfo?.israeli_code || categoryInfo?.code || '',
        d.amount?.toString() || '',
        (beforeVat ?? (vatRate && d.amount ? (d.amount / (1 + vatRate / 100)).toFixed(2) : '')).toString(),
        (vatAmount ?? (vatRate && d.amount ? (d.amount - (d.amount / (1 + vatRate / 100))).toFixed(2) : '')).toString(),
        (vatRate ?? 17).toString(),
        d.currency || 'ILS',
        ((ra.tax_deductible_percentage as number | undefined) ?? 100).toString(),
        d.issue_date || '',
        (ra.tax_notes as string | undefined) || '',
        (ra.mas_hachnasa_code as string | undefined) || `${categoryInfo?.code || 'GEN'}-${categoryInfo?.israeli_code || '000'}`,
        (lang === 'en' ? d.summary_en : d.summary_he) ?? '',
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mas_hachnasa_export_${periodLabel.replace(' ', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('taxExported'), {
      description: `${taxDocs.length} ${t('taxDocs')} · ${periodLabel} · Mas Hachnasa format`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="glass-card p-4 sm:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={toggleCollapsed} className="flex items-center gap-2 group cursor-pointer text-start">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {t('taxFolder')}
          </h2>
          <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
          <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded ms-1">
            {taxDocs.length}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs bg-muted/50 border border-border/50 rounded-lg px-2 py-1 text-foreground font-mono cursor-pointer"
            disabled={!hasAnyTaxTaggedDocs}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month selector (monthly mode only) */}
          {taxPeriod === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs bg-muted/50 border border-border/50 rounded-lg px-2 py-1 text-foreground font-mono cursor-pointer"
              disabled={!hasAnyTaxTaggedDocs}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {lang === 'en' ? MONTH_NAMES_EN[i] : MONTH_NAMES_HE[i]}
                </option>
              ))}
            </select>
          )}

          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem onClick={exportCSV} disabled={!hasAnyTaxTaggedDocs} className="gap-2 cursor-pointer text-xs">
                <Download className="w-3.5 h-3.5" />
                {t('exportCsv')} Mas Hachnasa ({periodLabel})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden space-y-4"
          >
            {!hasAnyTaxTaggedDocs ? (
              <div className="text-center py-6 space-y-2">
                <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  {lang === 'en' ? 'No tax documents yet' : 'עדיין אין מסמכי מס'}
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  {lang === 'en'
                    ? 'Mark a document as tax-related to populate this section.'
                    : 'סמנו מסמך כרלוונטי למס כדי למלא את הסעיף הזה.'}
                </p>
              </div>
            ) : taxDocs.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Receipt className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">{t('noTaxDocs')}</p>
                <p className="text-[11px] text-muted-foreground/60">{t('noTaxDocsDesc')}</p>
              </div>
            ) : (
              <>
                {/* Grand total */}
                <div className="flex items-baseline gap-2">
                  <CurrencyAmount value={Math.round(grandTotal)} currency="ILS" className="text-2xl font-bold text-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t('taxTotal')} · {taxDocs.length} {t('taxDocs')}
                  </span>
                </div>

                {/* Category breakdown */}
                <div className="space-y-2">
                  {byCategory.map(([cat, data]) => {
                    const catInfo = CATEGORY_MAP[cat];
                    const label   = lang === 'en' ? catInfo?.en || cat : catInfo?.he || cat;
                    const pct     = grandTotal > 0 ? Math.round((data.totalILS / grandTotal) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-foreground font-medium">{label}</span>
                            <span className="text-muted-foreground font-mono">
                              <CurrencyAmount value={Math.round(data.totalILS)} currency="ILS" /> ({data.count})
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary/60 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recent tax docs */}
                <div className="space-y-1.5">
                  {taxDocs.slice(0, 5).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onDocClick?.(d)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-xs cursor-pointer"
                    >
                      <span className="text-foreground font-medium truncate">
                        {d.document_type} — {d.provider}
                      </span>
                      {d.amount != null && (
                        <span className="text-foreground font-mono shrink-0 ms-2">
                          <CurrencyAmount value={Number(d.amount)} currency={d.currency || 'ILS'} />
                        </span>
                      )}
                    </button>
                  ))}
                  {taxDocs.length > 5 && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      +{taxDocs.length - 5} {lang === 'en' ? 'more' : 'נוספים'}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
