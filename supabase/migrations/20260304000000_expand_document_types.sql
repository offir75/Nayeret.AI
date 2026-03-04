-- Migration: Expand document_types table + widen documents.document_type CHECK constraint
-- Run once in: Supabase Dashboard → SQL Editor.

-- 1. Add is_active and is_tax_deductible columns to the document_types lookup table
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN NOT NULL DEFAULT false;

-- 2. Populate the 5 persona categories (idempotent via ON CONFLICT)
INSERT INTO public.document_types (name, schema_definition, is_active, is_tax_deductible) VALUES
  ('Financial Report', '{"fields":["total_balance","liquidity_date","management_fee","employer_name"]}'::jsonb,               true, false),
  ('Bill',             '{"fields":["provider","total_amount","currency","due_date","is_automatic_payment"]}'::jsonb,          true, false),
  ('Receipt',          '{"fields":["merchant","total_amount","currency","purchase_date"]}'::jsonb,                             true, false),
  ('Insurance Policy', '{"fields":["insurer","policy_number","premium_amount","coverage_type","expiry_date"]}'::jsonb,        true, true),
  ('Identity',         '{"fields":["id_type","full_name","id_number","issue_date","expiry_date","issuing_authority"]}'::jsonb, true, false)
ON CONFLICT (name) DO UPDATE
  SET is_active          = EXCLUDED.is_active,
      is_tax_deductible  = EXCLUDED.is_tax_deductible,
      schema_definition  = EXCLUDED.schema_definition;

-- 3. Widen the documents.document_type CHECK constraint to include new types
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN ('bill','financial_report','receipt','claim','insurance','identification','other'));
