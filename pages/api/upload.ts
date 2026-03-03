import { NextApiRequest, NextApiResponse } from 'next';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

  try {
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    // Ensure the uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save the file
    const filepath = join(uploadsDir, filename);
    const buffer = Buffer.from(file, 'base64');
    await writeFile(filepath, buffer);

    return res.status(200).json({
      success: true,
      message: `File ${filename} uploaded successfully`,
      filepath: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
