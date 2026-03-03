import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
// Use lib directly to bypass index.js debug code that breaks under webpack/Next.js
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

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

type DocumentType = 'bill' | 'financial_report' | 'receipt' | 'claim' | 'other';

function toDocumentType(group: string): DocumentType {
  const g = group.trim().toLowerCase();
  if (g === 'bills') return 'bill';
  if (g === 'financial reports') return 'financial_report';
  if (g === 'receipts') return 'receipt';
  if (g === 'tax/insurance claims' || g === 'claims') return 'claim';
  return 'other'; // insurances, identification, other
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

    // 1. Parse PDF text
    const filepath = join(process.cwd(), 'uploads', filename);
    let fileBuffer;
    try {
      fileBuffer = await readFile(filepath);
    } catch (err) {
      console.error('Failed to read PDF file:', filepath, err);
      return res.status(422).json({ error: 'Could not read PDF file', details: String(err) });
    }
    if (!fileBuffer || !fileBuffer.length) {
      console.error('PDF file buffer is empty:', filepath);
      return res.status(422).json({ error: 'PDF file buffer is empty' });
    }
    let pdfData;
    try {
      pdfData = await pdfParse(fileBuffer);
    } catch (err) {
      console.error('pdf-parse failed:', err);
      return res.status(422).json({ error: 'pdf-parse failed', details: String(err) });
    }
    const text: string = pdfData.text || '';
    if (!text.trim()) {
      console.error('No text extracted from PDF:', filename, { pdfMeta: pdfData && pdfData.info });
      return res.status(422).json({ error: 'Could not extract text from PDF', details: pdfData });
    }

    // 2. Bilingual summarization — single Gemini call returning JSON with both languages
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
