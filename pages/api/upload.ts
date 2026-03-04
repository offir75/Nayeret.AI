import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  bmp:  'image/bmp',
};

async function getUserId(req: NextApiRequest): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  try {
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
    const buffer = Buffer.from(file, 'base64');

    // Ensure the documents bucket exists (idempotent)
    const { error: bucketError } = await supabaseAdmin.storage
      .createBucket('documents', { public: false });
    if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) {
      return res.status(500).json({ error: 'Storage setup failed', details: bucketError.message });
    }

    // Upload to Supabase Storage: documents/{userId}/{filename}
    const storagePath = `${userId}/${filename}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      return res.status(500).json({ error: 'Failed to upload file', details: uploadError.message });
    }

    return res.status(200).json({ success: true, message: `File ${filename} uploaded successfully` });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
