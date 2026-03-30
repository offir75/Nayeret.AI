import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/supabase/browser';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { CaptureWizard, type CaptureResult, type DocResultCard } from '@/components/capture/CaptureWizard';
import {
  uploadFileApi, analyzeFileApi, saveThumbnailApi,
} from '@/lib/services/documents';
import {
  sanitizeFilename, normalizeImageFile, readFileAsBase64,
  computeFileHash, renderImageThumbnail, renderPdfThumbnail,
} from '@/lib/vault/helpers';

/** Extract a number from the raw_metadata map, trying multiple keys. */
function pickMeta(meta: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!meta) return null;
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Extract a string from the raw_metadata map, trying multiple keys. */
function pickMetaStr(meta: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

export default function CapturePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Guard against double-submission (e.g. double-tap on "Back to My Docs")
  const submittedRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<DocResultCard[]>([]);
  const [pendingQueue, setPendingQueue] = useState<{ id: string; name: string }[]>([]);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const cancelledQueueIds = useRef<Set<string>>(new Set());
  const [initialFiles, setInitialFiles] = useState<string[]>([]);
  // Maps a _forceReuploadKey → async function that re-uploads with force=true
  const reuploadQueueRef = useRef<Map<string, () => Promise<void>>>(new Map());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Read pre-dropped files passed from the dashboard via sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('captureFiles');
    if (!stored) return;
    sessionStorage.removeItem('captureFiles');
    try { setInitialFiles(JSON.parse(stored) as string[]); } catch { /* ignore */ }
  }, []);

  const handleExit = useCallback(
    async (result: CaptureResult) => {
      // Hard guard — prevents duplicate calls from rapid taps
      if (submittedRef.current) return;
      submittedRef.current = true;

      const dataUrls = result.dataUrls ?? [];

      if (!session || dataUrls.length === 0) {
        void router.push('/');
        return;
      }

      setIsUploading(true);
      setUploadResults([]);
      cancelledQueueIds.current.clear();

      // Build the queue immediately so the UI shows all pending files before processing starts
      const pendingFiles = dataUrls.map((_, i) => ({
        id: crypto.randomUUID(),
        name: result.bundleName
          ? (dataUrls.length === 1 ? result.bundleName : `${result.bundleName} (${i + 1})`)
          : (dataUrls.length === 1 ? 'Document' : `Document ${i + 1}`),
      }));
      setPendingQueue(pendingFiles);

      // Refresh token once before the loop
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token ?? session.access_token;

      for (let i = 0; i < dataUrls.length; i++) {
        const pending = pendingFiles[i];

        // Skip files cancelled while a previous file was processing
        if (cancelledQueueIds.current.has(pending.id)) continue;

        // Move this file from "queued" to "active"
        setActiveFileName(pending.name);
        setPendingQueue((prev) => prev.filter((f) => f.id !== pending.id));

        try {
          const dataUrl = dataUrls[i];
          const mimeType = dataUrl.split(';')[0]?.split(':')[1] ?? 'image/jpeg';
          const isPdf = mimeType === 'application/pdf';
          const ext = isPdf ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
          const rawName = result.bundleName
            ? `${result.bundleName}_${i + 1}.${ext}`
            : `capture_${Date.now()}_${i + 1}.${ext}`;

          // 1. Convert data URL to File so helpers can operate on it
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const originalFile = new File([blob], rawName, { type: mimeType });

          // 2. Normalise (resize / re-orient / convert HEIC) for images only; pass PDFs through
          const normalised = isPdf ? originalFile : await normalizeImageFile(originalFile);
          const filename   = sanitizeFilename(normalised.name);
          const base64     = await readFileAsBase64(normalised);
          const fileHash   = await computeFileHash(normalised);

          // 3. Per-iteration fresh token (long multi-page captures)
          const { data: { session: iterSession } } = await supabase.auth.getSession();
          const iterToken = iterSession?.access_token ?? token;

          // 4. Upload — with hash so the server can detect duplicates
          const uploadResult = await uploadFileApi(filename, base64, iterToken, fileHash);
          if (uploadResult.isDuplicate) {
            // Show a duplicate card instead of silently skipping
            const reuploadKey = `dup-${i}-${Date.now()}`;
            const existingDoc = uploadResult.existingDoc;
            const dupCard: DocResultCard = {
              documentType: existingDoc?.document_type ?? 'Document',
              summaryHe: null,
              summaryEn: null,
              amount: null,
              currency: 'ILS',
              provider: null,
              date: null,
              confidence: null,
              supabaseId: existingDoc?.id ?? null,
              isDuplicate: true,
              _forceReuploadKey: reuploadKey,
            };
            setUploadResults((prev) => [...prev, dupCard]);

            // Capture locals in closure so force-reupload can use them later
            const _filename = filename;
            const _base64 = base64;
            const _fileHash = fileHash;
            const _mimeType = normalised.type;
            const _originalName = originalFile.name;

            reuploadQueueRef.current.set(reuploadKey, async () => {
              // Refresh token
              const { data: { session: freshS } } = await supabase.auth.getSession();
              const freshTok = freshS?.access_token ?? token;

              let uploadSucceeded = false;
              try {
                // Force-upload: server uploads new file FIRST, then deletes old.
                // If upload fails the old doc is preserved (safe ordering).
                const forceUpload = await uploadFileApi(_filename, _base64, freshTok, _fileHash, true);
                if (!forceUpload.isDuplicate) {
                  uploadSucceeded = true;
                  // Upload succeeded + old doc deleted on server — remove the dup card
                  setUploadResults((prev) => prev.filter((c) => c._forceReuploadKey !== reuploadKey));
                  // Analyse the freshly uploaded file
                  const analysed = await analyzeFileApi(_filename, _mimeType, freshTok, _fileHash, _originalName);
                  const meta = analysed.raw_metadata;
                  const rawCurrency2 = pickMetaStr(meta, 'currency') ?? 'ILS';
                  const newCard: DocResultCard = {
                    documentType: analysed.document_type,
                    summaryHe: analysed.summary_he,
                    summaryEn: analysed.summary_en,
                    amount: pickMeta(meta, 'total_amount', 'invoice_amount', 'net_amount', 'gross_amount', 'amount'),
                    currency: rawCurrency2 === 'NIS' ? 'ILS' : rawCurrency2.toUpperCase(),
                    provider: pickMetaStr(meta, 'issuer', 'provider', 'company_name', 'bank_name'),
                    date: pickMetaStr(meta, 'issue_date', 'invoice_date', 'statement_date', 'date'),
                    confidence: pickMeta(meta, 'confidence'),
                    supabaseId: analysed.supabaseId ?? null,
                  };
                  setUploadResults((prev) => [...prev, newCard]);
                }
              } catch (err) {
                if (!uploadSucceeded) {
                  // Upload itself failed — old doc is still safe in the vault
                  toast.error('Replace failed — original document is preserved. Please try again.');
                } else {
                  // Upload succeeded (old already deleted) but analysis failed
                  toast.error('File uploaded but analysis failed. Check your vault — the document may appear after a refresh.');
                }
                console.error('[forceReupload]', err);
              }
            });
            continue;
          }

          // 5. AI analysis — with hash + original filename for richer extraction
          const analysed = await analyzeFileApi(
            filename, normalised.type, iterToken, fileHash, originalFile.name,
          );

          // 6. Build result card and stream it into SuccessView
          const meta = analysed.raw_metadata;
          const rawCurrency = pickMetaStr(meta, 'currency') ?? 'ILS';
          const card: DocResultCard = {
            documentType: analysed.document_type,
            summaryHe: analysed.summary_he,
            summaryEn: analysed.summary_en,
            amount: pickMeta(meta, 'total_amount', 'invoice_amount', 'net_amount', 'gross_amount', 'amount'),
            currency: rawCurrency === 'NIS' ? 'ILS' : rawCurrency.toUpperCase(),
            provider: pickMetaStr(meta, 'issuer', 'provider', 'company_name', 'bank_name'),
            date: pickMetaStr(meta, 'issue_date', 'invoice_date', 'statement_date', 'date'),
            confidence: pickMeta(meta, 'confidence'),
            supabaseId: analysed.supabaseId ?? null,
          };
          setUploadResults((prev) => [...prev, card]);

          // 7. Generate + save thumbnail (best-effort)
          const supabaseId = analysed.supabaseId ?? '';
          if (supabaseId) {
            try {
              const thumbBase64 = isPdf
                ? await renderPdfThumbnail(normalised)
                : await renderImageThumbnail(normalised);
              if (thumbBase64) await saveThumbnailApi(supabaseId, thumbBase64, iterToken);
            } catch {
              // thumbnail failure is non-fatal
            }
          }
        } catch (err) {
          console.error(`Failed to process captured page ${i + 1}:`, err);
        } finally {
          setActiveFileName(null);
        }
      }

      setPendingQueue([]);
      setIsUploading(false);
    },
    [session],
  );

  const handleNavigate = useCallback(() => {
    void router.push('/?docAdded=1');
  }, [router]);

  const handleCardClick = useCallback((card: DocResultCard) => {
    const url = card.supabaseId
      ? `/?docAdded=1&openDoc=${card.supabaseId}`
      : '/?docAdded=1';
    void router.push(url);
  }, [router]);

  const handleCancelQueued = useCallback((id: string) => {
    cancelledQueueIds.current.add(id);
    setPendingQueue((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleForceReupload = useCallback(async (key: string) => {
    const fn = reuploadQueueRef.current.get(key);
    if (!fn) return;
    reuploadQueueRef.current.delete(key);
    // Show the same loading state (skeleton + disabled back button) used during initial upload
    setIsUploading(true);
    try {
      await fn();
    } catch (err) {
      console.error('[forceReupload] Failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Auth not yet determined — show nothing (avoid flash)
  if (session === undefined) return null;

  // Not authenticated — redirect
  if (!session) {
    void router.replace('/login');
    return null;
  }

  return (
    <CaptureWizard
      onExit={handleExit}
      onClose={() => void router.push('/')}
      isExiting={isUploading}
      exitResults={uploadResults}
      pendingQueue={pendingQueue}
      activeFileName={activeFileName}
      onComplete={handleNavigate}
      onCardClick={handleCardClick}
      onForceReupload={handleForceReupload}
      onCancelQueued={handleCancelQueued}
      initialFiles={initialFiles.length > 0 ? initialFiles : undefined}
    />
  );
}
