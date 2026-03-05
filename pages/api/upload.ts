import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { MIME_MAP, ensureBucket, uploadFile, deleteFile } from '@/lib/services/storage';
import { supabaseAdmin } from '@/supabase/client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  try {
    const { file, filename, fileHash, force } = req.body as {
      file: string;
      filename: string;
      fileHash?: string;
      force?: boolean;
    };

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    // ── Tier 1: Byte-level duplicate check ──────────────────────────────────────────
    if (!fileHash) console.warn('[dedup] No fileHash provided for:', filename);
    if (fileHash && !force) {
      const { data: existing } = await supabaseAdmin
        .from('documents')
        .select('id, file_name, document_type, thumbnail_url')
        .eq('owner_id', userId)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existing) {
        console.log('[dedup] Duplicate detected for hash:', fileHash, '| owner:', userId, '| existing doc id:', existing.id, '| file:', existing.file_name);
        return res.status(200).json({
          isDuplicate: true,
          existingDoc: {
            id: existing.id,
            file_name: existing.file_name,
            document_type: existing.document_type,
            thumbnail_url: existing.thumbnail_url ?? null,
          },
        });
      }
    }

    // ── If force=true, delete the old document with the same hash ─────────────────────
    if (fileHash && force) {
      const { data: oldDoc } = await supabaseAdmin
        .from('documents')
        .select('id, file_name, owner_id')
        .eq('owner_id', userId)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (oldDoc) {
        await supabaseAdmin.from('documents').delete().eq('id', oldDoc.id);
        await deleteFile('documents', `${userId}/${oldDoc.file_name}`);
        await deleteFile('thumbnails', `${userId}/${oldDoc.id}.jpg`);
      }
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
    const buffer = Buffer.from(file, 'base64');

    // Ensure the documents bucket exists (idempotent)
    await ensureBucket('documents', false);

    // Upload to Supabase Storage: documents/{userId}/{filename}
    const storagePath = `${userId}/${filename}`;
    await uploadFile('documents', storagePath, buffer, mimeType);

    return res.status(200).json({ isDuplicate: false, success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
