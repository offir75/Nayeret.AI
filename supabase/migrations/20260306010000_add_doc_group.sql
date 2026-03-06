-- Migration: Add doc_group column to document_types for taxonomy grouping
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS doc_group TEXT;
