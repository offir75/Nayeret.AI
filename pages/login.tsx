import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already logged in, skip straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });

    // Show error from failed callback redirect
    if (router.query.error === 'callback_failed') {
      setError('Sign-in failed. Please try again.');
    }
  }, [router.isReady]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <>
    <Head><title>Nayeret.AI</title></Head>
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-3xl mb-4 shadow-md glow-primary">
            ✦
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Nayeret</span><span className="text-primary">.AI</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered document manager</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">Sign in to your vault</h2>
            <p className="text-xs text-muted-foreground mt-1">Your documents are private and secure.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground bg-card hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-border border-t-foreground/60 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to keep your data private and awesome.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">Nayeret.AI · Built with Next.js + Supabase</p>
      </div>
    </div>
    </>
  );
}
