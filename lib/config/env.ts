/**
 * Server-side environment variable validation.
 * Call validateEnv() at startup to fail fast on missing required config.
 * Only import this in server-side code (API routes, getServerSideProps, etc.).
 */

const REQUIRED_SERVER_VARS = [
  'GEMINI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  const missing = REQUIRED_SERVER_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(', ')}. ` +
      `Check your .env.local file.`
    );
  }
  validated = true;
}
