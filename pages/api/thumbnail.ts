import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { ensureBucket, uploadFile, getPublicUrl } from '@/lib/services/storage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  const { documentId, thumbnailBase64 } = req.body as {
    documentId?: string;
    thumbnailBase64?: string;
  };

  if (!documentId || !thumbnailBase64) {
    return res.status(400).json({ error: 'Missing documentId or thumbnailBase64' });
  }

  // Verify the document belongs to this user
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, owner_id')
    .eq('id', documentId)
    .single();

  if (docError || !doc || doc.owner_id !== userId) {
    return res.status(403).json({ error: 'Document not found or access denied' });
  }

  // Ensure the thumbnails bucket exists (idempotent)
  try {
    await ensureBucket('thumbnails', true);
  } catch (bucketErr) {
    console.error('Bucket creation error:', bucketErr);
    return res.status(500).json({ error: 'Storage setup failed', details: String(bucketErr) });
  }

  // Convert base64 to buffer (strip data URL prefix if present)
  const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Upload: thumbnails/{userId}/{documentId}.jpg
  const storagePath = `${userId}/${documentId}.jpg`;
  try {
    await uploadFile('thumbnails', storagePath, buffer, 'image/jpeg');
  } catch (uploadErr) {
    console.error('Storage upload error:', uploadErr);
    return res.status(500).json({ error: 'Failed to upload thumbnail', details: String(uploadErr) });
  }

  // Get the public URL
  const publicUrl = getPublicUrl('thumbnails', storagePath);

  // Persist the URL on the document row
  const { error: updateError } = await supabaseAdmin
    .from('documents')
    .update({ thumbnail_url: publicUrl })
    .eq('id', documentId);

  if (updateError) {
    console.error('DB update error:', updateError);
    return res.status(500).json({ error: 'Failed to save thumbnail URL', details: updateError.message });
  }

  return res.status(200).json({ success: true, thumbnailUrl: publicUrl });
}
