import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { DocumentType } from '@/lib/types';

export const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'heic', 'heif']);
export const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  tiff: 'image/tiff', bmp: 'image/bmp',
  heic: 'image/heic', heif: 'image/heif',
};

export function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function toDocumentType(group: string): DocumentType {
  const g = group.trim().toLowerCase();
  if (g === 'bills') return 'bill';
  if (g === 'financial reports') return 'financial_report';
  if (g === 'receipts') return 'receipt';
  if (g === 'tax/insurance claims' || g === 'claims') return 'claim';
  if (g === 'insurances' || g === 'insurance') return 'insurance';
  if (g === 'identification') return 'identification';
  return 'other';
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (jsonMode) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return text;
}

export async function ocrImage(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const result = await model.generateContent([
    { inlineData: { data: fileBuffer.toString('base64'), mimeType } },
    { text: 'You are an expert OCR agent. Extract all text from this image or document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
  ]);
  return result.response.text().trim();
}

export async function ocrPdfFallback(fileBuffer: Buffer): Promise<string> {
  const result = await model.generateContent([
    { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } },
    { text: 'You are an expert OCR agent. Extract all text from this PDF document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
  ]);
  return result.response.text().trim();
}

export async function describeImage(fileBuffer: Buffer, mimeType: string): Promise<{ he: string; en: string }> {
  try {
    const result = await model.generateContent([
      { inlineData: { data: fileBuffer.toString('base64'), mimeType } },
      { text: 'Describe this image in one sentence per language.\nReturn a JSON object with exactly two keys: "he" (Hebrew) and "en" (English).\nReturn only the JSON object, no other text.' },
    ]);
    const raw = result.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);
    return { he: parsed.he ?? '', en: parsed.en ?? raw };
  } catch {
    return { he: '', en: '' };
  }
}

export async function summarizeDocument(text: string): Promise<{ he: string; en: string }> {
  const raw = await callGemini(
    `Summarize this document in a maximum of 25 words per language.\n` +
    `Focus on: the entity/provider name, the PRIMARY total amount (the grand total for the period, not secondary sub-totals or outstanding installments), and any urgent payment due.\n` +
    `Return a JSON object with exactly two keys:\n` +
    `  "he": the summary in Hebrew (max 25 words)\n` +
    `  "en": the summary in English (max 25 words)\n\n` +
    `Return only the JSON object, no other text.\n\nDocument:\n${text.slice(0, 8000)}`,
    true
  );
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.he || !parsed.en) throw new Error('Missing keys');
    return parsed;
  } catch {
    return { he: '', en: raw };
  }
}

export async function classifyDocument(summaryEn: string, text: string): Promise<string> {
  return callGemini(
    `Classify this document into exactly one of these categories:\n` +
    `Bills, Financial Reports, Insurances, Identification, Receipts, Tax/Insurance Claims, Other\n\n` +
    `Category definitions:\n` +
    `- Bills: a single invoice or bill for a specific billing period requesting payment\n` +
    `- Financial Reports: annual summaries, year-end statements, multi-period account summaries, pension/savings reports, or any document summarising charges or balances across multiple periods\n` +
    `- Insurances: insurance policies, coverage certificates, or renewal notices\n` +
    `- Identification: ID cards, passports, driver's licences, or similar identity documents\n` +
    `- Receipts: proof of a completed payment or purchase transaction\n` +
    `- Tax/Insurance Claims: insurance claims, tax refund claims, medical reimbursements, or similar claim forms\n\n` +
    `Return only the category name, nothing else.\n\n` +
    `Summary: ${summaryEn}\nDocument: ${text.slice(0, 4000)}`
  );
}

// ── Two-Pass DB-driven extraction ─────────────────────────────────────────────

export interface DocumentTypeRow {
  name: string;
  matching_description: string | null;
  schema_definition: { fields?: string[] } & Record<string, unknown>;
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
  const list = types
    .map(t => `• "${t.name}"${t.matching_description ? ` — ${t.matching_description}` : ''}`)
    .join('\n');

  const result = await callGemini(
    `You are a document classifier. Choose the single best type for the document below.\n\n` +
    `Available types:\n${list}\n• "Other" — use only if none of the above fit\n\n` +
    `Reply with ONLY the exact type name as listed above, nothing else.\n\n` +
    `Document (first portion):\n${text.slice(0, 3000)}`
  );

  const cleaned = result.trim().replace(/^["'•\-\s]+|["']+$/g, '');
  const match = types.find(t => t.name.toLowerCase() === cleaned.toLowerCase());
  return match ? match.name : 'Other';
}

/**
 * Phase 2 — extract structured fields defined by the matched type's schema_definition.
 * Uses Gemini's native JSON response schema when possible; falls back to prompt-based.
 */
export async function extractStructured(
  text: string,
  fields: string[],
): Promise<Record<string, unknown>> {
  if (fields.length === 0) return {};

  // Build a dynamic response schema: all fields are nullable strings
  const schemaProperties = Object.fromEntries(
    fields.map(f => [f, { type: SchemaType.STRING, nullable: true }])
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).generateContent({
      contents: [{
        role: 'user',
        parts: [{ text:
          `Extract the following fields from the document. ` +
          `Use null for any field not found. ` +
          `Dates must be YYYY-MM-DD. Amounts must be plain numbers (no currency symbols).\n\n` +
          `Fields to extract: ${fields.join(', ')}\n\n` +
          `Document:\n${text.slice(0, 6000)}`,
        }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: schemaProperties,
        },
      },
    });
    return JSON.parse(result.response.text()) as Record<string, unknown>;
  } catch (err) {
    console.warn('[extractStructured] Structured output failed, using prompt fallback:', String(err));
    const raw = await callGemini(
      `Extract these fields as a JSON object: ${fields.join(', ')}\n` +
      `Use null for missing fields. Dates in YYYY-MM-DD. Amounts as numbers.\n\n` +
      `Document:\n${text.slice(0, 6000)}`,
      true
    );
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function extractMetadata(documentType: DocumentType, text: string): Promise<Record<string, unknown>> {
  let prompt: string;
  switch (documentType) {
    case 'financial_report':
      prompt = `Extract the following fields as a JSON object:\n- total_balance: the grand total amount for the entire period (the overall sum charged or paid — NOT remaining installments or future payments)\n- liquidity_date: the report or statement date (YYYY-MM-DD)\n- management_fee: any management fee mentioned (null if none)\n- employer_name: the service provider, institution, or employer name\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    case 'bill':
      prompt = `Extract the following fields as a JSON object:\nprovider, total_amount, currency, due_date (YYYY-MM-DD), is_automatic_payment (true/false)\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    case 'receipt':
      prompt = `Extract the following fields as a JSON object:\nmerchant, total_amount, currency, purchase_date (YYYY-MM-DD)\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    case 'claim':
      prompt = `Extract the following fields as a JSON object:\nclaim_type, policy_number, insurer, total_amount, currency, claim_date (YYYY-MM-DD), status\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    case 'insurance':
      prompt = `Extract the following fields as a JSON object:\ninsurer, policy_number, premium_amount, currency, coverage_type, expiry_date (YYYY-MM-DD)\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    case 'identification':
      prompt = `Extract the following fields as a JSON object:\nid_type, full_name, id_number, issue_date (YYYY-MM-DD), expiry_date (YYYY-MM-DD), issuing_authority\n\nDocument:\n${text.slice(0, 6000)}`;
      break;
    default:
      prompt = `Extract any relevant metadata fields as a JSON object.\n\nDocument:\n${text.slice(0, 6000)}`;
  }
  const raw = await callGemini(prompt, true);
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
