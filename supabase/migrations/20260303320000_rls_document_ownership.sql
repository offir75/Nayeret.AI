-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Complete Row Level Security — Document Ownership + Family Space foundation
--
-- Goals
--   1. Users can ONLY read/write documents they own (strict isolation by default).
--   2. "Family Space" ready: when a document is assigned to a shared space, all
--      members of that space can read it; owners/editors can modify it.
--   3. Profiles: users see only their own profile, plus profiles of family space
--      members (so display names appear in the shared vault view).
--
-- NOTE: All API routes in this app use the service-role key (supabaseAdmin) which
--       bypasses RLS entirely — these policies protect against direct REST/client
--       access and enforce the security model as we add client-side queries.
--
-- Run this once in Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on documents so we get a clean slate.
-- (Covers policies from both previous migrations and any manual additions.)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', pol.policyname);
  END LOOP;
END $$;

-- ── SELECT ────────────────────────────────────────────────────────────────────
-- A user can read a document if they own it, OR if it belongs to a shared space
-- they are a member of (Family Space path).
CREATE POLICY "documents_select"
  ON public.documents
  FOR SELECT
  USING (
    -- Personal vault: the owner always sees their own documents
    owner_id = auth.uid()

    OR

    -- Family Space: any member of the space can read space documents
    (
      space_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.space_members sm
        WHERE sm.space_id  = documents.space_id
          AND sm.profile_id = auth.uid()
      )
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
-- Only the authenticated user can insert; they must be recorded as the owner.
CREATE POLICY "documents_insert"
  ON public.documents
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ── UPDATE ────────────────────────────────────────────────────────────────────
-- The document owner can always update.
-- In a shared space, a member with role 'owner' or 'editor' can also update.
CREATE POLICY "documents_update"
  ON public.documents
  FOR UPDATE
  USING (
    owner_id = auth.uid()

    OR

    (
      space_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.space_members sm
        WHERE sm.space_id   = documents.space_id
          AND sm.profile_id  = auth.uid()
          AND sm.role        IN ('owner', 'editor')
      )
    )
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
-- Only the document's original owner can delete it, even inside a Family Space.
CREATE POLICY "documents_delete"
  ON public.documents
  FOR DELETE
  USING (owner_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on profiles (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- ── SELECT ────────────────────────────────────────────────────────────────────
-- A user can read:
--   • Their own profile (always)
--   • Profiles of people in any shared space they belong to
--     (needed to display names in a Family Vault view)
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  USING (
    -- Own profile
    id = auth.uid()

    OR

    -- Profiles of family space co-members
    EXISTS (
      SELECT 1
      FROM public.space_members my_membership
      JOIN public.space_members their_membership
        ON my_membership.space_id = their_membership.space_id
      WHERE my_membership.profile_id   = auth.uid()
        AND their_membership.profile_id = profiles.id
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
-- Only the user themselves can create their profile row.
-- (Also handled automatically by the handle_new_user DB trigger.)
CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ── UPDATE ────────────────────────────────────────────────────────────────────
-- Users can only update their own profile.
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ── DELETE ────────────────────────────────────────────────────────────────────
-- Profiles are deleted automatically via CASCADE when auth.users is deleted.
-- Prevent manual profile deletion from client code.
CREATE POLICY "profiles_delete"
  ON public.profiles
  FOR DELETE
  USING (false); -- nobody can delete profiles directly; use Supabase Auth admin


-- ═══════════════════════════════════════════════════════════════════════════════
-- SPACES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- Drop existing space policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spaces'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.spaces', pol.policyname);
  END LOOP;
END $$;

-- Members can read spaces they belong to
CREATE POLICY "spaces_select"
  ON public.spaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id   = spaces.id
        AND sm.profile_id  = auth.uid()
    )
  );

-- Spaces can be created by authenticated users (they become the owner via space_members)
CREATE POLICY "spaces_insert"
  ON public.spaces
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only space owners can update or delete the space
CREATE POLICY "spaces_update"
  ON public.spaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id   = spaces.id
        AND sm.profile_id  = auth.uid()
        AND sm.role        = 'owner'
    )
  );

CREATE POLICY "spaces_delete"
  ON public.spaces
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id   = spaces.id
        AND sm.profile_id  = auth.uid()
        AND sm.role        = 'owner'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- SPACE MEMBERS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'space_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.space_members', pol.policyname);
  END LOOP;
END $$;

-- Members can see the membership list for their own spaces
CREATE POLICY "space_members_select"
  ON public.space_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_members my_row
      WHERE my_row.space_id   = space_members.space_id
        AND my_row.profile_id  = auth.uid()
    )
  );

-- Only space owners can add / remove members
CREATE POLICY "space_members_insert"
  ON public.space_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id   = space_members.space_id
        AND sm.profile_id  = auth.uid()
        AND sm.role        = 'owner'
    )
    -- A user can always insert themselves as the first owner row of a new space
    OR NOT EXISTS (
      SELECT 1 FROM public.space_members sm2
      WHERE sm2.space_id = space_members.space_id
    )
  );

CREATE POLICY "space_members_delete"
  ON public.space_members
  FOR DELETE
  USING (
    -- Owners can remove anyone; members can remove themselves
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.space_members sm
      WHERE sm.space_id   = space_members.space_id
        AND sm.profile_id  = auth.uid()
        AND sm.role        = 'owner'
    )
  );
