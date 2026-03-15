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
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized — please sign in' });
    return;
  }

  try {
    const { file, filename, fileHash, force } = req.body as {
      file: string;
      filename: string;
      fileHash?: string;
      force?: boolean;
    };

    if (typeof file !== 'string' || !file) {
      res.status(400).json({ error: 'Missing or invalid file data' });
      return;
    }
    if (typeof filename !== 'string' || !filename.trim()) {
      res.status(400).json({ error: 'Missing or invalid filename' });
      return;
    }
    if (filename.length > 500) {
      res.status(400).json({ error: 'Filename too long' });
      return;
    }
    if (fileHash !== undefined && typeof fileHash !== 'string') {
      res.status(400).json({ error: 'Invalid fileHash' });
      return;
    }
    const forceFlag = force === true;

    // ── Tier 1: Byte-level duplicate check ──────────────────────────────────────────
    if (!fileHash) console.warn('[dedup] No fileHash provided for:', filename);
    if (fileHash && !forceFlag) {
      const { data: existing } = await supabaseAdmin
        .from('documents')
        .select('id, file_name, document_type, thumbnail_url')
        .eq('owner_id', userId)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existing) {
        console.log('[dedup] Duplicate detected | existing doc id:', existing.id, '| file:', existing.file_name);
        res.status(200).json({
          isDuplicate: true,
          existingDoc: {
            id: existing.id,
            file_name: existing.file_name,
            document_type: existing.document_type,
            thumbnail_url: existing.thumbnail_url ?? null,
          },
        });
        return;
      }
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
    const buffer = Buffer.from(file, 'base64');

    // Ensure the documents bucket exists (idempotent)
    await ensureBucket('documents', false);

    // Upload new file to storage FIRST — so the old doc is only removed after
    // the new file is safely stored.  If this upload fails the old doc is preserved.
    const storagePath = `${userId}/${filename}`;
    await uploadFile('documents', storagePath, buffer, mimeType);

    // ── If force=true, NOW delete the old document (upload already succeeded) ──
    if (fileHash && forceFlag) {
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

    res.status(200).json({ isDuplicate: false, success: true });
    return;
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
}
