/**
 * Browser-safe Supabase client (anon key only).
 *
 * Import this in ALL client-side pages (pages/index.tsx, pages/login.tsx, etc.).
 * Never import supabase/client.ts from browser code — it creates supabaseAdmin
 * with SUPABASE_SERVICE_ROLE_KEY, which is stripped from the client bundle by
 * Next.js and resolves to an empty string, causing createClient() to throw.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
