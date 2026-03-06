import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { downloadFile } from '@/lib/services/storage';
import {
  IMAGE_EXTENSIONS, MIME_MAP, getExt,
  callGemini, ocrImage, ocrPdfFallback, describeImage,
  summarizeDocument, classifyAgainstTypes, extractStructured,
  DocumentTypeRow,
} from '@/lib/services/ai';
import type { DocumentType } from '@/lib/types';

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
  const fields = SEMANTIC_UNIQUE_FIELDS[documentType];
  if (!fields) return null;

  const matchFields = fields.filter(f => rawMetadata[f] != null && rawMetadata[f] !== '');
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
      const a = String(rawMetadata[f] ?? '').toLowerCase().trim();
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
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })

    return;
  }

  const userId = await getUserIdFromRequest(req);
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
      .select('name, matching_description, schema_definition')
      .eq('is_active', true);

    if (typesError) {
      console.error('Failed to fetch document_types:', typesError.message);
    }
    const activeTypes: DocumentTypeRow[] = (dbTypes ?? []) as DocumentTypeRow[];

    // 5. PHASE 1 — Classify against DB types
    let matchedTypeName = 'Other';
    let matchedRow: DocumentTypeRow | undefined; // הגדרה מחוץ לבלוק כדי שתהיה נגישה לשלב הבא

    if (activeTypes.length > 0) {
      matchedTypeName = await classifyAgainstTypes(text, activeTypes);
      matchedRow = activeTypes.find(t => t.name === matchedTypeName);
    }

    const document_type = nameToDocumentType(matchedTypeName);

    // 6. PHASE 2 — Structured extraction using the FULL schema
    let insights: Record<string, unknown> = {};

    const schemaFields: string[] = matchedRow?.schema_definition?.fields ?? [];
    if (schemaFields.length > 0) {
      insights = await extractStructured(text, schemaFields);
    }

    // Attach classification metadata to insights
    insights.document_type_name = matchedTypeName;

    // 7. Bilingual Zen summary
    const summaries = await summarizeDocument(text);

    // 8. Persist — write to both raw_analysis (UI compat) and insights (new column)
    const { data: supaData, error: supaError } = await supabaseAdmin
      .from('documents')
      .upsert(
        [{
          file_name: filename,
          owner_id: userId,
          document_type,
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
    const semanticMatch = await findSemanticDuplicate(userId, document_type, insights, filename);
    if (semanticMatch) {
      console.log('[dedup] Semantic match found:', semanticMatch.id, 'for new doc:', filename);
    }

    res.status(200).json({
      success: true,
      filename,
      summary_he: summaries.he,
      summary_en: summaries.en,
      document_group: matchedTypeName,
      document_type,
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
