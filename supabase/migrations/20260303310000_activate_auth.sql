-- Migration: Activate Supabase Auth with Google OAuth
-- Extends profiles, creates per-user document ownership, hardens RLS.

-- ─── 1. Extend profiles with email + avatar ───────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─── 2. INSERT policy for profiles ───────────────────────────────────────────
-- The existing "Self profile access" policy only covers SELECT/UPDATE/DELETE.
-- We need an explicit INSERT policy so the trigger (and any client-side upsert) works.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ─── 3. Auto-create profile row on first sign-up (DB trigger) ─────────────────
-- Fires on every INSERT into auth.users (Google OAuth, email, etc.)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
      email        = COALESCE(EXCLUDED.email,        profiles.email),
      avatar_url   = COALESCE(EXCLUDED.avatar_url,   profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. Per-user document uniqueness ─────────────────────────────────────────
-- Old constraint: unique on file_name alone (blocks two users uploading same filename)
-- New constraint: unique on (file_name, owner_id) — each user has their own namespace

DROP INDEX IF EXISTS idx_documents_file_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_file_name_owner
  ON public.documents(file_name, owner_id)
  WHERE owner_id IS NOT NULL;

-- Keep a fallback unique index for any legacy rows without an owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_file_name_noowner
  ON public.documents(file_name)
  WHERE owner_id IS NULL;

-- Performance index for per-user queries
CREATE INDEX IF NOT EXISTS idx_documents_owner_id
  ON public.documents(owner_id);

-- ─── 5. Tighten RLS on documents ─────────────────────────────────────────────
-- The earlier migration allowed all docs with space_id IS NULL to be visible to
-- any authenticated user. Replace with strict owner-only policies.

DROP POLICY IF EXISTS "Docs in user spaces" ON public.documents;
DROP POLICY IF EXISTS "Docs can be modified by owner or editor" ON public.documents;
DROP POLICY IF EXISTS "Insert docs by space members" ON public.documents;

-- Only the owner can SELECT their documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
      AND policyname = 'Owner can view own documents'
  ) THEN
    CREATE POLICY "Owner can view own documents" ON public.documents
      FOR SELECT USING (owner_id = auth.uid());
  END IF;
END $$;

-- Only the owner can INSERT documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
      AND policyname = 'Owner can insert documents'
  ) THEN
    CREATE POLICY "Owner can insert documents" ON public.documents
      FOR INSERT WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Only the owner can UPDATE their documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
      AND policyname = 'Owner can update own documents'
  ) THEN
    CREATE POLICY "Owner can update own documents" ON public.documents
      FOR UPDATE USING (owner_id = auth.uid());
  END IF;
END $$;

-- Only the owner can DELETE their documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
      AND policyname = 'Owner can delete own documents'
  ) THEN
    CREATE POLICY "Owner can delete own documents" ON public.documents
      FOR DELETE USING (owner_id = auth.uid());
  END IF;
END $$;
