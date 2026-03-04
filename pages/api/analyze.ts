import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
// Use lib directly to bypass index.js debug code that breaks under webpack/Next.js
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'tiff', 'bmp']);
const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  tiff: 'image/tiff', bmp: 'image/bmp',
};
function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (jsonMode) {
    // Strip markdown code fences if the model wraps output in them
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return text;
}

type DocumentType = 'bill' | 'financial_report' | 'receipt' | 'claim' | 'insurance' | 'identification' | 'other';

function toDocumentType(group: string): DocumentType {
  const g = group.trim().toLowerCase();
  if (g === 'bills') return 'bill';
  if (g === 'financial reports') return 'financial_report';
  if (g === 'receipts') return 'receipt';
  if (g === 'tax/insurance claims' || g === 'claims') return 'claim';
  if (g === 'insurances' || g === 'insurance') return 'insurance';
  if (g === 'identification') return 'identification';
  return 'other';
}

/** Extract and validate the caller's user ID from the Authorization header. */
async function getUserId(req: NextApiRequest): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Missing filename' });
    }

    // 1. Download file from Supabase Storage
    const storagePath = `${userId}/${filename}`;
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .download(storagePath);
    if (storageError || !storageData) {
      return res.status(422).json({ error: 'Could not read file from storage', details: String(storageError) });
    }
    const fileBuffer = Buffer.from(await storageData.arrayBuffer());
    if (!fileBuffer?.length) {
      return res.status(422).json({ error: 'File buffer is empty' });
    }

    // 2. Extract text — Gemini OCR for images, pdf-parse for PDFs
    let text: string;
    const ext = getExt(filename);
    if (IMAGE_EXTENSIONS.has(ext)) {
      const mimeType = MIME_MAP[ext] ?? 'image/jpeg';
      try {
        const ocrResult = await model.generateContent([
          { inlineData: { data: fileBuffer.toString('base64'), mimeType } },
          { text: 'You are an expert OCR agent. Extract all text from this image or document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
        ]);
        text = ocrResult.response.text().trim();
      } catch (err) {
        console.error('Gemini OCR failed:', err);
        return res.status(422).json({ error: 'Image OCR failed', details: String(err) });
      }
      if (!text) {
        return res.status(422).json({ error: 'No text extracted from image' });
      }
    } else {
      // PDF — try pdf-parse first, fall back to Gemini OCR for scanned/image-based PDFs
      let pdfData;
      try {
        pdfData = await pdfParse(fileBuffer);
      } catch (err) {
        console.error('pdf-parse failed:', err);
        return res.status(422).json({ error: 'pdf-parse failed', details: String(err) });
      }
      text = pdfData.text || '';
      if (!text.trim()) {
        // Scanned or image-based PDF — fall back to Gemini OCR
        console.warn('pdf-parse returned no text, falling back to Gemini OCR:', filename);
        try {
          const ocrResult = await model.generateContent([
            { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } },
            { text: 'You are an expert OCR agent. Extract all text from this PDF document into plain text, preserving structure where possible. Return only the extracted text, no commentary.' },
          ]);
          text = ocrResult.response.text().trim();
        } catch (err) {
          console.error('Gemini PDF OCR failed:', err);
          return res.status(422).json({ error: 'Could not extract text from PDF (OCR fallback also failed)', details: String(err) });
        }
        if (!text) {
          return res.status(422).json({ error: 'Could not extract any text from PDF' });
        }
      }
    }

    // 2. Triage: is this a real document or a logo/photo/meme?
    const triageResult = await callGemini(
      `Is the following text extracted from a financial, legal, identity, or business document ` +
      `(bill, bank report, insurance policy, receipt, claim, ID, passport, contract)?\n` +
      `Answer ONLY "yes" or "no".\n\nText:\n${text.slice(0, 2000)}`
    );
    if (!triageResult.toLowerCase().startsWith('y')) {
      const onelinerRaw = await callGemini(
        `In one sentence, describe what this content appears to be.\n` +
        `Return a JSON object with exactly two keys:\n` +
        `  "he": the description in Hebrew\n` +
        `  "en": the description in English\n` +
        `Return only the JSON object, no other text.\n\nText:\n${text.slice(0, 1000)}`,
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
        }], { onConflict: 'file_name,owner_id' })
        .select();
      return res.status(200).json({
        success: true, filename,
        summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
        document_group: 'Other', document_type: 'other',
        raw_metadata: { is_media: true },
        supabaseId: mediaData?.[0]?.id ?? null,
        is_media: true,
      });
    }

    // 3. Bilingual summarization — single Gemini call returning JSON with both languages
    const summaryPrompt =
      `Summarize the following document in exactly 2 sentences per language.\n` +
      `Return a JSON object with exactly two keys:\n` +
      `  "he": the 2-sentence summary in Hebrew\n` +
      `  "en": the 2-sentence summary in English\n\n` +
      `Return only the JSON object, no other text.\n\nDocument:\n${text.slice(0, 8000)}`;

    const summaryRaw = await callGemini(summaryPrompt, true);
    let summaries: { he: string; en: string };
    try {
      summaries = JSON.parse(summaryRaw);
      if (!summaries.he || !summaries.en) throw new Error('Missing keys');
    } catch {
      // Fallback: treat the raw text as the English summary, leave Hebrew blank
      summaries = { he: '', en: summaryRaw };
    }

    // 3. Classify into one of the supported categories
    const classificationPrompt =
      `Classify this document into exactly one of these categories:\n` +
      `Bills, Financial Reports, Insurances, Identification, Receipts, Tax/Insurance Claims, Other\n\n` +
      `Use "Tax/Insurance Claims" for documents that are insurance claims, tax refund claims, medical reimbursements, or similar claim forms.\n` +
      `Return only the category name, nothing else.\n\n` +
      `Summary: ${summaries.en}\nDocument: ${text.slice(0, 4000)}`;
    const document_group = await callGemini(classificationPrompt);
    const document_type = toDocumentType(document_group);

    // 4. Extract structured metadata per category
    let extractionPrompt: string;
    switch (document_type) {
      case 'financial_report':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `total_balance, liquidity_date (YYYY-MM-DD), management_fee, employer_name\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      case 'bill':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `provider, total_amount, currency, due_date (YYYY-MM-DD), is_automatic_payment (true/false)\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      case 'receipt':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `merchant, total_amount, currency, purchase_date (YYYY-MM-DD)\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      case 'claim':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `claim_type, policy_number, insurer, total_amount, currency, claim_date (YYYY-MM-DD), status\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      case 'insurance':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `insurer, policy_number, premium_amount, currency, coverage_type, expiry_date (YYYY-MM-DD)\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      case 'identification':
        extractionPrompt =
          `Extract the following fields as a JSON object:\n` +
          `id_type, full_name, id_number, issue_date (YYYY-MM-DD), expiry_date (YYYY-MM-DD), issuing_authority\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
        break;
      default:
        extractionPrompt =
          `Extract any relevant metadata fields as a JSON object.\n\n` +
          `Document:\n${text.slice(0, 6000)}`;
    }
    const raw_metadata_str = await callGemini(extractionPrompt, true);
    let raw_metadata: Record<string, unknown>;
    try {
      raw_metadata = JSON.parse(raw_metadata_str);
    } catch {
      raw_metadata = { raw: raw_metadata_str };
    }

    // 5. Persist to Supabase — upsert per (file_name, owner_id) so re-uploads update in place
    const { data: supaData, error: supaError } = await supabaseAdmin
      .from('documents')
      .upsert(
        [
          {
            file_name: filename,
            owner_id: userId,
            document_type,
            summary_he: summaries.he,
            summary_en: summaries.en,
            raw_analysis: raw_metadata,
          },
        ],
        { onConflict: 'file_name,owner_id' }
      )
      .select();

    if (supaError) {
      console.error('Supabase upsert error:', supaError);
      return res.status(500).json({ error: 'Failed to save to database', details: supaError.message });
    }

    return res.status(200).json({
      success: true,
      filename,
      summary_he: summaries.he,
      summary_en: summaries.en,
      document_group,
      document_type,
      raw_metadata,
      supabaseId: supaData?.[0]?.id ?? null,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
