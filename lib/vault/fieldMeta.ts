import type { DocumentType } from '@/lib/types';

export const DOC_TYPES: DocumentType[] = [
  'bill', 'receipt', 'financial_report', 'claim', 'insurance', 'identification', 'other',
];

/** Fast membership check for legacy enum values. */
export const LEGACY_DOC_TYPE_SET = new Set<string>(DOC_TYPES);

export const DOC_TYPE_LABELS: Record<DocumentType, { en: string; he: string }> = {
  bill:             { en: 'Bill',             he: 'חשבון'        },
  receipt:          { en: 'Receipt',          he: 'קבלה'         },
  financial_report: { en: 'Financial Report', he: 'דו"ח פיננסי'  },
  claim:            { en: 'Insurance Claim',  he: 'תביעת ביטוח'  },
  insurance:        { en: 'Insurance Policy', he: 'פוליסת ביטוח' },
  identification:   { en: 'ID Document',      he: 'מסמך זיהוי'   },
  other:            { en: 'Other',            he: 'אחר'          },
};

// Key fields shown as editable inputs per document type
export const EDITABLE_FIELDS: Record<string, string[]> = {
  // Legacy enum types
  bill:             ['provider',    'total_amount',  'currency', 'due_date'      ],
  receipt:          ['merchant',    'total_amount',  'currency', 'purchase_date' ],
  financial_report: ['institution', 'total_balance', 'currency', 'liquidity_date'],
  claim:            ['insurer',     'total_amount',  'currency', 'claim_date'    ],
  insurance:        ['insurer',     'policy_number', 'premium_amount', 'expiry_date'],
  identification:   ['full_name',   'id_number',     'expiry_date'               ],
  other:            ['provider',    'total_amount',  'currency'                  ],
  // Common free-form taxonomy types (lowercase for case-insensitive lookup)
  passport:         ['full_name',   'id_number',     'expiry_date'               ],
  invoice:                    ['provider',    'total_amount',  'currency',  'due_date',  'reference_number'],
  'saas subscription invoice': ['provider',   'total_amount',  'currency',  'due_date',  'reference_number'],
  'pay stub':       ['institution', 'total_amount',  'currency',  'purchase_date'],
  'bank statement': ['institution', 'total_balance', 'currency',  'liquidity_date'],
  contract:         ['provider',    'expiry_date'                                ],
  warranty:         ['provider',    'expiry_date'                                ],
};

/** Translations for free-form taxonomy type names (keyed lowercase). */
export const TAXONOMY_TYPE_LABELS: Record<string, { en: string; he: string }> = {
  passport:           { en: 'Passport',          he: 'דרכון'          },
  invoice:                    { en: 'Invoice',            he: 'קבלה'           },
  'saas subscription invoice': { en: 'Invoice',            he: 'קבלה'           },
  'pay stub':         { en: 'Pay Stub',           he: 'תלוש שכר'       },
  'bank statement':   { en: 'Bank Statement',     he: 'דף חשבון בנק'  },
  contract:           { en: 'Contract',           he: 'חוזה'           },
  'lease agreement':  { en: 'Lease Agreement',    he: 'חוזה שכירות'    },
  warranty:           { en: 'Warranty',           he: 'אחריות'         },
  'medical record':   { en: 'Medical Record',     he: 'רשומה רפואית'   },
  'driver\'s license': { en: "Driver's License",  he: 'רישיון נהיגה'   },
  'id card':          { en: 'ID Card',            he: 'תעודת זהות'     },
  'property tax':     { en: 'Property Tax',       he: 'ארנונה'         },
};

/**
 * Broad English→Hebrew fallback for common document type names that may be
 * auto-discovered and stored as free-form strings.
 */
const COMMON_TYPE_HE: Record<string, string> = {
  'hotel reservation':     'הזמנת מלון',
  'hotel booking':         'הזמנת מלון',
  'flight booking':        'הזמנת טיסה',
  'flight ticket':         'כרטיס טיסה',
  'travel booking':        'הזמנת נסיעה',
  'car rental':            'השכרת רכב',
  'utility bill':          'חשבון שירות',
  'electricity bill':      'חשבון חשמל',
  'water bill':            'חשבון מים',
  'internet bill':         'חשבון אינטרנט',
  'phone bill':            'חשבון טלפון',
  'mobile bill':           'חשבון סלולרי',
  'gym membership':        'מנוי לחדר כושר',
  'subscription invoice':  'חשבון מנוי',
  'property tax':          'ארנונה',
  'municipal tax':         'ארנונה',
  'medical bill':          'חשבון רפואי',
  'hospital bill':         'חשבון בית חולים',
  'prescription':          'מרשם רפואי',
  'lab results':           'תוצאות בדיקה',
  'work permit':           'היתר עבודה',
  'rental agreement':      'חוזה שכירות',
  'employment contract':   'חוזה עבודה',
  'salary slip':           'תלוש שכר',
  'credit card statement': 'דף חשבון כרטיס אשראי',
  'mortgage statement':    'דף חשבון משכנתא',
  'pension statement':     'דף חשבון פנסיה',
  'investment report':     'דוח השקעות',
  'tax return':            'החזר מס',
  'tax assessment':        'שומת מס',
  'vat invoice':           'חשבונית מע"מ',
};

/** Get the localized label for any document type (legacy enum or free-form taxonomy). */
export function getTypeLabel(type: string, lang: 'en' | 'he', hebrewOverride?: string | null): string {
  // Exact match in legacy set
  if (LEGACY_DOC_TYPE_SET.has(type)) {
    return DOC_TYPE_LABELS[type as DocumentType][lang];
  }
  // Case-insensitive match against legacy types (e.g. "Receipt" → "receipt")
  const lower = type.toLowerCase();
  const legacyMatch = DOC_TYPES.find(t => t === lower);
  if (legacyMatch) return DOC_TYPE_LABELS[legacyMatch][lang];
  // Hebrew: prefer persisted override → TAXONOMY_TYPE_LABELS → COMMON_TYPE_HE → raw name
  if (lang === 'he') {
    if (hebrewOverride) return hebrewOverride;
    const entry = TAXONOMY_TYPE_LABELS[lower];
    if (entry) return entry.he;
    return COMMON_TYPE_HE[lower] ?? type;
  }
  // English: check taxonomy labels, otherwise return raw
  const entry = TAXONOMY_TYPE_LABELS[lower];
  return entry ? entry.en : type;
}

/** Get editable field keys for a type, with case-insensitive fallback. */
export function getEditableFields(type: string): string[] {
  return EDITABLE_FIELDS[type] ?? EDITABLE_FIELDS[type.toLowerCase()] ?? [];
}

export type FieldType = 'text' | 'number' | 'date' | 'currency';

export const FIELD_META: Record<string, { en: string; he: string; type: FieldType }> = {
  provider:         { en: 'Provider',       he: 'ספק',            type: 'text'     },
  total_amount:     { en: 'Amount',         he: 'סכום',           type: 'number'   },
  currency:         { en: 'Currency',       he: 'מטבע',           type: 'currency' },
  due_date:         { en: 'Due Date',       he: 'תאריך פירעון',   type: 'date'     },
  merchant:         { en: 'Merchant',       he: 'בית עסק',        type: 'text'     },
  purchase_date:    { en: 'Purchase Date',  he: 'תאריך רכישה',    type: 'date'     },
  institution:      { en: 'Institution',    he: 'מוסד',           type: 'text'     },
  total_balance:    { en: 'Balance',        he: 'יתרה',           type: 'number'   },
  liquidity_date:   { en: 'Liquidity Date', he: 'תאריך נזילות',   type: 'date'     },
  insurer:          { en: 'Insurer',        he: 'מבטח',           type: 'text'     },
  claim_date:       { en: 'Claim Date',     he: 'תאריך תביעה',    type: 'date'     },
  policy_number:    { en: 'Policy Number',  he: 'מספר פוליסה',    type: 'text'     },
  premium_amount:   { en: 'Premium',        he: 'פרמיה',          type: 'number'   },
  expiry_date:      { en: 'Expiry Date',    he: 'תאריך תפוגה',    type: 'date'     },
  full_name:        { en: 'Full Name',      he: 'שם מלא',         type: 'text'     },
  id_number:        { en: 'ID Number',      he: 'מספר ת.ז.',      type: 'text'     },
  reference_number: { en: 'Reference No.',  he: 'מספר אסמכתא',    type: 'text'     },
};

/**
 * Maps AI-returned field key variants to canonical FIELD_META keys.
 * Prevents duplicate fields when the AI uses different naming conventions.
 */
export const FIELD_ALIASES: Record<string, string> = {
  issuer:         'provider',
  vendor:         'provider',
  company:        'provider',
  employer:       'provider',
  employer_name:  'provider',
  amount:         'total_amount',
  total:          'total_amount',
  document_date:  'due_date',
  date_of_issue:  'due_date',
  invoice_date:   'due_date',
  issue_date:     'due_date',
  invoice_number: 'reference_number',
  doc_number:     'reference_number',
  currency_code:  'currency',
};

const SYMBOL_TO_CURRENCY: Record<string, string> = { '$': 'USD', '₪': 'ILS', '€': 'EUR', '£': 'GBP' };

/** Normalize AI-returned keys to canonical FIELD_META keys, deduplicating. */
export function normalizeSource(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = FIELD_ALIASES[k] ?? k;
    // Canonical value wins; only overwrite if not yet set or currently null/empty
    if (!(canonical in out) || out[canonical] == null || out[canonical] === '') {
      out[canonical] = v;
    }
  }
  // Infer currency from an embedded symbol in the amount string (e.g. "$20.00" → USD)
  if (!out.currency || out.currency === '') {
    const amountKeys = ['total_amount', 'total_balance', 'premium_amount'] as const;
    for (const amtKey of amountKeys) {
      if (out[amtKey] == null) continue;
      const amtStr = String(out[amtKey]);
      const sym = amtStr.match(/^([₪$€£])/)?.[1] ?? amtStr.match(/([₪$€£])$/)?.[1];
      if (sym && SYMBOL_TO_CURRENCY[sym]) {
        out.currency = SYMBOL_TO_CURRENCY[sym];
        out[amtKey] = amtStr.replace(/[₪$€£,\s]/g, '');
        break;
      }
    }
  }
  return out;
}

/** Initialize a drafts map, preferring insights over raw_analysis. Includes all keys. */
export function initDrafts(
  rawAnalysis: Record<string, unknown> | null,
  insights?: Record<string, unknown> | null,
): Record<string, string> {
  const raw = (insights && Object.keys(insights).length > 0 ? insights : rawAnalysis) ?? {};
  const source = normalizeSource(raw);
  const result: Record<string, string> = {};
  const SKIP = new Set(['is_media', 'document_type_name']);
  Object.keys(FIELD_META).forEach(key => {
    result[key] = source[key] != null ? String(source[key]) : '';
  });
  Object.keys(source).forEach(key => {
    if (!(key in result) && !SKIP.has(key)) {
      result[key] = source[key] != null ? String(source[key]) : '';
    }
  });
  return result;
}

const SKIP_KEYS = new Set(['is_media', 'document_type_name']);

/** Return the non-empty, non-meta field keys present in insights. */
export function getInsightFields(insights: Record<string, unknown> | null | undefined): string[] {
  if (!insights) return [];
  return Object.keys(insights).filter(k => !SKIP_KEYS.has(k) && insights[k] != null && insights[k] !== '');
}

/** Convert a snake_case key to a human-readable Title Case label. */
export function labelFromKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
