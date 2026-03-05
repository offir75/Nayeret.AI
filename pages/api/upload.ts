import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { MIME_MAP, ensureBucket, uploadFile } from '@/lib/services/storage';

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
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
    const buffer = Buffer.from(file, 'base64');

    // Ensure the documents bucket exists (idempotent)
    await ensureBucket('documents', false);

    // Upload to Supabase Storage: documents/{userId}/{filename}
    const storagePath = `${userId}/${filename}`;
    await uploadFile('documents', storagePath, buffer, mimeType);

    return res.status(200).json({ success: true, message: `File ${filename} uploaded successfully` });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
