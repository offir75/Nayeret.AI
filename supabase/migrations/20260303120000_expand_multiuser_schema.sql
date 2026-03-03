-- Migration: Expand schema for multi-user and dynamic taxonomy
-- Supports Hebrew and English (UTF-8) and adds row-level security policies

-- 1. Profiles table linking to Supabase Auth users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT CHECK (role IN ('admin','user','guest')) DEFAULT 'user',
  created_at timestamptz DEFAULT current_timestamp
);

-- 2. Spaces table (shared document containers)
CREATE TABLE IF NOT EXISTS spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at timestamptz DEFAULT current_timestamp
);

-- 3. Space members (links profiles to spaces with roles)
CREATE TABLE IF NOT EXISTS space_members (
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner','editor','viewer')) NOT NULL,
  joined_at timestamptz DEFAULT current_timestamp,
  PRIMARY KEY (space_id, profile_id)
);

-- 4. Document types taxonomy table
CREATE TABLE IF NOT EXISTS document_types (
  id serial PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  schema_definition JSONB NOT NULL,
  created_at timestamptz DEFAULT current_timestamp
);

-- 5. Alter existing documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_analysis JSONB,
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- ensure UTF-8
ALTER TABLE profiles ALTER COLUMN display_name SET DATA TYPE TEXT;
ALTER TABLE spaces ALTER COLUMN name SET DATA TYPE TEXT;
ALTER TABLE spaces ALTER COLUMN description SET DATA TYPE TEXT;
ALTER TABLE document_types ALTER COLUMN name SET DATA TYPE TEXT;

-- RLS policies for spaces and documents
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Space members can access space" ON spaces
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = spaces.id
        AND space_members.profile_id = auth.uid()
    )
  );

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs in user spaces" ON documents
  USING (
    space_id IS NULL OR
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = documents.space_id
        AND space_members.profile_id = auth.uid()
    )
  );

-- optionally limit updates to owners/editors
CREATE POLICY "Docs can be modified by owner or editor" ON documents
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = documents.space_id
        AND space_members.profile_id = auth.uid()
        AND space_members.role IN ('owner','editor')
    )
  );

-- allow inserts for authenticated users into spaces they belong to
CREATE POLICY "Insert docs by space members" ON documents
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = documents.space_id
        AND space_members.profile_id = auth.uid()
    )
  );

-- enable RLS on profiles so users can only see own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self profile access" ON profiles
  USING (id = auth.uid());

-- spaces table additional indexes
CREATE INDEX IF NOT EXISTS idx_spaces_name ON spaces(name);
CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);

-- notes: adapt the policies as your auth model evolves

