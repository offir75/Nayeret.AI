-- Migration: Add matching_description to document_types for AI classification prompts

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS matching_description TEXT;

-- Seed descriptive hints used in the Phase-1 classification prompt
UPDATE public.document_types SET matching_description = CASE name
  WHEN 'Financial Report'  THEN 'Annual or periodic pension/savings/investment account statement, fund report, balance summary, or any multi-period financial summary from an institutional body'
  WHEN 'Bill'              THEN 'A single invoice or periodic bill requesting payment for a specific service period (utilities, phone, electricity, municipal tax, subscriptions)'
  WHEN 'Receipt'           THEN 'Proof of a completed payment or purchase transaction — a till receipt, payment confirmation, or tax invoice for a specific purchase'
  WHEN 'Insurance Policy'  THEN 'An insurance policy document, coverage certificate, renewal notice, or letter about changes to insurance premiums or management fees'
  WHEN 'Identity'          THEN 'A government-issued identity document: ID card, passport, driver licence, or similar document containing personal identification details'
  ELSE NULL
END
WHERE name IN ('Financial Report','Bill','Receipt','Insurance Policy','Identity');
