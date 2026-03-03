-- Migration: Add bilingual summary columns
-- Splits the single `summary` TEXT column into `summary_he` (Hebrew) and `summary_en` (English)

-- 1. Add the two new columns
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS summary_he TEXT,
  ADD COLUMN IF NOT EXISTS summary_en TEXT;

-- 2. Migrate existing data: treat current `summary` as Hebrew
UPDATE documents SET summary_he = summary WHERE summary IS NOT NULL;

-- 3. Drop the old column (it has been superseded by summary_he / summary_en)
ALTER TABLE documents DROP COLUMN IF EXISTS summary;
