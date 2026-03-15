import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/context/settings';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪', NIS: '₪', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'CA$', AUD: 'A$',
};

interface CurrencyAmountProps {
  value: number | string;
  currency?: string;
  approx?: boolean;
  className?: string;
  amountClassName?: string;
  symbolClassName?: string;
}

export function CurrencyAmount({
  value,
  currency = 'ILS',
  approx = false,
  className,
  amountClassName,
  symbolClassName,
}: CurrencyAmountProps) {
  const settings = useSettings();
  const privacyMode = settings?.privacyMode ?? false;

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedValue = typeof value === 'number' ? value.toLocaleString('en-US') : value;
  const isILS = currency === 'ILS' || currency === 'NIS';

  const blurCls = privacyMode
    ? 'blur-sm hover:blur-none transition-[filter] duration-200 cursor-pointer select-none'
    : '';

  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: 'isolate' }}
      className={cn('inline-flex items-baseline gap-1 whitespace-nowrap', blurCls, className)}
      title={privacyMode ? 'Hover to reveal' : undefined}
    >
      {approx && <span aria-hidden="true">≈</span>}
      <span className={cn(isILS && 'currency-ils-symbol', symbolClassName)}>{symbol}</span>
      <span className={cn('font-mono tabular-nums', amountClassName)}>{formattedValue}</span>
    </span>
  );
}
