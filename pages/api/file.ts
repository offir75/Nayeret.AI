import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromToken } from '@/lib/services/auth';
import { createSignedUrl } from '@/lib/services/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  // Token passed as query param so <iframe> can load it without custom headers
  const token = req.query.t as string;
  const id    = req.query.id as string;
  if (!token || !id) return res.status(400).json({ error: 'Missing id or t' });

  const userId = await getUserIdFromToken(token);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Verify ownership + get file_name
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('file_name, owner_id')
    .eq('id', id)
    .single();

  if (docError || !doc || doc.owner_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Create a short-lived signed URL from Supabase Storage
  const storagePath = `${doc.owner_id}/${doc.file_name}`;
  try {
    const signedUrl = await createSignedUrl('documents', storagePath, 3600);
    return res.redirect(302, signedUrl);
  } catch {
    return res.status(404).json({ error: 'File not found in storage' });
  }
}
