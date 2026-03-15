/**
 * Shared configuration constants for the AI classification + extraction pipeline.
 * Centralised here to avoid magic numbers scattered across analyze.ts and ai.ts.
 */

// ── Gemini call limits ──────────────────────────────────────────────────────
export const GEMINI_TIMEOUT_MS = 25_000;
export const GEMINI_MAX_RETRIES = 2;

// ── Classifier scoring weights (must sum to MAX_RAW_SCORE) ─────────────────
export const SCORE_WEIGHTS = {
  title_match:        6,
  vendor_match:       5,
  ocr_pattern_match:  4,
  keyword_match:      3,
  layout_hint_match:  2,
  language_hint_match: 1,
} as const;

/** Maximum achievable raw score (sum of all SCORE_WEIGHTS). */
export const MAX_RAW_SCORE = Object.values(SCORE_WEIGHTS).reduce((s, v) => s + v, 0); // 21

/** Header-region boost applied on top of base scores. */
export const HEADER_BOOST = 2;

/** Per-type negative penalty for bill/invoice with no monetary amount in text. */
export const BILL_NO_AMOUNT_PENALTY = -3;

// ── Confidence thresholds ───────────────────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
  high:   0.85,
  medium: 0.65,
  low:    0.45,
} as const;

// ── Candidate selection ─────────────────────────────────────────────────────
/** Maximum number of candidates passed to Gemini when confidence is medium/low. */
export const CLASSIFIER_TOP_N = 15;

// ── Text slice sizes sent to Gemini ────────────────────────────────────────
export const TEXT_SLICE = {
  /** Scoring (local, no Gemini). */
  score:    5_000,
  /** Triage (is-document) prompt. */
  triage:   2_000,
  /** Non-doc one-liner description. */
  oneliner: 1_000,
  /** Classification against type candidates. */
  classify: 5_000,
  /** Structured extraction. */
  extract:  6_000,
  /** Auto-discovery. */
  discover: 5_000,
  /** Summarization. */
  summary:  8_000,
} as const;

// ── Document reminders ──────────────────────────────────────────────────────
export const REMINDER_OFFSETS_DAYS = [30, 14, 7] as const;

// ── Amount normalization ────────────────────────────────────────────────────
/** Field names checked, in priority order, when promoting a value to `amount`. */
export const AMOUNT_PRIORITY_FIELDS = [
  'total_amount',
  'total_balance',
  'premium_amount',
  'payment_amount',
  'amount_due',
  'total_amount_due',
  'net_amount',
  'gross_pay',
  'net_pay',
  'ending_balance',
] as const;

/** Substrings that, when present in a numeric field name, mark it as an amount candidate. */
export const AMOUNT_KEYWORDS = ['total', 'balance', 'sum', 'due'] as const;
