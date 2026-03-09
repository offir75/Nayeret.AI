/**
 * categoryMap.ts — Bridge between nayeret.ai ui_category strings and
 * display metadata (label, color token, emoji) used by dashboard widgets.
 *
 * nayeret.ai has 5 canonical categories (from lib/vault/categories.ts).
 * Additional command-center categories are included for any legacy data.
 */

export interface CategoryMeta {
  he: string;
  en: string;
  /** Tailwind color token suffix (used via `text-category-*` / `bg-category-*`). */
  color: string;
  emoji: string;
}

export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  // ── nayeret.ai canonical 5 ──────────────────────────────────────────────────
  'Identity': {
    he: 'זהות',
    en: 'Identity',
    color: 'category-identity',
    emoji: '🪪',
  },
  'Money': {
    he: 'כספים',
    en: 'Money',
    color: 'category-money',
    emoji: '💰',
  },
  'Bills & Receipts': {
    he: 'חשבונות וקבלות',
    en: 'Bills & Receipts',
    color: 'category-bills',
    emoji: '🧾',
  },
  'Insurance & Contracts': {
    he: 'ביטוח וחוזים',
    en: 'Insurance & Contracts',
    color: 'category-insurance',
    emoji: '🛡️',
  },
  'Trips & Tickets': {
    he: 'טיולים וכרטיסים',
    en: 'Trips & Tickets',
    color: 'category-trips',
    emoji: '✈️',
  },

  // ── command-center legacy categories (mapped to nearest nayeret.ai tile) ───
  'Utilities': {
    he: 'שירותים',
    en: 'Utilities',
    color: 'category-bills',
    emoji: '⚡',
  },
  'Travel': {
    he: 'נסיעות',
    en: 'Travel',
    color: 'category-trips',
    emoji: '🗺️',
  },
  'Healthcare': {
    he: 'בריאות',
    en: 'Healthcare',
    color: 'category-insurance',
    emoji: '🏥',
  },
  'Professional Services': {
    he: 'שירותים מקצועיים',
    en: 'Professional Services',
    color: 'category-money',
    emoji: '💼',
  },
  'Office Supplies': {
    he: 'ציוד משרדי',
    en: 'Office Supplies',
    color: 'category-bills',
    emoji: '📎',
  },
  'Equipment': {
    he: 'ציוד',
    en: 'Equipment',
    color: 'category-bills',
    emoji: '🖥️',
  },
  'Transportation': {
    he: 'תחבורה',
    en: 'Transportation',
    color: 'category-trips',
    emoji: '🚗',
  },
  'Marketing': {
    he: 'שיווק',
    en: 'Marketing',
    color: 'category-money',
    emoji: '📣',
  },
  'Education': {
    he: 'חינוך והשתלמות',
    en: 'Education',
    color: 'category-identity',
    emoji: '📚',
  },
  'Meals & Entertainment': {
    he: 'אוכל ואירוח',
    en: 'Meals & Entertainment',
    color: 'category-bills',
    emoji: '🍽️',
  },
};

/** Get category metadata with a sensible fallback for unknown categories. */
export function getCategoryMeta(category: string | null | undefined): CategoryMeta {
  if (!category) {
    return { he: 'אחר', en: 'Other', color: 'category-identity', emoji: '📄' };
  }
  return (
    CATEGORY_MAP[category] ?? { he: category, en: category, color: 'category-identity', emoji: '📄' }
  );
}

/** Safely convert an amount value to a number, handling legacy `{ value: n }` objects. */
export function getNumericAmount(amount: unknown): number | null {
  if (typeof amount === 'number' && Number.isFinite(amount)) return amount;
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  // Legacy object shape
  if (typeof amount === 'object' && amount !== null) {
    const obj = amount as Record<string, unknown>;
    if (typeof obj.value === 'number') return obj.value;
  }
  return null;
}
