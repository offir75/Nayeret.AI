import { motion } from 'framer-motion';
import { TrendingUp, Clock, Search, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { getNumericAmount } from '@/lib/vault/categoryMap';
import { useLanguage } from '@/lib/context/settings';
import { CurrencyAmount } from '@/components/ui/currency-amount';

export type MetricFilter = 'assets' | 'upcoming' | 'pending' | 'tax' | 'income' | 'expense' | null;

interface MetricCardsProps {
  documents: RichDoc[];
  activeFilter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
}

// Rough FX rates for display aggregation (ILS base)
const TO_ILS: Record<string, number> = { ILS: 1, USD: 3.6, EUR: 3.95, GBP: 4.5 };
const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

export function MetricCards({ documents, activeFilter, onFilterChange }: MetricCardsProps) {
  const { t, lang } = useLanguage();

  const assetDocs = documents.filter((d) => d.ui_category === 'Money' || d.ui_category === 'Trips & Tickets');
  const hasAssets = assetDocs.some((d) => {
    const amt = getNumericAmount(d.amount);
    return (Number(amt) || 0) > 0;
  });

  const byCurrency: Record<string, number> = {};
  assetDocs.forEach((d) => {
    const amt = getNumericAmount(d.amount);
    const num = Number(amt) || 0;
    if (num === 0) return;
    const cur = d.currency || 'ILS';
    byCurrency[cur] = (byCurrency[cur] || 0) + num;
  });

  const currencies = Object.keys(byCurrency);
  const isMixed = currencies.length > 1;
  const totalILS = Object.entries(byCurrency).reduce(
    (sum, [cur, val]) => sum + val * (TO_ILS[cur] || 1), 0
  );

  let assetDisplay: React.ReactNode;
  if (currencies.length === 0) {
    assetDisplay = <CurrencyAmount value={0} currency="ILS" />;
  } else if (!isMixed) {
    const cur = currencies[0];
    assetDisplay = cur === 'ILS'
      ? <CurrencyAmount value={byCurrency[cur]} currency="ILS" />
      : `${CURRENCY_SYMBOLS[cur] || ''}${byCurrency[cur].toLocaleString('en-US')}`;
  } else {
    assetDisplay = <CurrencyAmount value={Math.round(totalILS)} currency="ILS" approx />;
  }

  const upcomingDocs = documents.filter((d) => {
    if (!d.due_date) return false;
    const days = Math.ceil(
      (new Date(d.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days >= -7 && days <= 30;
  });
  const hasUpcoming = upcomingDocs.length > 0;

  const pendingReviewCount = documents.filter((d) => !d.reviewed).length;
  const taxDocs = documents.filter((d) => d.tax_tagged);
  const hasTaxDocs = taxDocs.length > 0;

  const incomeDocs = documents.filter((d) => d.transaction_type === 'income');
  const expenseDocs = documents.filter((d) => d.transaction_type === 'expense');
  const hasIncome = incomeDocs.length > 0;
  const hasExpenses = expenseDocs.length > 0;

  const handleClick = (key: MetricFilter) => {
    onFilterChange(activeFilter === key ? null : key);
  };

  type Metric = {
    key: MetricFilter;
    label: string;
    value: React.ReactNode;
    subtitle?: string;
    icon: typeof TrendingUp;
    accent: string;
    bgAccent: string;
    activeRing: string;
    visible: boolean;
  };

  const metrics: Metric[] = [
    {
      key: 'assets',
      label: t('totalAssets'),
      value: assetDisplay,
      subtitle: isMixed
        ? currencies.map((c) => `${CURRENCY_SYMBOLS[c] || c}${byCurrency[c].toLocaleString('en-US')}`).join(' + ')
        : undefined,
      icon: TrendingUp,
      accent: 'text-primary',
      bgAccent: 'bg-primary/10',
      activeRing: 'ring-primary/50',
      visible: hasAssets,
    },
    {
      key: 'upcoming',
      label: t('upcomingPayments'),
      value: upcomingDocs.length.toString(),
      subtitle: undefined,
      icon: Clock,
      accent: 'text-warning',
      bgAccent: 'bg-warning/10',
      activeRing: 'ring-warning/50',
      visible: hasUpcoming,
    },
    {
      key: 'pending',
      label: t('pendingReview'),
      value: pendingReviewCount.toString(),
      subtitle: undefined,
      icon: Search,
      accent: pendingReviewCount === 0 ? 'text-success' : 'text-caution',
      bgAccent: pendingReviewCount === 0 ? 'bg-success/10' : 'bg-caution/10',
      activeRing: pendingReviewCount === 0 ? 'ring-success/50' : 'ring-caution/50',
      visible: true,
    },
    {
      key: 'tax' as MetricFilter,
      label: t('taxFolder'),
      value: taxDocs.length.toString(),
      subtitle: undefined,
      icon: FileSpreadsheet,
      accent: 'text-primary',
      bgAccent: 'bg-primary/10',
      activeRing: 'ring-primary/50',
      visible: hasTaxDocs,
    },
    {
      key: 'income' as MetricFilter,
      label: lang === 'en' ? 'Income' : 'הכנסות',
      value: incomeDocs.length.toString(),
      subtitle: undefined,
      icon: ArrowUpCircle,
      accent: 'text-success',
      bgAccent: 'bg-success/10',
      activeRing: 'ring-success/50',
      visible: hasIncome,
    },
    {
      key: 'expense' as MetricFilter,
      label: lang === 'en' ? 'Expenses' : 'הוצאות',
      value: expenseDocs.length.toString(),
      subtitle: undefined,
      icon: ArrowDownCircle,
      accent: 'text-destructive',
      bgAccent: 'bg-destructive/10',
      activeRing: 'ring-destructive/50',
      visible: hasExpenses,
    },
  ];

  const visibleMetrics = metrics.filter((m) => m.visible);

  if (visibleMetrics.length === 0) return null;

  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };
  const cols = colsMap[visibleMetrics.length] || 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${cols} gap-4`}>
      {visibleMetrics.map((m, i) => {
        const isActive = activeFilter === m.key;
        return (
          <motion.button
            key={m.key}
            onClick={() => handleClick(m.key)}
            className={`glass-card p-5 glow-primary text-left transition-all duration-200 cursor-pointer ${
              isActive ? `ring-2 ${m.activeRing} shadow-lg` : 'hover:ring-1 hover:ring-border/60'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{m.label}</span>
              <div className={`p-2 rounded-lg ${m.bgAccent}`}>
                <m.icon className={`w-4 h-4 ${m.accent}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-mono tracking-tight ${m.accent}`}>
              {m.value}
            </p>
            {m.subtitle && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                {m.subtitle}
              </p>
            )}
            {isActive && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] text-primary font-medium mt-2"
              >
                {lang === 'en' ? '✓ Filtering · tap to clear' : '✓ מסנן · לחץ לביטול'}
              </motion.p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
