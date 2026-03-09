import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/supabase/browser';
import type { Session } from '@supabase/supabase-js';
import { CaptureWizard, type CaptureResult } from '@/components/capture/CaptureWizard';
import { uploadFileApi, analyzeFileApi } from '@/lib/services/documents';
import { sanitizeFilename } from '@/lib/vault/helpers';

export default function CapturePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleExit = useCallback(
    (result: CaptureResult) => {
      const dataUrls = result.dataUrls ?? [];

      if (session && dataUrls.length > 0) {
        const token = session.access_token;

        // Fire uploads in the background; user is returned to dashboard immediately
        dataUrls.forEach(async (dataUrl, i) => {
          try {
            const base64 = dataUrl.split(',')[1] ?? '';
            const mimeType = dataUrl.split(';')[0]?.split(':')[1] ?? 'image/jpeg';
            const ext = mimeType.includes('png') ? 'png' : 'jpg';
            const name = result.bundleName
              ? `${result.bundleName}_${i + 1}.${ext}`
              : `capture_${Date.now()}_${i + 1}.${ext}`;
            const filename = sanitizeFilename(name);
            await uploadFileApi(filename, base64, token);
            await analyzeFileApi(filename, mimeType, token);
          } catch (err) {
            console.error(`Failed to process captured page ${i + 1}:`, err);
          }
        });
      }

      void router.push(dataUrls.length > 0 ? '/?docAdded=1' : '/');
    },
    [session, router],
  );

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
    />
  );
}
