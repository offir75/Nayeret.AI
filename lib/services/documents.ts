import type { VaultDoc, AnalyzeApiResponse } from '@/lib/types';

async function apiFetch(url: string, options: RequestInit, token: string): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

export async function fetchDocuments(accessToken: string): Promise<VaultDoc[]> {
  const res = await apiFetch('/api/documents', { method: 'GET' }, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Failed to fetch documents');
  }
  const data = await res.json() as { documents: VaultDoc[] };
  return data.documents;
}

export async function deleteDocument(id: string, accessToken: string): Promise<void> {
  const res = await apiFetch('/api/documents', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  }, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Failed to delete document');
  }
}

export async function uploadFileApi(
  filename: string,
  base64: string,
  accessToken: string,
  fileHash?: string,
  force?: boolean,
): Promise<import('@/lib/types').UploadApiResponse> {
  const res = await apiFetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ file: base64, filename, fileHash, force }),
  }, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json() as Promise<import('@/lib/types').UploadApiResponse>;
}

export async function analyzeFileApi(filename: string, mimeType: string, accessToken: string, fileHash?: string): Promise<AnalyzeApiResponse> {
  const res = await apiFetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ filename, mimeType, fileHash }),
  }, accessToken);
  const data = await res.json() as AnalyzeApiResponse & { error?: string };
  if (!res.ok || !data.success) throw new Error(data.error ?? 'Analysis failed');
  return data;
}

export async function updateDocument(
  id: string,
  patch: { user_notes?: string; document_type?: string; raw_analysis?: Record<string, unknown>; summary_he?: string; summary_en?: string },
  accessToken: string,
): Promise<import('@/lib/types').VaultDoc> {
  const res = await apiFetch('/api/documents', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...patch }),
  }, accessToken);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Update failed');
  }
  const data = await res.json() as { document: import('@/lib/types').VaultDoc };
  return data.document;
}

export async function saveThumbnailApi(documentId: string, thumbnailBase64: string, accessToken: string): Promise<string> {
  const res = await apiFetch('/api/thumbnail', {
    method: 'POST',
    body: JSON.stringify({ documentId, thumbnailBase64 }),
  }, accessToken);
  if (!res.ok) return '';
  const data = await res.json() as { thumbnailUrl?: string };
  return data.thumbnailUrl ?? '';
}
