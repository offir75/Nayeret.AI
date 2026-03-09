/**
 * docAdapter.ts — Bridges VaultDoc (Supabase shape) and RichDoc (dashboard shape).
 *
 * Dashboard components (ported from command-center) expect flat, typed fields
 * directly on the doc object. VaultDoc stores these inside the JSONB columns
 * `raw_analysis` and `insights`. This adapter extracts and derives those fields
 * without modifying the original VaultDoc.
 */

import type { VaultDoc } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'neutral';

/**
 * RichDoc = VaultDoc + all the derived/extracted fields that dashboard widgets
 * reference directly (amount, due_date, provider, etc.).
 */
export interface RichDoc extends VaultDoc {
  // Extracted from raw_analysis
  amount: number | null;
  currency: string;
  due_date: string | null;
  issue_date: string | null;
  next_reminder_date: string | null;
  provider: string;

  // Derived
  reviewed: boolean;
  tax_tagged: boolean;
  transaction_type: TransactionType;
  confidence_score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ra(doc: VaultDoc): Record<string, unknown> {
  return (doc.raw_analysis ?? {}) as Record<string, unknown>;
}

function ins(doc: VaultDoc): Record<string, unknown> {
  return (doc.insights ?? {}) as Record<string, unknown>;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === '1' || val === 'true') return true;
  }
  return false;
}

/**
 * Derive income/expense/neutral from document_type string.
 * Checks the raw type name using keyword matching.
 */
function deriveTransactionType(doc: VaultDoc): TransactionType {
  const type = (doc.document_type ?? '').toLowerCase();
  const analysis = ra(doc);
  const txType = pickString(analysis, 'transaction_type');
  if (txType === 'income' || txType === 'expense' || txType === 'neutral') {
    return txType as TransactionType;
  }

  // Legacy type-based mapping
  if (type === 'bill' || type === 'receipt' || type === 'claim' || type === 'insurance') {
    return 'expense';
  }
  if (type === 'identification' || type === 'other') {
    return 'neutral';
  }

  // Keyword matching for richer document type names (e.g. "Salary Slip")
  const incomeKeywords = ['salary', 'income', 'dividend', 'payment received', 'invoice issued'];
  const expenseKeywords = ['bill', 'invoice', 'charge', 'expense', 'receipt', 'fee', 'insurance', 'premium', 'subscription', 'claim'];

  for (const kw of incomeKeywords) {
    if (type.includes(kw)) return 'income';
  }
  for (const kw of expenseKeywords) {
    if (type.includes(kw)) return 'expense';
  }
  return 'neutral';
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * Enrich a single VaultDoc with derived fields required by dashboard widgets.
 * The original VaultDoc fields are preserved unchanged.
 */
export function enrichDoc(doc: VaultDoc): RichDoc {
  const analysis = ra(doc);
  const insights = ins(doc);

  const amount = pickNumber(
    analysis,
    'total_amount', 'total_balance', 'premium_amount', 'invoice_amount',
    'net_amount', 'gross_amount', 'amount',
  );

  const currency =
    pickString(analysis, 'currency') ??
    pickString(insights, 'currency') ??
    'ILS';

  const due_date = pickString(analysis, 'due_date', 'next_payment_date', 'payment_due_date');

  const issue_date = pickString(analysis, 'issue_date', 'invoice_date', 'statement_date', 'date');

  const next_reminder_date = pickString(
    analysis,
    'expiry_date', 'due_date', 'next_renewal_date', 'next_payment_date',
  );

  const provider =
    pickString(analysis, 'issuer', 'provider', 'company_name', 'bank_name', 'institution') ??
    pickString(insights, 'provider') ??
    '';

  const reviewed = doc.raw_analysis !== null;

  const tax_tagged = pickBool(insights, 'tax_tagged') || pickBool(analysis, 'tax_tagged');

  const transaction_type = deriveTransactionType(doc);

  const confidence_score =
    pickNumber(analysis, 'confidence') ??
    pickNumber(insights, 'confidence') ??
    0;

  return {
    ...doc,
    amount,
    currency,
    due_date,
    issue_date,
    next_reminder_date,
    provider,
    reviewed,
    tax_tagged,
    transaction_type,
    confidence_score,
  };
}

/**
 * Enrich an array of VaultDocs. Use this as the primary consumer API
 * anywhere the dashboard needs a list of docs.
 */
export function enrichDocs(docs: VaultDoc[]): RichDoc[] {
  return docs.map(enrichDoc);
}
