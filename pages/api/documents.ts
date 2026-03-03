import { NextApiRequest, NextApiResponse } from 'next';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { supabaseAdmin } from '@/supabase/client';

/** Extract and validate the caller's user ID from the Authorization header. */
async function getUserId(req: NextApiRequest): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  // GET /api/documents — return the signed-in user's documents, newest first
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, document_type, summary_he, summary_en, raw_analysis, thumbnail_url, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
    }
    return res.status(200).json({ documents: data ?? [] });
  }

  // DELETE /api/documents — remove a document by id (must belong to the caller)
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing document id' });

    // Fetch the document — verifies both existence and ownership in one query
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('file_name, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.owner_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete document', details: deleteError.message });
    }

    // Remove the file from uploads/ (best-effort, don't fail if missing)
    const filePath = join(process.cwd(), 'uploads', doc.file_name);
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => null);
    }

    // Remove thumbnail from Supabase Storage (best-effort)
    await supabaseAdmin.storage
      .from('thumbnails')
      .remove([`${doc.owner_id}/${id}.jpg`])
      .catch(() => null);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
