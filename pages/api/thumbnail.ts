import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

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

  const userId = await getUserId(req);
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
  const { error: bucketError } = await supabaseAdmin.storage
    .createBucket('thumbnails', { public: true });
  if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) {
    console.error('Bucket creation error:', bucketError);
    return res.status(500).json({ error: 'Storage setup failed', details: bucketError.message });
  }

  // Convert base64 to buffer (strip data URL prefix if present)
  const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Upload: thumbnails/{userId}/{documentId}.jpg
  const storagePath = `${userId}/${documentId}.jpg`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('thumbnails')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return res.status(500).json({ error: 'Failed to upload thumbnail', details: uploadError.message });
  }

  // Get the public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('thumbnails')
    .getPublicUrl(storagePath);

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
