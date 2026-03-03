import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for public/authenticated operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for server-side operations (use sparingly)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export type Document = {
  id: string;
  file_name: string;
  document_type: 'bill' | 'financial_report' | 'receipt' | 'other';
  provider: string | null;
  amount: number | null;
  currency: string | null; // 'ILS', 'USD', etc.
  due_date: string | null; // ISO format YYYY-MM-DD
  issue_date: string | null; // ISO format YYYY-MM-DD
  insights: {
    document_type: string;
    detected_fields: Record<string, any>;
    summary_hebrew: string;
  } | null;
  created_at: string;
  updated_at: string;
};
