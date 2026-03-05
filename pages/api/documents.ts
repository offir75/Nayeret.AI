import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { deleteFile } from '@/lib/services/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }

  // GET /api/documents — return the signed-in user's documents, newest first
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, document_type, summary_he, summary_en, raw_analysis, thumbnail_url, created_at, user_notes')
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

    // Remove the file from Supabase Storage (best-effort, don't fail if missing)
    await deleteFile('documents', `${doc.owner_id}/${doc.file_name}`);

    // Remove thumbnail from Supabase Storage (best-effort)
    await deleteFile('thumbnails', `${doc.owner_id}/${id}.jpg`);

    return res.status(200).json({ success: true });
  }

  // PATCH /api/documents — update user-editable fields on a document
  if (req.method === 'PATCH') {
    const { id, user_notes, document_type, raw_analysis: rawPatch } = req.body as {
      id: string;
      user_notes?: string;
      document_type?: string;
      raw_analysis?: Record<string, unknown>;
    };
    if (!id) return res.status(400).json({ error: 'Missing document id' });

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('owner_id, raw_analysis')
      .eq('id', id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Document not found' });
    if (existing.owner_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const patch: Record<string, unknown> = {};
    if (user_notes !== undefined) patch.user_notes = user_notes;
    if (document_type !== undefined) patch.document_type = document_type;
    if (rawPatch !== undefined) {
      patch.raw_analysis = { ...(existing.raw_analysis as Record<string, unknown> ?? {}), ...rawPatch };
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(patch)
      .eq('id', id)
      .select('id, file_name, document_type, summary_he, summary_en, raw_analysis, thumbnail_url, created_at, user_notes')
      .single();

    if (updateError) return res.status(500).json({ error: 'Update failed', details: updateError.message });
    return res.status(200).json({ document: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
