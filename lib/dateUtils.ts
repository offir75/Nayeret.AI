export function formatLocalizedDate(dateStr: string | null | undefined, lang: string = 'he'): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatHebrewDate(dateStr: string | null): string {
  return formatLocalizedDate(dateStr, 'he');
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyLevel(dateStr: string | null): 'urgent' | 'caution' | 'notice' | null {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days <= 0) return 'urgent';
  if (days <= 7) return 'caution';
  if (days <= 14) return 'notice';
  return null;
}
