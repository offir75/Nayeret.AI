import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/supabase/browser';

/**
 * OAuth Callback Page
 *
 * Supabase redirects here after the Google OAuth flow completes.
 * The URL contains a `code` query parameter (PKCE flow).
 * We exchange it for a session, then redirect to the dashboard.
 *
 * The profile row is auto-created by the `handle_new_user` DB trigger —
 * no manual upsert needed here.
 *
 * Setup reminder (one-time, in Supabase Dashboard):
 *   Authentication → URL Configuration → Redirect URLs
 *   Add: http://localhost:3000/auth/callback
 *   Add your production URL too when deploying.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // router.isReady ensures query params are populated in the pages router
    if (!router.isReady) return;

    const exchange = async () => {
      const code = router.query.code as string | undefined;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[AuthCallback] exchangeCodeForSession error:', error.message);
          router.replace('/login?error=callback_failed');
          return;
        }
      }

      // Session is now stored in localStorage by the Supabase client.
      // Redirect to the dashboard.
      router.replace('/');
    };

    exchange();
  }, [router.isReady]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
