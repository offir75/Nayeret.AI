// BROWSER-ONLY MODULE — do not import from API routes

import type { VaultDoc, Currency } from '@/lib/types';

// ─── Supported file types ─────────────────────────────────────────────────────

export const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.heic', '.heif'];

export function isSupportedFile(name: string): boolean {
  return SUPPORTED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

// ─── Filename sanitization + resolution ──────────────────────────────────────

/**
 * Strip non-ASCII and storage-unsafe characters so the name is safe as a
 * Supabase Storage key.  The caller should store the original name separately.
 */
export function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext  = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const base = dot > 0 ? name.slice(0, dot) : name;
  const safe = base
    .replace(/[^\x21-\x7E]/g, '_')   // non-printable / non-ASCII → _
    .replace(/[/\\?%*:|"<>]/g, '_')  // storage-unsafe chars → _
    .replace(/\s+/g, '_')            // spaces → _
    .replace(/_+/g, '_')             // collapse runs
    .replace(/^_+|_+$/g, '')         // trim leading/trailing _
    || `doc_${Date.now().toString(36)}`; // fallback when entire base was non-ASCII
  return safe + ext;
}

export function resolveFilename(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext  = dot > 0 ? name.slice(dot) : '';
  return `${base}_${Date.now()}${ext}`;
}

// ─── File reading ─────────────────────────────────────────────────────────────

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString().split(',')[1];
      if (result) resolve(result);
      else reject(new Error('Could not read file'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

export const USD_TO_ILS = 3.70;

export function convertAmount(amount: number, fromCurr: string, toCurr: Currency): number {
  const f = fromCurr.toUpperCase();
  if (f === toCurr) return amount;
  if (toCurr === 'USD') return amount / USD_TO_ILS;
  return amount * USD_TO_ILS;
}

export function fmtMoney(n: number, symbol: string): string {
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getDueAlert(dateStr: unknown, alertDays: number): 'overdue' | 'due-soon' | null {
  if (typeof dateStr !== 'string' || !dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.floor((date.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= alertDays) return 'due-soon';
  return null;
}

export function isLiquid(doc: VaultDoc): boolean {
  if (doc.document_type !== 'financial_report') return false;
  const d = doc.raw_analysis?.liquidity_date;
  if (typeof d !== 'string' || !d) return false;
  const date = new Date(d);
  return !isNaN(date.getTime()) && date <= new Date();
}

// ─── File hash (SHA-256, browser only) ───────────────────────────────────────

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Sensitive-key list (Privacy Mode) ───────────────────────────────────────

export const SENSITIVE_KEYS = new Set([
  'total_amount', 'total_balance', 'management_fee', 'premium_amount',
]);

// ─── Thumbnail generation helpers (client-side only) ─────────────────────────

export async function normalizeImageFile(file: File): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isHeic = ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';
  const MAX_SIDE = 4000;
  const needsConvert = isHeic;
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      if (!needsConvert && scale === 1) { URL.revokeObjectURL(url); resolve(file); return; }
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        resolve(new File([blob], newName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export async function renderPdfThumbnail(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const scale = 200 / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export async function renderImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(200 / img.width, 200 / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
