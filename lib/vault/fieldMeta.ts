import type { DocumentType } from '@/lib/types';

export const DOC_TYPES: DocumentType[] = [
  'bill', 'receipt', 'financial_report', 'claim', 'insurance', 'identification', 'other',
];

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
export const EDITABLE_FIELDS: Record<DocumentType, string[]> = {
  bill:             ['provider',    'total_amount',  'currency', 'due_date'      ],
  receipt:          ['merchant',    'total_amount',  'currency', 'purchase_date' ],
  financial_report: ['institution', 'total_balance', 'currency', 'liquidity_date'],
  claim:            ['insurer',     'total_amount',  'currency', 'claim_date'    ],
  insurance:        ['insurer',     'policy_number', 'premium_amount', 'expiry_date'],
  identification:   ['full_name',   'id_number',     'expiry_date'               ],
  other:            ['provider',    'total_amount',  'currency'                  ],
};

export type FieldType = 'text' | 'number' | 'date' | 'currency';

export const FIELD_META: Record<string, { en: string; he: string; type: FieldType }> = {
  provider:       { en: 'Provider',       he: 'ספק',            type: 'text'     },
  total_amount:   { en: 'Amount',         he: 'סכום',           type: 'number'   },
  currency:       { en: 'Currency',       he: 'מטבע',           type: 'currency' },
  due_date:       { en: 'Due Date',       he: 'תאריך פירעון',   type: 'date'     },
  merchant:       { en: 'Merchant',       he: 'בית עסק',        type: 'text'     },
  purchase_date:  { en: 'Purchase Date',  he: 'תאריך רכישה',    type: 'date'     },
  institution:    { en: 'Institution',    he: 'מוסד',           type: 'text'     },
  total_balance:  { en: 'Balance',        he: 'יתרה',           type: 'number'   },
  liquidity_date: { en: 'Liquidity Date', he: 'תאריך נזילות',   type: 'date'     },
  insurer:        { en: 'Insurer',        he: 'מבטח',           type: 'text'     },
  claim_date:     { en: 'Claim Date',     he: 'תאריך תביעה',    type: 'date'     },
  policy_number:  { en: 'Policy Number',  he: 'מספר פוליסה',    type: 'text'     },
  premium_amount: { en: 'Premium',        he: 'פרמיה',          type: 'number'   },
  expiry_date:    { en: 'Expiry Date',    he: 'תאריך תפוגה',    type: 'date'     },
  full_name:      { en: 'Full Name',      he: 'שם מלא',         type: 'text'     },
  id_number:      { en: 'ID Number',      he: 'מספר ת.ז.',      type: 'text'     },
};

/** Initialize a drafts map from a doc's raw_analysis (all known keys). */
export function initDrafts(rawAnalysis: Record<string, unknown> | null): Record<string, string> {
  const ra = rawAnalysis ?? {};
  const result: Record<string, string> = {};
  Object.keys(FIELD_META).forEach(key => {
    result[key] = ra[key] != null ? String(ra[key]) : '';
  });
  return result;
}
