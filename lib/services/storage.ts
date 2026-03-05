import { supabaseAdmin } from '@/supabase/client';

export async function ensureBucket(bucketName: string, isPublic: boolean): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(bucketName, { public: isPublic });
  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw new Error(`Storage setup failed: ${error.message}`);
  }
}

export async function uploadFile(
  bucket: string,
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

export async function downloadFile(bucket: string, storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(storagePath);
  if (error || !data) throw new Error(`Download failed: ${error?.message ?? 'no data'}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteFile(bucket: string, storagePath: string): Promise<void> {
  await supabaseAdmin.storage.from(bucket).remove([storagePath]).catch(() => null);
}

export async function createSignedUrl(
  bucket: string,
  storagePath: string,
  expiresIn: number,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? 'no data'}`);
  return data.signedUrl;
}

export function getPublicUrl(bucket: string, storagePath: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  bmp:  'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
};
