import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabase/client';
import { getUserIdFromRequest } from '@/lib/services/auth';
import { deleteFile } from '@/lib/services/storage';
import { UI_CATEGORIES } from '@/nayeret_ai_schema_registry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized — please sign in' })

    return;
  }

  // GET /api/documents — return the signed-in user's documents, newest first
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, original_filename, document_type, ui_category, summary_he, summary_en, raw_analysis, insights, thumbnail_url, created_at, user_notes')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch documents', details: error.message })

      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ documents: data ?? [] })

    return;
  }

  // DELETE /api/documents — remove a document by id (must belong to the caller)
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) { res.status(400).json({ error: 'Missing document id' }); return; }

    // Fetch the document — verifies both existence and ownership in one query
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('file_name, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      res.status(404).json({ error: 'Document not found' })

      return;
    }
    if (doc.owner_id !== userId) {
      res.status(403).json({ error: 'Forbidden' })

      return;
    }

    // Delete from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      res.status(500).json({ error: 'Failed to delete document', details: deleteError.message })

      return;
    }

    // Remove the file from Supabase Storage (best-effort, don't fail if missing)
    await deleteFile('documents', `${doc.owner_id}/${doc.file_name}`);

    // Remove thumbnail from Supabase Storage (best-effort)
    await deleteFile('thumbnails', `${doc.owner_id}/${id}.jpg`);

    res.status(200).json({ success: true })


    return;
  }

  // PATCH /api/documents — update user-editable fields on a document
  if (req.method === 'PATCH') {
    const { id, user_notes, document_type, raw_analysis: rawPatch, ui_category } = req.body as {
      id: string;
      user_notes?: string;
      document_type?: string;
      ui_category?: string;
      raw_analysis?: Record<string, unknown>;
    };
    if (typeof id !== 'string' || !id.trim()) {
      res.status(400).json({ error: 'Missing or invalid document id' });
      return;
    }
    if (user_notes !== undefined && (typeof user_notes !== 'string' || user_notes.length > 10_000)) {
      res.status(400).json({ error: 'user_notes must be a string under 10,000 characters' });
      return;
    }
    if (document_type !== undefined && typeof document_type !== 'string') {
      res.status(400).json({ error: 'document_type must be a string' });
      return;
    }
    if (ui_category !== undefined && !(UI_CATEGORIES as readonly string[]).includes(ui_category)) {
      res.status(400).json({ error: `ui_category must be one of: ${UI_CATEGORIES.join(', ')}` });
      return;
    }
    if (rawPatch !== undefined && (typeof rawPatch !== 'object' || Array.isArray(rawPatch) || rawPatch === null)) {
      res.status(400).json({ error: 'raw_analysis must be a plain object' });
      return;
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('owner_id, raw_analysis')
      .eq('id', id)
      .single();

    if (fetchError || !existing) { res.status(404).json({ error: 'Document not found' }); return; }
    if (existing.owner_id !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const patch: Record<string, unknown> = {};
    if (user_notes !== undefined) patch.user_notes = user_notes;
    if (document_type !== undefined) patch.document_type = document_type;
    if (ui_category !== undefined) patch.ui_category = ui_category;
    if (rawPatch !== undefined) {
      const existingAnalysis = typeof existing.raw_analysis === 'object' && existing.raw_analysis !== null
        ? (existing.raw_analysis as Record<string, unknown>)
        : {};
      patch.raw_analysis = { ...existingAnalysis, ...rawPatch };
      patch.insights = patch.raw_analysis;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update(patch)
      .eq('id', id)
      .select('id, file_name, original_filename, document_type, ui_category, summary_he, summary_en, raw_analysis, insights, thumbnail_url, created_at, user_notes')
      .single();

    if (updateError) { res.status(500).json({ error: 'Update failed', details: updateError.message }); return; }
    res.status(200).json({ document: updated })

    return;
  }

  res.status(405).json({ error: 'Method not allowed' })


  return;
}
