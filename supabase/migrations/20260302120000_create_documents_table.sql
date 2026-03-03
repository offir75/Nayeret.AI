-- Create documents table for LifeVault Personal DMC
-- Supports Hebrew and English text with full UTF-8 encoding
-- Stores bill, financial report, and receipt metadata with AI-generated insights

CREATE TABLE IF NOT EXISTS documents (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File reference matching uploads folder
  file_name TEXT NOT NULL,

  -- Document classification
  document_type TEXT NOT NULL CHECK (document_type IN ('bill', 'financial_report', 'receipt', 'other')),

  -- Provider/Entity name (supports Hebrew and English)
  provider TEXT,

  -- Monetary amount (using NUMERIC for precise decimal currency values)
  amount NUMERIC(12, 2),

  -- ISO 4217 currency code (e.g., 'ILS', 'USD', 'EUR')
  currency TEXT CHECK (currency ~ '^[A-Z]{3}$' OR currency IS NULL),

  -- Payment/Financial due date (ISO format)
  due_date DATE,

  -- Document issue/creation date (ISO format)
  issue_date DATE,

  -- Full Gemini API response stored as JSONB for flexible querying
  -- Includes detected_fields, document_type classification, and summary_hebrew
  insights JSONB,

  -- Timestamps for audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_provider ON documents(provider);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_due_date ON documents(due_date);
CREATE UNIQUE INDEX idx_documents_file_name ON documents(file_name);

-- Create JSONB index for efficient insights searching
CREATE INDEX idx_documents_insights_gin ON documents USING GIN (insights);

-- Enable UTF-8 at table level (implicit in PostgreSQL 12+, but explicit for clarity)
-- All text columns (file_name, provider, currency, document_type) support full UTF-8
ALTER TABLE documents SET (
  toast_tuple_target = 128
);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_documents_updated_at();

-- Add RLS policies (adjust based on your auth model)
-- Note: Uncomment and customize if using Supabase Auth
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Documents are visible to authenticated users"
-- ON documents FOR SELECT
-- USING (auth.role() = 'authenticated');
