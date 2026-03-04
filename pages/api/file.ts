import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseAdmin } from '@/supabase/client';

const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  bmp:  'image/bmp',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  // Token passed as query param so <iframe> can load it without custom headers
  const token = req.query.t as string;
  const id    = req.query.id as string;
  if (!token || !id) return res.status(400).json({ error: 'Missing id or t' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Verify ownership + get file_name
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('file_name, owner_id')
    .eq('id', id)
    .single();

  if (docError || !doc || doc.owner_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const ext      = doc.file_name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
  const filePath = join(process.cwd(), 'uploads', doc.file_name);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(fileBuffer);
}
