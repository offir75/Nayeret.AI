import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { downloadFile } from '@/lib/services/storage';
import {
  IMAGE_EXTENSIONS, MIME_MAP, getExt, toDocumentType,
  callGemini, ocrImage, ocrPdfFallback, describeImage,
  summarizeDocument, classifyDocument, extractMetadata,
} from '@/lib/services/ai';
import type { DocumentType } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
// Use lib directly to bypass index.js debug code that breaks under webpack/Next.js
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// ── Tier 2: Semantic duplicate detection ──────────────────────────────────────

const SEMANTIC_UNIQUE_FIELDS: Partial<Record<DocumentType, string[]>> = {
  identification:   ['id_number'],
  insurance:        ['policy_number'],
  bill:             ['provider', 'due_date'],
  receipt:          ['merchant', 'purchase_date'],
  financial_report: ['total_balance', 'liquidity_date'],
  claim:            ['policy_number', 'claim_date'],
};

async function findSemanticDuplicate(
  userId: string,
  documentType: DocumentType,
  rawMetadata: Record<string, unknown>,
  excludeFileName: string,
): Promise<{ id: string; file_name: string; document_type: DocumentType } | null> {
  const fields = SEMANTIC_UNIQUE_FIELDS[documentType];
  if (!fields) return null;

  const matchFields = fields.filter(f => rawMetadata[f] != null && rawMetadata[f] !== '');
  if (matchFields.length === 0) return null;

  const { data: candidates } = await supabaseAdmin
    .from('documents')
    .select('id, file_name, document_type, raw_analysis')
    .eq('owner_id', userId)
    .eq('document_type', documentType)
    .neq('file_name', excludeFileName);

  if (!candidates?.length) return null;

  for (const candidate of candidates) {
    const ra = (candidate.raw_analysis as Record<string, unknown>) ?? {};
    const allMatch = matchFields.every(f => {
      const a = String(rawMetadata[f] ?? '').toLowerCase().trim();
      const b = String(ra[f] ?? '').toLowerCase().trim();
      return a && b && a === b;
    });
    if (allMatch) {
      return {
        id: candidate.id,
        file_name: candidate.file_name,
        document_type: candidate.document_type as DocumentType,
      };
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  try {
    const { filename, mimeType: clientMimeType, fileHash, originalFilename } = req.body as {
      filename: string; mimeType?: string; fileHash?: string; originalFilename?: string;
    };
    if (!filename) {
      return res.status(400).json({ error: 'Missing filename' });
    }

    // 1. Download file from Supabase Storage
    const storagePath = `${userId}/${filename}`;
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadFile('documents', storagePath);
    } catch (err) {
      return res.status(422).json({ error: 'Could not read file from storage', details: String(err) });
    }
    if (!fileBuffer?.length) {
      return res.status(422).json({ error: 'File buffer is empty' });
    }

    // 2. Extract text — Gemini OCR for images, pdf-parse for PDFs
    let text: string;
    const ext = getExt(filename);
    // Prefer the MIME type reported by the browser (handles iOS HEIC→JPEG conversion
    // where the filename keeps .heic but the content is actually JPEG)
    const isImage = IMAGE_EXTENSIONS.has(ext) || (clientMimeType && clientMimeType.startsWith('image/'));
    if (isImage) {
      const mimeType = (clientMimeType && clientMimeType.startsWith('image/')) ? clientMimeType : (MIME_MAP[ext] ?? 'image/jpeg');
      try {
        text = await ocrImage(fileBuffer, mimeType);
      } catch (err) {
        console.error('Gemini OCR failed:', err);
        return res.status(422).json({ error: 'Image OCR failed', details: String(err) });
      }
      if (!text) {
        // No text found — describe the image visually and save as media
        const mediaSummaries = await describeImage(fileBuffer, mimeType);

        const { data: mediaData } = await supabaseAdmin
          .from('documents')
          .upsert([{
            file_name: filename, owner_id: userId,
            document_type: 'other',
            summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
            raw_analysis: { is_media: true },
            ...(fileHash ? { file_hash: fileHash } : {}),
            ...(originalFilename ? { original_filename: originalFilename } : {}),
          }], { onConflict: 'file_name,owner_id' })
          .select();
        return res.status(200).json({
          success: true, filename,
          summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
          document_group: 'Other', document_type: 'other',
          raw_metadata: { is_media: true },
          supabaseId: mediaData?.[0]?.id ?? null,
          is_media: true,
          semanticMatch: null,
        });
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
          text = await ocrPdfFallback(fileBuffer);
        } catch (err) {
          console.error('Gemini PDF OCR failed:', err);
          return res.status(422).json({ error: 'Could not extract text from PDF (OCR fallback also failed)', details: String(err) });
        }
        if (!text) {
          return res.status(422).json({ error: 'Could not extract any text from PDF' });
        }
      }
    }

    // 3. Triage: is this a real document or a logo/photo/meme?
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
          ...(fileHash ? { file_hash: fileHash } : {}),
          ...(originalFilename ? { original_filename: originalFilename } : {}),
        }], { onConflict: 'file_name,owner_id' })
        .select();
      return res.status(200).json({
        success: true, filename,
        summary_he: mediaSummaries.he, summary_en: mediaSummaries.en,
        document_group: 'Other', document_type: 'other',
        raw_metadata: { is_media: true },
        supabaseId: mediaData?.[0]?.id ?? null,
        is_media: true,
        semanticMatch: null,
      });
    }

    // 4. Bilingual summarization
    const summaries = await summarizeDocument(text);

    // 5. Classify into one of the supported categories
    const document_group = await classifyDocument(summaries.en, text);
    const document_type = toDocumentType(document_group);

    // 6. Extract structured metadata per category
    const raw_metadata = await extractMetadata(document_type, text);

    // 7. Persist to Supabase — upsert per (file_name, owner_id) so re-uploads update in place
    const { data: supaData, error: supaError } = await supabaseAdmin
      .from('documents')
      .upsert(
        [{
          file_name: filename,
          owner_id: userId,
          document_type,
          summary_he: summaries.he,
          summary_en: summaries.en,
          raw_analysis: raw_metadata,
          ...(fileHash ? { file_hash: fileHash } : {}),
          ...(originalFilename ? { original_filename: originalFilename } : {}),
        }],
        { onConflict: 'file_name,owner_id' }
      )
      .select();

    if (supaError) {
      console.error('Supabase upsert error:', supaError);
      return res.status(500).json({ error: 'Failed to save to database', details: supaError.message });
    }

    // 8. Tier 2: Semantic duplicate check (catches duplicates with different filenames)
    const semanticMatch = await findSemanticDuplicate(userId, document_type, raw_metadata, filename);
    if (semanticMatch) {
      console.log('[dedup] Semantic match found:', semanticMatch.id, 'for new doc:', filename);
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
      semanticMatch: semanticMatch ?? null,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
