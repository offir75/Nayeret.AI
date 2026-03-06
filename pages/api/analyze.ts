import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { downloadFile } from '@/lib/services/storage';
import { UI_CATEGORIES } from '@/nayeret_ai_schema_registry';
import {
  IMAGE_EXTENSIONS, MIME_MAP, getExt,
  callGemini, ocrImage, ocrPdfFallback, describeImage,
  summarizeDocument, classifyDocument, classifyAgainstTypes, extractStructured, discoverDocumentType,
} from '@/lib/services/ai';
import type { DocumentType } from '@/lib/types';
import type { DocumentTypeRow } from '@/lib/services/ai';
import type { UICategory } from '@/nayeret_ai_schema_registry';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// ── Name → legacy DocumentType mapping (keeps UI backwards-compatible) ─────────

const NAME_TO_DOC_TYPE: Record<string, DocumentType> = {
  'financial report':  'financial_report',
  'bill':              'bill',
  'receipt':           'receipt',
  'insurance policy':  'insurance',
  'identity':          'identification',
  'claim':             'claim',
  'other':             'other',
};

function nameToDocumentType(name: string): DocumentType {
  return NAME_TO_DOC_TYPE[name.toLowerCase()] ?? 'other';
}

const REMINDER_OFFSETS_DAYS = [30, 14, 7] as const;

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toScalarString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromEpoch = new Date(value);
    if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString().slice(0, 10);
  }

  const raw = toScalarString(value);
  if (!raw) return null;

  // Prefer already-normalized ISO dates from extraction prompts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCurrency(value: unknown): string | null {
  const curr = toScalarString(value);
  if (!curr) return null;
  const upper = curr.toUpperCase().trim().replace(/\./g, '');
  if (/^[A-Z]{3}$/.test(upper)) return upper; // already an ISO code
  if (['$', 'US$', 'DOLLAR', 'DOLLARS', 'USD$'].includes(upper)) return 'USD';
  if (['€', 'EURO', 'EUROS'].includes(upper)) return 'EUR';
  if (['₪', 'NIS', 'SHEKEL', 'SHEKELS', 'NEW SHEKEL', 'NEW SHEKELS'].includes(upper)) return 'ILS';
  if (['£', 'POUND', 'POUNDS', 'STERLING', 'GB£'].includes(upper)) return 'GBP';
  return null;
}

function legacyTypeToUiCategory(type: DocumentType): UICategory {
  if (type === 'bill' || type === 'receipt') return 'Bills & Receipts';
  if (type === 'insurance' || type === 'claim') return 'Insurance & Contracts';
  if (type === 'identification') return 'Identity';
  if (type === 'financial_report') return 'Money';
  return 'Money';
}

/**
 * Infer ui_category from the matched taxonomy name when the DB row has no ui_category set.
 * More precise than legacyTypeToUiCategory because it pattern-matches the full taxonomy name.
 */
function inferUiCategory(typeName: string, legacyType: DocumentType): UICategory {
  if (/hotel|resort|flight|travel|reservation|ticket|cruise|train|bus|ferry|boarding|rental|vacation/i.test(typeName))
    return 'Trips & Tickets';
  if (/insurance|policy|claim/i.test(typeName)) return 'Insurance & Contracts';
  if (/passport|national.id|driver.licen|identity/i.test(typeName)) return 'Identity';
  if (/receipt|purchase|order|retail|supermarket|restaurant|pharmacy/i.test(typeName))
    return 'Bills & Receipts';
  if (/bill|invoice|utility|telecom|cable|electricity|water|gas|toll|fine|penalty/i.test(typeName))
    return 'Bills & Receipts';
  if (/pension|investment|savings|provident|fund|stock|dividend|loan|mortgage|bank/i.test(typeName))
    return 'Money';
  return legacyTypeToUiCategory(legacyType);
}

function normalizeUiCategory(value: unknown, fallback: UICategory): UICategory {
  if (typeof value !== 'string') return fallback;
  return (UI_CATEGORIES as readonly string[]).includes(value) ? (value as UICategory) : fallback;
}

function computeLifecycleDates(sourceDateIso: string | null): {
  hasEventDate: boolean;
  eventDate: string | null;
  nextReminderDate: string | null;
} {
  if (!sourceDateIso) {
    return { hasEventDate: false, eventDate: null, nextReminderDate: null };
  }

  const eventDate = new Date(`${sourceDateIso}T00:00:00Z`);
  if (Number.isNaN(eventDate.getTime())) {
    return { hasEventDate: false, eventDate: null, nextReminderDate: null };
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const reminderCandidates = REMINDER_OFFSETS_DAYS
    .map((days) => {
      const reminder = new Date(eventDate);
      reminder.setUTCDate(reminder.getUTCDate() - days);
      return reminder;
    })
    .filter((reminder) => reminder.getTime() >= todayUtc.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  const nextReminderDate = reminderCandidates.length > 0
    ? reminderCandidates[0].toISOString().slice(0, 10)
    : null;

  return {
    hasEventDate: true,
    eventDate: sourceDateIso,
    nextReminderDate,
  };
}

// ── Tier 2: Semantic duplicate detection ──────────────────────────────────────

const SEMANTIC_UNIQUE_FIELDS: Partial<Record<DocumentType, string[]>> = {
  identification:   ['id_number'],
  insurance:        ['policy_number'],
  bill:             ['provider', 'due_date'],
  receipt:          ['merchant', 'purchase_date'],
  financial_report: ['liquidity_date'],
  claim:            ['policy_number', 'claim_date'],
};

async function findSemanticDuplicate(
  userId: string,
  documentType: DocumentType,
  rawMetadata: Record<string, unknown>,
  excludeFileName: string,
): Promise<{ id: string; file_name: string; original_filename: string | null; document_type: DocumentType } | null> {
  try {
    const fields = SEMANTIC_UNIQUE_FIELDS[documentType];
    if (!fields) return null;

    const safeRaw = rawMetadata ?? {};
    const matchFields = fields.filter(f => safeRaw[f] != null && safeRaw[f] !== '');
    if (matchFields.length === 0) return null;

    const { data: candidates } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, original_filename, document_type, raw_analysis')
      .eq('owner_id', userId)
      .eq('document_type', documentType)
      .neq('file_name', excludeFileName);

    if (!candidates?.length) return null;

    for (const candidate of candidates) {
      const ra = (candidate.raw_analysis as Record<string, unknown>) ?? {};
      const allMatch = matchFields.every(f => {
        const a = String(safeRaw[f] ?? '').toLowerCase().trim();
        const b = String(ra[f] ?? '').toLowerCase().trim();
        return a && b && a === b;
      });
      if (allMatch) {
        return {
          id: candidate.id,
          file_name: candidate.file_name,
          original_filename: (candidate.original_filename as string | null) ?? null,
          document_type: candidate.document_type as DocumentType,
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('[findSemanticDuplicate] Duplicate check failed:', String(err));
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })

    return;
  }

  let userId: string | null = null;
  try {
    userId = await getUserIdFromRequest(req);
  } catch (err) {
    console.error('Auth lookup failed:', err);
    res.status(500).json({ error: 'Authentication lookup failed', details: String(err) });

    return;
  }

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized — please sign in' })

    return;
  }

  try {
    const { filename, mimeType: clientMimeType, fileHash, originalFilename } = req.body as {
      filename: string; mimeType?: string; fileHash?: string; originalFilename?: string;
    };
    if (!filename) {
      res.status(400).json({ error: 'Missing filename' })

      return;
    }

    // 1. Download file from Supabase Storage
    const storagePath = `${userId}/${filename}`;
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadFile('documents', storagePath);
    } catch (err) {
      res.status(422).json({ error: 'Could not read file from storage', details: String(err) });

      return;
    }
    if (!fileBuffer?.length) {
      res.status(422).json({ error: 'File buffer is empty' })

      return;
    }

    // 2. Extract text — Gemini OCR for images, pdf-parse → Gemini for PDFs
    let text: string;
    const ext = getExt(filename);
    const isImage = IMAGE_EXTENSIONS.has(ext) || (clientMimeType && clientMimeType.startsWith('image/'));

    if (isImage) {
      const mimeType = (clientMimeType && clientMimeType.startsWith('image/'))
        ? clientMimeType
        : (MIME_MAP[ext] ?? 'image/jpeg');
      try {
        text = await ocrImage(fileBuffer, mimeType);
      } catch (err) {
        console.error('Gemini OCR failed:', err);
        res.status(422).json({ error: 'Image OCR failed', details: String(err) });

        return;
      }
      if (!text) {
        // No text — visual media path
        const mediaSummaries = await describeImage(fileBuffer, mimeType);
        const { data: mediaData } = await supabaseAdmin
          .from('documents')
          .upsert([{
            file_name: filename, owner_id: userId,
            document_type: 'other',
            summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
            raw_analysis: { is_media: true },
            insights: { is_media: true },
            ...(fileHash ? { file_hash: fileHash } : {}),
            ...(originalFilename ? { original_filename: originalFilename } : {}),
          }], { onConflict: 'file_name,owner_id' })
          .select();
        res.status(200).json({
          success: true, filename,
          summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
          document_group: 'Other', document_type: 'other',
          raw_metadata: { is_media: true },
          supabaseId: mediaData?.[0]?.id ?? null,
          is_media: true, semanticMatch: null,
        })

        return;
      }
    } else {
      // PDF — try pdf-parse, fall back to Gemini OCR on failure or empty result
      try {
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text || '';
      } catch (err) {
        console.warn('pdf-parse threw, falling back to Gemini OCR:', filename, String(err));
        text = '';
      }
      if (!text.trim()) {
        console.warn('pdf-parse returned no text, falling back to Gemini OCR:', filename);
        try {
          text = await ocrPdfFallback(fileBuffer);
        } catch (err) {
          console.error('Gemini PDF OCR failed:', err);
          res.status(422).json({ error: 'Could not extract text from PDF (OCR fallback also failed)', details: String(err) });

          return;
        }
        if (!text) {
          res.status(422).json({ error: 'Could not extract any text from PDF' })

          return;
        }
      }
    }

    // 3. Triage: is this a real document (not a photo/meme/logo)?
    const triageResult = await callGemini(
      `Is the following text extracted from a financial, legal, identity, or business document ` +
      `(bill, bank report, insurance policy, receipt, claim, ID, passport, contract)?
` +
      `Answer ONLY "yes" or "no".

Text:
${text.slice(0, 2000)}`
    );
    if (!triageResult.toLowerCase().startsWith('y')) {
      const onelinerRaw = await callGemini(
        `In one sentence, describe what this content appears to be.
` +
        `Return a JSON object with exactly two keys: "he" (Hebrew) and "en" (English).
` +
        `Return only the JSON object.

Text:
${text.slice(0, 1000)}`,
        true
      );
      let mediaSummaries: { he: string; en: string };
      try {
        mediaSummaries = JSON.parse(onelinerRaw);
        if (!mediaSummaries.he || !mediaSummaries.en) throw new Error('Missing keys');
      } catch {
        mediaSummaries = { he: '', en: onelinerRaw };
      }
      const { data: mediaData } = await supabaseAdmin
        .from('documents')
        .upsert([{
          file_name: filename, owner_id: userId,
          document_type: 'other',
          summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
          raw_analysis: { is_media: true },
          insights: { is_media: true },
          ...(fileHash ? { file_hash: fileHash } : {}),
          ...(originalFilename ? { original_filename: originalFilename } : {}),
        }], { onConflict: 'file_name,owner_id' })
        .select();
      res.status(200).json({
        success: true, filename,
        summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
        document_group: 'Other', document_type: 'other',
        raw_metadata: { is_media: true },
        supabaseId: mediaData?.[0]?.id ?? null,
        is_media: true, semanticMatch: null,
      })

      return;
    }

    // 4. Fetch active document types from DB (Phase 1 input)
    const { data: dbTypes, error: typesError } = await supabaseAdmin
      .from('document_types')
      .select('name, matching_description, display_name_he, ui_category, schema_definition, semantic_signals')
      .eq('is_active', true);

    if (typesError) {
      console.error('Failed to fetch document_types:', typesError.message);
    }
    const activeTypes: DocumentTypeRow[] = (dbTypes ?? []) as DocumentTypeRow[];

    // 5. PHASE 1 — Hybrid Classifier: score first, Gemini only when needed
    let matchedTypeName = 'Other';
    let matchedRow: DocumentTypeRow | undefined;
    let classifierConfidence: number | null = null;

    if (activeTypes.length > 0) {
      const scorerResult = await classifyDocument(text, activeTypes);
      classifierConfidence = scorerResult.confidence;

      if (scorerResult.confidenceLevel === 'high') {
        // High confidence (>= 0.85): trust the scorer, skip Gemini
        matchedTypeName = scorerResult.typeName;
        matchedRow = activeTypes.find(t => t.name === matchedTypeName);
        console.log(`[classify] Scorer won: ${matchedTypeName} (${scorerResult.confidence.toFixed(2)})`);
      } else {
        // Medium / low / unclassified: narrow to top-15 candidates and let Gemini decide
        const TOP_N = 15;
        const topCandidates = Object.entries(scorerResult.scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, TOP_N)
          .map(([name]) => activeTypes.find(t => t.name === name))
          .filter((t): t is DocumentTypeRow => t != null);

        // When scorer has no signal (unclassified), let Gemini see all types;
        // when it has a weak signal, narrow to top-15 to reduce prompt size.
        const candidates = scorerResult.confidenceLevel === 'unclassified'
          ? activeTypes
          : topCandidates.length > 0 ? topCandidates : activeTypes;
        matchedTypeName = await classifyAgainstTypes(text, candidates);
        matchedRow = activeTypes.find(t => t.name === matchedTypeName);
        console.log(`[classify] Gemini decided: ${matchedTypeName} (scorer: ${scorerResult.typeName} @ ${scorerResult.confidence.toFixed(2)} [${scorerResult.confidenceLevel}])`);
      }
    }

    // legacyDocumentType: used only for semantic dedup (needs the enum value)
    let legacyDocumentType = nameToDocumentType(matchedTypeName);
    let effectiveMatchedRow = matchedRow;

    // Post-classification heuristic: override financial_report → bill when the text
    // contains clear single-invoice signals (Hebrew bill keywords or English equivalents)
    if (legacyDocumentType === 'financial_report') {
      const billPattern = /חשבונית|לתשלום|invoice|amount\s+due/i;
      if (billPattern.test(text.slice(0, 3000))) {
        const billRow = activeTypes.find(t => nameToDocumentType(t.name) === 'bill');
        legacyDocumentType = 'bill';
        effectiveMatchedRow = billRow;
        matchedTypeName = billRow?.name ?? 'Bill';
        console.log('[classify] Overriding financial_report → bill due to bill keywords in text');
      }
    }

    // Auto-discovery: if no DB type matched, ask Gemini to propose a new type and persist it
    if (matchedTypeName === 'Other') {
      const discovered = await discoverDocumentType(text);
      if (discovered) {
        const { error: insertError } = await supabaseAdmin
          .from('document_types')
          .insert([{
            name: discovered.name,
            display_name_he: discovered.display_name_he ?? '',
            matching_description: discovered.matching_description,
            group: discovered.group,
            schema_definition: { extraction_schema: discovered.extraction_schema },
            is_active: true,
          }]);
        if (!insertError) {
          matchedTypeName = discovered.name;
          effectiveMatchedRow = {
            name: discovered.name,
            display_name_he: discovered.display_name_he ?? '',
            matching_description: discovered.matching_description,
            schema_definition: { extraction_schema: discovered.extraction_schema },
          };
          console.log('[discover] New document type saved to DB:', discovered.name);
        } else {
          console.warn('[discover] Failed to save new type:', insertError.message);
        }
      }
    }

    // 6. PHASE 2 — Structured extraction (prefer rich extraction_schema, fall back to fields[])
    let insights: Record<string, unknown> = {};

    const extractionSchema = effectiveMatchedRow?.schema_definition?.extraction_schema ?? null;
    const legacyFields: string[] = effectiveMatchedRow?.schema_definition?.fields ?? [];
    // Always extract when a taxonomy was matched — the prompt-pack template provides
    // extraction instructions even when the DB schema is empty.
    if (matchedTypeName !== 'Other') {
      const schemaToUse: Record<string, import('@/lib/services/ai').ExtractionField> | string[] =
        extractionSchema && Object.keys(extractionSchema).length > 0
          ? extractionSchema
          : legacyFields.length > 0 ? legacyFields : {};
      insights = await extractStructured(text, schemaToUse, matchedTypeName);
    }

    // Infer currency from text when the extraction schema stripped the symbol
    // (currency_amount fields extracted as plain numbers per ai.ts fieldHint)
    if (!insights.currency) {
      const MONETARY_KEYS = ['amount', 'total_amount', 'total', 'total_balance', 'premium_amount'];
      const hasMonetary = MONETARY_KEYS.some(k => insights[k] != null);
      if (hasMonetary) {
        const SYM_MAP: Record<string, string> = { '$': 'USD', '₪': 'ILS', '€': 'EUR', '£': 'GBP' };
        const codeMatch = text.match(/\b(USD|ILS|EUR|GBP)\b/);
        const symMatch  = text.match(/[₪$€£]/);
        const inferred  = codeMatch?.[1] ?? (symMatch ? SYM_MAP[symMatch[0]] : undefined);
        if (inferred) insights.currency = inferred;
      }
    }

    // Normalize: guarantee top-level 'amount' (number) and 'currency' keys for dashboard
    // Semantic field mapping: explicit priority list first, then dynamic scan for
    // any field whose name contains total/balance/sum/due (catches aliased field names).
    const AMOUNT_PRIORITY = [
      'total_amount', 'total_balance', 'premium_amount',
      'payment_amount', 'amount_due', 'total_amount_due',
      'net_amount', 'gross_pay', 'net_pay', 'ending_balance',
    ];
    if (insights.amount == null) {
      // 1. Named priority
      for (const k of AMOUNT_PRIORITY) {
        if (insights[k] != null) { insights.amount = insights[k]; break; }
      }
      // 2. Semantic scan: any numeric field whose name contains total/balance/sum/due
      if (insights.amount == null) {
        const AMOUNT_KEYWORDS = ['total', 'balance', 'sum', 'due'];
        for (const [k, v] of Object.entries(insights)) {
          if (k.startsWith('_')) continue;
          if (typeof v === 'number' && AMOUNT_KEYWORDS.some(kw => k.toLowerCase().includes(kw))) {
            insights.amount = v;
            break;
          }
        }
      }
    }
    if (typeof insights.amount === 'string') {
      const parsed = parseFloat((insights.amount as string).replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsed)) insights.amount = parsed;
    }

    // Confidence alignment: if Phase 2 extraction found strong field evidence
    // (≥3 verbatim matches), promote classifierConfidence toward the high threshold.
    if (classifierConfidence != null && classifierConfidence < 0.85) {
      const evidence = insights._field_evidence as Record<string, unknown> | undefined;
      if (evidence) {
        const evidenceCount = Object.values(evidence).filter(v => v != null && String(v).length > 3).length;
        if (evidenceCount >= 3) {
          classifierConfidence = Math.min(0.85, classifierConfidence + evidenceCount * 0.04);
          console.log('[confidence] Boosted by extraction evidence (' + evidenceCount + ' fields):', classifierConfidence.toFixed(2));
        }
      }
    }

    // Attach classification metadata to insights
    insights.document_type_name = matchedTypeName;
    // Hebrew display name: prefer DB row > discovered type > empty (UI will use fallback)
    const hebrewTypeName: string =
      (effectiveMatchedRow as (typeof effectiveMatchedRow & { display_name_he?: string | null }))?.display_name_he ?? '';
    if (hebrewTypeName) insights.document_type_name_he = hebrewTypeName;

    // 7. Bilingual Zen summary
    const summaries = await summarizeDocument(text);
    // Summary-mirror: if extraction missed total_amount/amount but the bilingual summary
    // already calculated a total (e.g. "4,470 Euro"), parse it as a last-resort fallback.
    if (insights.total_amount == null && insights.amount == null && summaries.en) {
      const moneyMatch = summaries.en.match(/([\d,]+(?:\.\d+)?)\s*(EUR|USD|ILS|GBP|Euro?s?)/i);
      if (moneyMatch) {
        const parsed = parseFloat(moneyMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          insights.total_amount = parsed;
          insights.amount = parsed; // promote so mappedAmount picks it up
          if (!insights.currency) {
            const sym = moneyMatch[2].toUpperCase();
            insights.currency = sym.startsWith('EUR') ? 'EUR' : sym;
          }
          console.log('[extract] summary-mirror fallback: total_amount =', parsed);
        }
      }
    }

    const mappedAmount = toNumeric(insights.amount);
    const mappedCurrency = normalizeCurrency(insights.currency);
    const mappedDueDate = toIsoDate(insights.due_date);
    const mappedIssueDate = toIsoDate(
      insights.bill_date ?? insights.issue_date ??
      insights.statement_date ?? insights.request_date ?? insights.service_date
    );
    const mappedProvider = toNonEmptyString(insights.provider_name ?? insights.provider);
    const mappedUiCategory = normalizeUiCategory(
      (effectiveMatchedRow as DocumentTypeRow | undefined)?.ui_category,
      inferUiCategory(matchedTypeName, legacyDocumentType),
    );
    const lifecycle = computeLifecycleDates(mappedDueDate ?? mappedIssueDate);

    // 8. Persist — write to both raw_analysis (UI compat) and insights (new column)
    const { data: supaData, error: supaError } = await supabaseAdmin
      .from('documents')
      .upsert(
        [{
          file_name: filename,
          owner_id: userId,
          document_type: matchedTypeName,
          ...(mappedAmount != null ? { amount: mappedAmount } : {}),
          ...(mappedCurrency ? { currency: mappedCurrency } : {}),
          ...(mappedDueDate ? { due_date: mappedDueDate } : {}),
          ...(mappedIssueDate ? { issue_date: mappedIssueDate } : {}),
          ...(mappedProvider ? { provider: mappedProvider } : {}),
          ...(mappedUiCategory ? { ui_category: mappedUiCategory } : {}),
          ...(classifierConfidence != null ? { confidence_score: classifierConfidence } : {}),
          ...(lifecycle.hasEventDate ? { event_date: lifecycle.eventDate, next_reminder_date: lifecycle.nextReminderDate } : {}),
          summary_he: summaries.he,
          summary_en: summaries.en,
          raw_analysis: insights,
          insights,
          ...(fileHash ? { file_hash: fileHash } : {}),
          ...(originalFilename ? { original_filename: originalFilename } : {}),
        }],
        { onConflict: 'file_name,owner_id' }
      )
      .select();

    if (supaError) {
      console.error('Supabase upsert error:', supaError);
      res.status(500).json({ error: 'Failed to save to database', details: supaError.message })

      return;
    }

    // 9. Tier 2 semantic duplicate check
    const semanticMatch = await findSemanticDuplicate(userId, legacyDocumentType, insights, filename);
    if (semanticMatch) {
      console.log('[dedup] Semantic match found:', semanticMatch.id, 'for new doc:', filename);
    }

    res.status(200).json({
      success: true,
      filename,
      summary_he: summaries.he,
      summary_en: summaries.en,
      document_group: matchedTypeName,
      document_type: matchedTypeName,
      raw_metadata: insights,
      supabaseId: supaData?.[0]?.id ?? null,
      semanticMatch: semanticMatch ?? null,
    })


    return;

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze file',
      details: error instanceof Error ? error.message : 'Unknown error',
    })

    return;
  }
}
