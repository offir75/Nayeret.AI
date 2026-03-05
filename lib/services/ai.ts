import { GoogleGenerativeAI } from '@google/generative-ai';
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
    `Summarize the following document in exactly 2 sentences per language.\n` +
    `Return a JSON object with exactly two keys:\n` +
    `  "he": the 2-sentence summary in Hebrew\n` +
    `  "en": the 2-sentence summary in English\n\n` +
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
    `Use "Tax/Insurance Claims" for documents that are insurance claims, tax refund claims, medical reimbursements, or similar claim forms.\n` +
    `Return only the category name, nothing else.\n\n` +
    `Summary: ${summaryEn}\nDocument: ${text.slice(0, 4000)}`
  );
}

export async function extractMetadata(documentType: DocumentType, text: string): Promise<Record<string, unknown>> {
  let prompt: string;
  switch (documentType) {
    case 'financial_report':
      prompt = `Extract the following fields as a JSON object:\ntotal_balance, liquidity_date (YYYY-MM-DD), management_fee, employer_name\n\nDocument:\n${text.slice(0, 6000)}`;
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
