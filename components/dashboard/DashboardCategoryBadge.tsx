import { CATEGORY_MAP } from '@/lib/vault/categoryMap';
import { useLanguage } from '@/lib/context/settings';

interface DashboardCategoryBadgeProps {
  category: string | null | undefined;
}

const colorMap: Record<string, string> = {
  'category-identity':  'bg-category-identity/15 text-category-identity border-category-identity/30',
  'category-money':     'bg-category-money/15 text-category-money border-category-money/30',
  'category-bills':     'bg-category-bills/15 text-category-bills border-category-bills/30',
  'category-insurance': 'bg-category-insurance/15 text-category-insurance border-category-insurance/30',
  'category-trips':     'bg-category-trips/15 text-category-trips border-category-trips/30',
};

export function DashboardCategoryBadge({ category }: DashboardCategoryBadgeProps) {
  const { lang } = useLanguage();
  if (!category) return null;

  const cat = CATEGORY_MAP[category];
  if (!cat) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-muted/50 text-muted-foreground border-border/50">
        {category}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[cat.color] || ''}`}
    >
      <span>{cat.emoji}</span>
      {lang === 'he' ? cat.he : cat.en}
    </span>
  );
}
