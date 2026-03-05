import { TrendingUp, Receipt } from 'lucide-react';
import { useSettings } from '@/lib/context/settings';
import type { VaultDoc } from '@/lib/types';
import { convertAmount, fmtMoney } from '@/lib/vault/helpers';
import { translations } from '@/lib/vault/translations';

export default function VaultSummaryBar({ docs }: { docs: VaultDoc[] }) {
  const { currency, privacyMode, lang } = useSettings();
  const symbol = currency === 'ILS' ? '₪' : '$';

  let totalAssets = 0;
  let assetCount  = 0;
  let totalBills  = 0;
  let billCount   = 0;

  for (const doc of docs) {
    const ra = doc.raw_analysis;
    if (!ra) continue;

    if (doc.document_type === 'financial_report') {
      // Prefer total_balance; fall back to total_assets if present
      const n = Number(ra.total_balance ?? ra.total_assets);
      if (!isNaN(n) && n > 0) {
        totalAssets += convertAmount(n, String(ra.currency ?? 'ILS'), currency);
        assetCount++;
      }
    }

    if (doc.document_type === 'bill') {
      // Skip automatically-paid bills — they're not "to pay"
      if (ra.is_automatic_payment === true || ra.is_automatic_payment === 'true') continue;
      const n = Number(ra.total_amount);
      if (!isNaN(n) && n > 0) {
        totalBills += convertAmount(n, String(ra.currency ?? 'ILS'), currency);
        billCount++;
      }
    }
  }

  if (totalAssets === 0 && totalBills === 0) return null;

  const blurCls = privacyMode ? 'blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none' : '';

  const assetDesc = lang === 'he'
    ? `מ-${assetCount} דוח${assetCount !== 1 ? 'ות' : ''} פיננסי${assetCount !== 1 ? 'ים' : ''}`
    : `From ${assetCount} financial report${assetCount !== 1 ? 's' : ''}`;

  const billDesc = lang === 'he'
    ? `${billCount} חשבון${billCount !== 1 ? 'ות' : ''} ממתין${billCount !== 1 ? 'ים' : ''} לתשלום`
    : `${billCount} unpaid bill${billCount !== 1 ? 's' : ''}`;

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {totalAssets > 0 && (
        <div className="group bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">{translations.totalAssets[lang]}</p>
              <p className={`text-3xl font-semibold tracking-tight text-foreground tabular-nums ${blurCls}`}>
                {fmtMoney(totalAssets, symbol)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{assetDesc}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-sage/10 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-zen-sage" />
            </div>
          </div>
        </div>
      )}
      {totalBills > 0 && (
        <div className="group bg-card rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">{translations.pendingBills[lang]}</p>
              <p className={`text-3xl font-semibold tracking-tight text-foreground tabular-nums ${blurCls}`}>
                {fmtMoney(totalBills, symbol)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{billDesc}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zen-warm/10 flex-shrink-0">
              <Receipt className="w-5 h-5 text-zen-warm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
