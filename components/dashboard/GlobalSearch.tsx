import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/context/settings';

interface GlobalSearchProps {
  value: string;
  onChange: (v: string) => void;
}

export function GlobalSearch({ value, onChange }: GlobalSearchProps) {
  const { t, isRtl } = useLanguage();

  return (
    <div className="relative">
      <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className={`${isRtl ? 'pr-10' : 'pl-10'} bg-muted/30 border-border text-foreground placeholder:text-muted-foreground`}
      />
    </div>
  );
}
