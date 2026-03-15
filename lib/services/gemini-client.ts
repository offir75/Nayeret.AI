/**
 * Low-level Gemini API client.
 * Wraps all model calls with timeout + retry logic.
 * All higher-level AI operations (classify, extract, summarize) live in ai.ts.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseBilingualJson } from '@/lib/utils/parse';
import {
  GEMINI_TIMEOUT_MS as CONFIG_GEMINI_TIMEOUT_MS,
  GEMINI_MAX_RETRIES as CONFIG_GEMINI_MAX_RETRIES,
} from '@/lib/config/pipeline';

// ─── File-type helpers ────────────────────────────────────────────────────────

export const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'heic', 'heif']);

export const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  tiff: 'image/tiff', bmp: 'image/bmp',
  heic: 'image/heic', heif: 'image/heif',
};

export function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

// ─── Model initialization ─────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const GEMINI_TIMEOUT_MS  = CONFIG_GEMINI_TIMEOUT_MS;
const GEMINI_MAX_RETRIES = CONFIG_GEMINI_MAX_RETRIES;

// ─── Reliability wrappers ─────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[${label}] Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = GEMINI_MAX_RETRIES): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing.');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Gemini prompt is empty.');

  const result = await withRetry(
    () => withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS, 'callGemini'),
    'callGemini',
  );
  let text = result.response.text().trim();
  if (jsonMode) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return text;
}

export async function ocrImage(fileBuffer: Buffer, mimeType: string): Promise<string> {
  if (!fileBuffer?.length) throw new Error('[ocrImage] File buffer is empty.');
  const result = await withRetry(
    () => withTimeout(
      model.generateContent([
        { inlineData: { data: fileBuffer.toString('base64'), mimeType } },
        { text: 'You are an expert OCR agent. Extract all text from this image or document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
      ]),
      GEMINI_TIMEOUT_MS, 'ocrImage',
    ),
    'ocrImage',
  );
  return result.response.text().trim();
}

export async function ocrPdfFallback(fileBuffer: Buffer): Promise<string> {
  if (!fileBuffer?.length) throw new Error('[ocrPdfFallback] File buffer is empty.');
  const result = await withRetry(
    () => withTimeout(
      model.generateContent([
        { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } },
        { text: 'You are an expert OCR agent. Extract all text from this PDF document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
      ]),
      GEMINI_TIMEOUT_MS, 'ocrPdfFallback',
    ),
    'ocrPdfFallback',
  );
  return result.response.text().trim();
}

export async function describeImage(fileBuffer: Buffer, mimeType: string): Promise<{ he: string; en: string }> {
  try {
    const result = await withRetry(
      () => withTimeout(
        model.generateContent([
          { inlineData: { data: fileBuffer.toString('base64'), mimeType } },
          { text: 'Describe this image in one sentence per language.\nReturn a JSON object with exactly two keys: "he" (Hebrew) and "en" (English).\nReturn only the JSON object, no other text.' },
        ]),
        GEMINI_TIMEOUT_MS, 'describeImage',
      ),
      'describeImage',
    );
    return parseBilingualJson(result.response.text().trim());
  } catch (err) {
    console.error('[describeImage] Failed:', err instanceof Error ? err.message : String(err));
    return { he: '', en: '' };
  }
}
