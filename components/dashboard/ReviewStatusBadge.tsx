import { CheckCircle2, Search } from 'lucide-react';
import { useLanguage } from '@/lib/context/settings';

interface ReviewStatusBadgeProps {
  reviewed?: boolean;
}

export function ReviewStatusBadge({ reviewed }: ReviewStatusBadgeProps) {
  const { t } = useLanguage();

  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
        <CheckCircle2 className="w-3 h-3" />
        {t('reviewed')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">
      <Search className="w-3 h-3" />
      {t('needsReview')}
    </span>
  );
}

// Keep old export name for backwards compat during transition
export const ConfidenceIndicator = ReviewStatusBadge;
