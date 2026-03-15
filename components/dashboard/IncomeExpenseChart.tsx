import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { getNumericAmount } from '@/lib/vault/categoryMap';
import { useLanguage } from '@/lib/context/settings';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AnimatePresence, motion } from 'framer-motion';
import { usePersistentCollapsed } from '@/hooks/usePersistentCollapsed';
import { CurrencyAmount } from '@/components/ui/currency-amount';
import { TO_ILS } from '@/lib/fx';

interface IncomeExpenseChartProps {
  documents: RichDoc[];
}


const chartConfig = {
  income:  { label: 'Income',   color: 'hsl(var(--success))'          },
  expense: { label: 'Expenses', color: 'hsl(var(--destructive))'       },
  neutral: { label: 'Neutral',  color: 'hsl(var(--muted-foreground))' },
};

const formatILSLabel = (value: number, suffix = '') => `\u200E₪\u00A0${value.toLocaleString('en-US')}${suffix}`;

export function IncomeExpenseChart({ documents }: IncomeExpenseChartProps) {
  const { lang } = useLanguage();
  const { collapsed, toggleCollapsed } = usePersistentCollapsed('nayeret_income_expense_collapsed');

  const totals = useMemo(() => {
    const sums = { income: 0, expense: 0, neutral: 0 };

    documents.forEach((doc) => {
      if (doc.amount == null) return;

      const amount = getNumericAmount(doc.amount);
      const num = Number(amount) || 0;
      if (num === 0) return;

      const currency = doc.currency || 'ILS';
      const ilsAmount = num * (TO_ILS[currency] || 1);

      sums[doc.transaction_type] += ilsAmount;
    });

    return sums;
  }, [documents]);

  const chartData = [
    { category: lang === 'en' ? 'Income'   : 'הכנסות', amount: Math.round(totals.income),  type: 'income'  },
    { category: lang === 'en' ? 'Expenses' : 'הוצאות', amount: Math.round(totals.expense), type: 'expense' },
  ];

  const netAmount = totals.income - totals.expense;
  const hasData = totals.income > 0 || totals.expense > 0;

  if (!hasData) return null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={toggleCollapsed} className="flex items-center gap-2 group cursor-pointer text-left">
          <h3 className="text-lg font-semibold text-foreground">
            {lang === 'en' ? 'Income vs Expenses' : 'הכנסות מול הוצאות'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {lang === 'en' ? 'Financial overview' : 'סקירה פיננסית'}
          </p>
          <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </button>

        <div className="flex items-center gap-2">
          {netAmount > 0 ? (
            <TrendingUp className="w-5 h-5 text-success" />
          ) : netAmount < 0 ? (
            <TrendingDown className="w-5 h-5 text-destructive" />
          ) : (
            <Minus className="w-5 h-5 text-muted-foreground" />
          )}
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{lang === 'en' ? 'Net' : 'נטו'}</div>
            <div className={`font-mono font-semibold ${
              netAmount > 0 ? 'text-success' : netAmount < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <CurrencyAmount value={Math.abs(netAmount)} currency="ILS" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="h-64">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="category" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs"
                      tickFormatter={(value) => formatILSLabel(value / 1000, 'K')} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`var(--color-${entry.type})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {lang === 'en' ? 'Total Income' : 'סה"כ הכנסות'}
                </div>
                <div className="font-mono font-semibold text-success">
                  <CurrencyAmount value={totals.income} currency="ILS" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {lang === 'en' ? 'Total Expenses' : 'סה"כ הוצאות'}
                </div>
                <div className="font-mono font-semibold text-destructive">
                  <CurrencyAmount value={totals.expense} currency="ILS" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
