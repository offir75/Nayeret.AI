import { supabaseAdmin } from '@/supabase/client';
import type { UICategory } from '@/nayeret_ai_schema_registry';
import { parseBilingualJson } from '@/lib/utils/parse';
import {
  SCORE_WEIGHTS as CONFIG_SCORE_WEIGHTS,
  MAX_RAW_SCORE as CONFIG_MAX_RAW_SCORE,
  CONFIDENCE_THRESHOLDS as CONFIG_CONFIDENCE_THRESHOLDS,
  HEADER_BOOST,
  BILL_NO_AMOUNT_PENALTY,
  TEXT_SLICE,
} from '@/lib/config/pipeline';
import {
  IMAGE_EXTENSIONS, MIME_MAP, getExt,
  callGemini, ocrImage, ocrPdfFallback, describeImage,
} from '@/lib/services/gemini-client';

// Re-export file-type helpers for backward compatibility with analyze.ts
export { IMAGE_EXTENSIONS, MIME_MAP, getExt, callGemini, ocrImage, ocrPdfFallback, describeImage };
export async function summarizeDocument(text: string): Promise<{ he: string; en: string }> {
  try {
    const raw = await callGemini(
      `Summarize this document in a maximum of 25 words per language.\n` +
      `Focus on: the entity/provider name, the PRIMARY total amount (the grand total for the period, not secondary sub-totals or outstanding installments), and any urgent payment due.\n` +
      `Return a JSON object with exactly two keys:\n` +
      `  "he": the summary in Hebrew (max 25 words)\n` +
      `  "en": the summary in English (max 25 words)\n\n` +
      `Return only the JSON object, no other text.\n\nDocument:\n${text.slice(0, 8000)}`,
      true
    );
    return parseBilingualJson(raw);
  } catch (err) {
    console.warn('[summarizeDocument] Gemini call failed:', String(err));
    return { he: '', en: '' };
  }
}

// ── Classification Scoring Engine ──────────────────────────────────────────────

export interface ClassificationResult {
  typeName: string;
  confidence: number; // 0–1
  confidenceLevel: 'high' | 'medium' | 'low' | 'unclassified';
  scores: Record<string, number>; // raw score per type (for debugging)
}

const SCORE_WEIGHTS = CONFIG_SCORE_WEIGHTS;
const MAX_RAW_SCORE = CONFIG_MAX_RAW_SCORE;
const CONFIDENCE_THRESHOLDS = CONFIG_CONFIDENCE_THRESHOLDS;

function scoreType(
  textSlice: string,
  textLower: string,
  hasHebrew: boolean,
  type: DocumentTypeRow,
): number {
  const s = (type.semantic_signals ?? {}) as SemanticSignals;
  let score = 0;

  // title_match (6): type name appears verbatim in the document
  if (textLower.includes(type.name.toLowerCase())) score += SCORE_WEIGHTS.title_match;

  // vendor_match (5): any known vendor example appears in the text
  const vendors = s.vendor_examples ?? [];
  if (vendors.some(v => textLower.includes(v.toLowerCase()))) score += SCORE_WEIGHTS.vendor_match;

  // ocr_pattern_match (4): any OCR regex pattern matches
  const patterns = s.ocr_patterns ?? [];
  if (patterns.some(p => { try { return new RegExp(p, 'i').test(textSlice); } catch { return false; } })) {
    score += SCORE_WEIGHTS.ocr_pattern_match;
  }

  // keyword_match (3): any he or en keyword appears
  const keywords = [...(s.keywords_he ?? []), ...(s.keywords_en ?? [])];
  if (keywords.some(k => textLower.includes(k.toLowerCase()))) score += SCORE_WEIGHTS.keyword_match;

  // layout_hint_match (2): any layout hint appears in text
  const hints = s.layout_hints ?? [];
  if (hints.some(h => textLower.includes(h.toLowerCase()))) score += SCORE_WEIGHTS.layout_hint_match;

  // language_hint_match (1): document language aligns with the type's keyword language set
  if (hasHebrew ? (s.keywords_he?.length ?? 0) > 0 : (s.keywords_en?.length ?? 0) > 0) {
    score += SCORE_WEIGHTS.language_hint_match;
  }

  // header_boost: any keyword or vendor appears in the first 200 chars (title / header region)
  // This strongly favours the correct type when the document title is clear.
  const headerLower = textSlice.slice(0, 200).toLowerCase();
  if (
    keywords.some(k => headerLower.includes(k.toLowerCase())) ||
    vendors.some(v => headerLower.includes(v.toLowerCase()))
  ) {
    score += HEADER_BOOST;
  }

  // per-type negative: bill/invoice type but no monetary amount detected
  if (/bill|invoice|חשבונית/i.test(type.name) && !/\d[\d,. ]*/.test(textSlice)) score += BILL_NO_AMOUNT_PENALTY;

  return score;
}

/**
 * Score-based document classifier.
 * Fetches all active types from the DB (including semantic_signals) then scores
 * the document text against every type using weights from nayeret_classification_rules_v1.json:
 *   title=6, vendor=5, ocr_pattern=4, keyword=3, layout=2, language=1  (max=21)
 *
 * Pass pre-fetched `types` to skip the DB round-trip when types are already in memory.
 */
export async function classifyDocument(
  text: string,
  types?: DocumentTypeRow[],
): Promise<ClassificationResult> {
  let activeTypes = Array.isArray(types) ? types : undefined;

  if (!activeTypes) {
    try {
      const { data, error } = await supabaseAdmin
        .from('document_types')
        .select('name, matching_description, display_name_he, schema_definition, semantic_signals')
        .eq('is_active', true);
      if (error) console.warn('[classifyDocument] DB fetch error:', error.message);
      activeTypes = (data ?? []) as DocumentTypeRow[];
    } catch (err) {
      console.warn('[classifyDocument] Unexpected DB error:', String(err));
      activeTypes = [];
    }
  }

  if (activeTypes.length === 0) {
    return { typeName: 'Other', confidence: 0, confidenceLevel: 'unclassified', scores: {} };
  }

  const textSlice = text.slice(0, TEXT_SLICE.score);
  const textLower = textSlice.toLowerCase();
  const hasHebrew  = /[\u0590-\u05FF]/.test(textSlice);

  // Global negative signals (reduce every type's score equally)
  let globalPenalty = 0;
  if (/unsubscribe|click here|view in browser|promotional offer/i.test(textSlice)) globalPenalty -= 6;
  if (/newsletter|weekly digest|monthly digest/i.test(textSlice))                  globalPenalty -= 5;

  const scores: Record<string, number> = {};
  for (const type of activeTypes) {
    scores[type.name] = Math.max(0, scoreType(textSlice, textLower, hasHebrew, type) + globalPenalty);
  }

  const sortedEntries = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (sortedEntries.length === 0) {
    return { typeName: 'Other', confidence: 0, confidenceLevel: 'unclassified', scores };
  }
  const [bestName, bestRaw] = sortedEntries[0];
  const confidence = Math.min(bestRaw / MAX_RAW_SCORE, 1);

  let confidenceLevel: ClassificationResult['confidenceLevel'];
  if      (confidence >= CONFIDENCE_THRESHOLDS.high)   confidenceLevel = 'high';
  else if (confidence >= CONFIDENCE_THRESHOLDS.medium) confidenceLevel = 'medium';
  else if (confidence >= CONFIDENCE_THRESHOLDS.low)    confidenceLevel = 'low';
  else                                                  confidenceLevel = 'unclassified';

  return {
    typeName: confidenceLevel === 'unclassified' ? 'Other' : bestName,
    confidence,
    confidenceLevel,
    scores,
  };
}

// ── Two-Pass DB-driven extraction ─────────────────────────────────────────────

export interface ExtractionField {
  description: string;
  data_type: 'string' | 'date' | 'currency_amount';
  required?: boolean;
}

export interface SemanticSignals {
  keywords_he?: string[];
  keywords_en?: string[];
  layout_hints?: string[];
  vendor_examples?: string[];
  ocr_patterns?: string[];
}

export interface DocumentTypeRow {
  name: string;
  matching_description: string | null;
  display_name_he?: string | null;
  ui_category?: UICategory | null;
  semantic_signals?: SemanticSignals | null;
  schema_definition: {
    fields?: string[];
    extraction_schema?: Record<string, ExtractionField>;
  } & Record<string, unknown>;
}

/**
 * Phase 1 — classify the document against the active types fetched from DB.
 * Sends only the first ~3 000 chars (≈ 2 pages) to keep latency low.
 * Returns the matched `name` from the DB row, or "Other".
 */
export async function classifyAgainstTypes(
  text: string,
  types: DocumentTypeRow[],
): Promise<string> {
  if (!Array.isArray(types) || types.length === 0) return 'Other';

  const list = types
    .map(t => `• "${t.name}"${t.matching_description ? ` — ${t.matching_description}` : ''}`)
    .join('\n');

  let result = '';
  try {
    result = await callGemini(
    `You are a document classifier. Choose the single best type for the document below.\n\n` +
    `Available types:\n${list}\n• "Other" — use only if none of the above fit\n\n` +
    `Classification rules:\n` +
    `- A single invoice or bill for a specific billing period (e.g. a toll road charge, utility bill, or subscription invoice — even if it shows a running total) is a BILL or RECEIPT, NOT a Financial Report.\n` +
    `- A Financial Report covers multiple periods, summarises an account history, or is an annual/periodic account statement.\n` +
    `- Hebrew documents containing "חשבונית" (invoice) or "לתשלום" (for payment) are typically bills or receipts.\n\n` +
    `Reply with ONLY the exact type name as listed above, nothing else.\n\n` +
    `Document (first portion):\n${text.slice(0, 3000)}`
    );
  } catch (err) {
    console.warn('[classifyAgainstTypes] Gemini classification failed:', String(err));
    return 'Other';
  }

  const cleaned = result.trim().replace(/^["'•\-\s]+|["'\s]+$/g, '');
  // 1. Exact case-insensitive match
  const exact = types.find(t => t.name.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact.name;
  // 2. Substring match — Gemini sometimes adds context in parentheses
  const sub = types.find(t =>
    cleaned.toLowerCase().includes(t.name.toLowerCase()) ||
    t.name.toLowerCase().includes(cleaned.toLowerCase())
  );
  return sub ? sub.name : 'Other';
}

// -- Prompt-Pack Template Selection ------------------------------------------

interface PromptPackTemplate {
  template_id: string;
  target_taxonomies: string[];
  system_prompt: string;
  extraction_instructions: string[];
  hallucination_guards: string[];
  output_contract: { top_level_fields: Record<string, string> };
}

let _promptPackTemplates: PromptPackTemplate[] | null = null;

function getPromptPackTemplates(): PromptPackTemplate[] {
  if (_promptPackTemplates) return _promptPackTemplates;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pack = require('../../nayeret_llm_extraction_prompt_pack_v1.json') as { templates: PromptPackTemplate[] };
    _promptPackTemplates = pack.templates;
  } catch {
    console.warn('[extractStructured] Could not load prompt pack, using generic fallback');
    _promptPackTemplates = [];
  }
  return _promptPackTemplates;
}

function resolveTemplate(typeName?: string): PromptPackTemplate | undefined {
  const templates = getPromptPackTemplates();
  if (typeName) {
    // 1. Exact case-insensitive taxonomy match
    const exact = templates.find(t =>
      t.target_taxonomies.some(tx => tx.toLowerCase() === typeName.toLowerCase())
    );
    if (exact) return exact;

    // 2. Partial match: any meaningful word in typeName appears in a target taxonomy
    //    Handles variants like "Internet Bill" → utility_bill_extractor.
    const words = typeName.toLowerCase().split(/[\s/\-_]+/).filter(w => w.length > 3);
    if (words.length > 0) {
      const partial = templates.find(t =>
        t.target_taxonomies.some(tx => {
          const txLower = tx.toLowerCase();
          return words.some(w => txLower.includes(w));
        })
      );
      if (partial) {
        console.log(`[resolveTemplate] Partial match: ${typeName} → ${partial.template_id}`);
        return partial;
      }
    }

    // 3. Group/category fallback using regex on typeName
    const tn = typeName.toLowerCase();
    const groupFallbackId =
      /hotel|flight|travel|reservation|ticket|cruise|train|bus|ferry|boarding|rental|itinerary/.test(tn)
        ? 'travel_reservation_extractor'
      : /insurance|policy|coverage|claim|reimbursement/.test(tn)
        ? 'insurance_policy_extractor'
      : /receipt|purchase|order|retail|restaurant|pharmacy|supermarket/.test(tn)
        ? 'generic_receipt_extractor'
      : /bill|invoice|utility|electricity|water|gas|telecom|cable/.test(tn)
        ? 'utility_bill_extractor'
      : /bank|statement|account|savings/.test(tn)
        ? 'bank_statement_extractor'
      : /pension|investment|fund|stock|dividend|loan|mortgage/.test(tn)
        ? 'investment_extractor'
      : /medical|prescription|lab|hospital|dental|vaccination/.test(tn)
        ? 'medical_record_extractor'
      : /passport|national.id|driver.licen|identification/.test(tn)
        ? 'passport_extractor'
      : null;
    if (groupFallbackId) {
      const groupTpl = templates.find(t => t.template_id === groupFallbackId);
      if (groupTpl) {
        console.log(`[resolveTemplate] Group fallback: ${typeName} → ${groupFallbackId}`);
        return groupTpl;
      }
    }
  }
  return templates.find(t => t.template_id === 'generic_document_fallback');
}

/** Enrich description with format hints */
function fieldHint(field: ExtractionField): string {
  let desc = field.description || '';
  if (field.data_type === 'date') desc += ' (format: YYYY-MM-DD)';
  if (field.data_type === 'currency_amount') desc += ' (plain number, no currency symbol or commas)';
  return desc;
}

/**
 * Phase 2 -- extract structured fields using the prompt-pack template for the matched taxonomy.
 * Selects the template whose target_taxonomies includes typeName; falls back to
 * generic_document_fallback when no specific template exists.
 *
 * Output contract (enforced in prompt):
 *   extracted_fields  -- field-name => value (null when absent)
 *   field_evidence    -- field-name => verbatim OCR snippet
 *   warnings          -- array of uncertainty / OCR issue strings
 *
 * Groundedness rule: only extract values explicitly present in the document.
 */
export async function extractStructured(
  text: string,
  schema: Record<string, ExtractionField> | string[],
  typeName?: string,
): Promise<Record<string, unknown>> {
  // Normalise: convert legacy string[] to minimal ExtractionField objects
  const normalised: Record<string, ExtractionField> = Array.isArray(schema)
    ? Object.fromEntries(schema.map(f => [f, { description: f, data_type: 'string' as const }]))
    : schema;

  const entries = Object.entries(normalised);
  const tpl = resolveTemplate(typeName);
  // Skip only when there is nothing to work with: no schema fields AND no prompt-pack template.
  if (entries.length === 0 && !tpl) return {};

  const fieldList = entries.map(([key, field]) => `- ${key}: ${fieldHint(field)}`).join('\n');

  const systemPrompt = tpl?.system_prompt ??
    'You are a document extraction engine. Extract structured metadata from the document below.';
  const instructions = tpl
    ? tpl.extraction_instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '1. Extract all listed fields from the document.';
  const guards = tpl
    ? tpl.hallucination_guards.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '1. Only extract values explicitly present in the document or OCR text. Do not infer missing data.\n2. Return null for missing fields.';

  const prompt =
    `${systemPrompt}\n\n` +
    `GROUNDEDNESS RULES:\n${guards}\n\n` +
    `EXTRACTION INSTRUCTIONS:\n${instructions}\n\n` +
    (entries.length > 0
      ? `FIELDS TO EXTRACT:\n${fieldList}\n\n`
      : 'FIELDS TO EXTRACT: Use the extraction instructions above to decide which fields to return.\n\n') +
    'OUTPUT FORMAT:\n' +
    'Return a JSON object with exactly these three top-level keys:\n' +
    '- "extracted_fields": object mapping each field name to its extracted value (null if not found)\n' +
    '- "field_evidence": object mapping each extracted field to the verbatim source text snippet\n' +
    '- "warnings": array of strings for any uncertainty, ambiguity, or OCR issues\n\n' +
    'CRITICAL: Only extract values explicitly present in the document or OCR text. Do not infer missing data.\n\n' +
    `Document:\n${text.slice(0, 6000)}`;

  try {
    const raw = await callGemini(prompt, true);
    const parsed = JSON.parse(raw) as {
      extracted_fields?: Record<string, unknown>;
      field_evidence?: Record<string, unknown>;
      warnings?: string[];
    };

    // Flatten extracted_fields to top level; carry evidence and warnings as reserved underscore keys
    const fields: Record<string, unknown> = parsed.extracted_fields ?? (parsed as Record<string, unknown>);
    const result: Record<string, unknown> = { ...fields };
    if (parsed.field_evidence && Object.keys(parsed.field_evidence).length > 0) {
      result._field_evidence = parsed.field_evidence;
    }
    if (parsed.warnings?.length) result._warnings = parsed.warnings;

    if (tpl) console.log(`[extractStructured] Template: ${tpl.template_id} (${typeName ?? 'fallback'})`);
    return result;
  } catch (err) {
    console.warn('[extractStructured] Prompt-pack call failed, using bare fallback:', String(err));
    try {
      const fallbackRaw = await callGemini(
        `Extract the following fields as a JSON object from the document. ` +
        `Only extract values explicitly present in the document or OCR text. Do not infer missing data. ` +
        `Return null for missing fields. Dates in YYYY-MM-DD. Amounts as plain numbers.\n\n` +
        `Fields:\n${fieldList}\n\nDocument:\n${text.slice(0, 6000)}`,
        true
      );
      try { return JSON.parse(fallbackRaw) as Record<string, unknown>; } catch (parseErr) {
        console.error('[extractStructured] Fallback JSON parse failed:', parseErr instanceof Error ? parseErr.message : String(parseErr), '| raw:', fallbackRaw.slice(0, 200));
        return {};
      }
    } catch (fallbackErr) {
      console.warn('[extractStructured] Bare fallback failed:', String(fallbackErr));
      return {};
    }
  }
}

// ── Auto-Discovery ────────────────────────────────────────────────────────────

const DISCOVERY_GROUPS = [
  'Identification', 'Bills', 'Finance', 'Travel', 'Insurance',
  'Subscriptions', 'Legal', 'Medical', 'Education', 'Other',
] as const;

export interface DiscoveredType {
  name: string;
  display_name_he: string;
  matching_description: string;
  group: string;
  extraction_schema: Record<string, ExtractionField>;
}

/**
 * Called when Phase 1 returns "Other".
 * Asks Gemini to propose a new document type — name, matching_description,
 * group, and a full extraction_schema — suitable for inserting into document_types.
 * Returns null if the model response is invalid or unparseable.
 */
export async function discoverDocumentType(text: string): Promise<DiscoveredType | null> {
  let raw = '';
  try {
    raw = await callGemini(
    `You are a document taxonomy expert for a personal finance and document management app.\n` +
    `Analyze the document below and propose a specific document type.\n\n` +
    `Return a JSON object with EXACTLY these keys:\n` +
    `{\n` +
    `  "name": "Concise title-case English name, 1–4 words (e.g. 'Property Tax Assessment')",\n` +
    `  "display_name_he": "The same name translated into natural Hebrew (e.g. 'שומת מס רכוש')",\n` +
    `  "matching_description": "One sentence describing what makes this document recognizable for future AI classification",\n` +
    `  "group": "Exactly one of: ${DISCOVERY_GROUPS.join(', ')}",\n` +
    `  "extraction_schema": {\n` +
    `    "field_name": {\n` +
    `      "description": "What this field contains",\n` +
    `      "data_type": "string | date | currency_amount",\n` +
    `      "required": true\n` +
    `    }\n` +
    `  }\n` +
    `}\n\n` +
    `Include 4–8 extraction fields most relevant to this document type.\n` +
    `Return only the JSON object, no commentary.\n\n` +
    `Document:\n${text.slice(0, 5000)}`,
    true
    );
  } catch (err) {
    console.warn('[discoverDocumentType] Gemini discovery failed:', String(err));
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DiscoveredType;
    if (!parsed.name || !parsed.extraction_schema || typeof parsed.extraction_schema !== 'object') return null;
    if (parsed.name.toLowerCase() === 'other') return null;

    // Sanitise: clamp data_type to valid values
    for (const field of Object.values(parsed.extraction_schema)) {
      if (!['string', 'date', 'currency_amount'].includes(field.data_type)) {
        field.data_type = 'string';
      }
    }
    // Clamp group
    if (!DISCOVERY_GROUPS.includes(parsed.group as typeof DISCOVERY_GROUPS[number])) {
      parsed.group = 'Other';
    }

    return parsed;
  } catch (err) {
    console.error('[discoverDocumentType] Failed to parse Gemini response:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
