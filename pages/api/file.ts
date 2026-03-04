import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';

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

  // Create a short-lived signed URL from Supabase Storage
  const storagePath = `${doc.owner_id}/${doc.file_name}`;
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);

  if (signedError || !signedData) {
    return res.status(404).json({ error: 'File not found in storage' });
  }

  return res.redirect(302, signedData.signedUrl);
}
