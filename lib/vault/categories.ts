export const SUPPORTED_CATEGORIES = [
  { key: 'Identity',              he: 'זהות'              },
  { key: 'Money',                 he: 'כספים'             },
  { key: 'Bills & Receipts',      he: 'חשבונות וקבלות'   },
  { key: 'Insurance & Contracts', he: 'ביטוח וחוזים'     },
  { key: 'Trips & Tickets',       he: 'טיולים וכרטיסים'  },
] as const;

export type UiCategory = typeof SUPPORTED_CATEGORIES[number]['key'];

/** Return the localised label for a ui_category key, or the key itself as fallback. */
export function categoryLabel(key: string, lang: 'en' | 'he'): string {
  const cat = SUPPORTED_CATEGORIES.find(c => c.key === key);
  if (!cat) return key;
  return lang === 'he' ? cat.he : cat.key;
}
