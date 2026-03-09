import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { TrendingUp, ChevronDown } from 'lucide-react';
import type { RichDoc } from '@/lib/vault/docAdapter';
import { CATEGORY_MAP } from '@/lib/vault/categoryMap';
import { useLanguage } from '@/lib/context/settings';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersistentCollapsed } from '@/hooks/usePersistentCollapsed';
import { CurrencyAmount } from '@/components/ui/currency-amount';

const formatILSLabel = (value: number, suffix = '') => `\u200E₪\u00A0${value.toLocaleString('en-US')}${suffix}`;

const CATEGORY_COLORS: Record<string, string> = {
  'Identity':              'hsl(210, 60%, 55%)',
  'Money':                 'hsl(168, 65%, 38%)',
  'Bills & Receipts':      'hsl(35, 80%, 55%)',
  'Insurance & Contracts': 'hsl(280, 50%, 55%)',
  'Trips & Tickets':       'hsl(340, 60%, 55%)',
};

const TO_ILS: Record<string, number> = { ILS: 1, USD: 3.65, EUR: 3.95, GBP: 4.6 };

interface SpendingInsightsProps {
  documents: RichDoc[];
}

export function SpendingInsights({ documents }: SpendingInsightsProps) {
  const { lang } = useLanguage();
  const [view, setView] = useState<'trend' | 'category'>('trend');
  const { collapsed, toggleCollapsed } = usePersistentCollapsed('nayeret_insights_collapsed');

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' });
      months.push({ key, label, total: 0 });
    }

    documents.forEach((doc) => {
      if (doc.amount == null) return;
      const dateStr = doc.issue_date || doc.created_at?.split('T')[0];
      if (!dateStr) return;
      const docDate = new Date(dateStr);
      const docKey = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find((m) => m.key === docKey);
      if (month) {
        month.total += (doc.amount as number) * (TO_ILS[doc.currency || 'ILS'] || 1);
      }
    });

    return months;
  }, [documents, lang]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    documents.forEach((doc) => {
      if (doc.amount == null) return;
      const cat = doc.ui_category || 'Other';
      const ils = (doc.amount as number) * (TO_ILS[doc.currency || 'ILS'] || 1);
      map[cat] = (map[cat] || 0) + ils;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat,
        label: lang === 'en' ? CATEGORY_MAP[cat]?.en || cat : CATEGORY_MAP[cat]?.he || cat,
        amount: Math.round(amount),
        color: CATEGORY_COLORS[cat] || 'hsl(200, 20%, 50%)',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [documents, lang]);

  const totalSpend = categoryData.reduce((s, c) => s + c.amount, 0);
  const hasData = documents.some((d) => d.amount != null);

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="glass-card p-4 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <button onClick={toggleCollapsed} className="flex items-center gap-2 group cursor-pointer text-start">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {lang === 'en' ? 'Spending Insights' : 'תובנות הוצאות'}
          </h2>
          <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </button>
        {!collapsed && (
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setView('trend')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === 'trend' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {lang === 'en' ? 'Trend' : 'מגמה'}
            </button>
            <button
              onClick={() => setView('category')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === 'category' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {lang === 'en' ? 'Categories' : 'קטגוריות'}
            </button>
          </div>
        )}
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
            <div className="flex items-baseline gap-2">
              <CurrencyAmount
                value={totalSpend}
                currency="ILS"
                className="text-2xl font-bold text-foreground"
              />
              <span className="text-xs text-muted-foreground">
                {lang === 'en' ? 'total tracked' : 'סה"כ מעקב'}
              </span>
            </div>

            {view === 'trend' ? (
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(168, 65%, 38%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(168, 65%, 38%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 25%)" strokeOpacity={0.15} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(220, 12%, 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 12%, 50%)' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => formatILSLabel(v / 1000, 'k')} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(220, 25%, 14%)',
                        border: '1px solid hsl(220, 15%, 25%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: 'hsl(0, 0%, 90%)',
                      }}
                      formatter={(value: unknown) => [formatILSLabel(Number(value) || 0), lang === 'en' ? 'Spending' : 'הוצאות']}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(168, 65%, 38%)" strokeWidth={2.5}
                      fill="url(#spendGrad)" dot={{ r: 4, fill: 'hsl(168, 65%, 38%)', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: 'hsl(168, 65%, 38%)', stroke: 'hsl(0, 0%, 100%)', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-44 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: 'hsl(220, 12%, 50%)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(220, 25%, 14%)',
                          border: '1px solid hsl(220, 15%, 25%)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: 'hsl(0, 0%, 90%)',
                        }}
                        formatter={(value: unknown) => [formatILSLabel(Number(value) || 0), '']}
                      />
                      <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
                        {categoryData.map((entry) => (
                          <Cell key={entry.category} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {categoryData.map((c) => (
                    <div key={c.category} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-xs text-muted-foreground">
                        {c.label} <span className="font-mono font-medium text-foreground">{totalSpend > 0 ? Math.round((c.amount / totalSpend) * 100) : 0}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
