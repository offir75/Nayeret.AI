-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Bootstrap default 'Personal Space' for every existing user
--            and link all their documents into it.
--
-- Schema recap (from prior migrations):
--   spaces       : id (uuid PK), name, description, created_at
--   space_members: space_id, profile_id, role, joined_at  (PK: space_id+profile_id)
--   documents    : …, owner_id (→ profiles.id), space_id (→ spaces.id, nullable)
--
-- Ownership of a space is tracked via space_members.role = 'owner'.
-- This migration runs as the service role, so RLS is bypassed.
-- Run once in: Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Step 1 ────────────────────────────────────────────────────────────────────
-- For each profile that owns at least one document, create a 'Personal Space'
-- (if they don't already have one) and add them as its owner.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  owner_profile_id UUID;
  new_space_id     UUID;
BEGIN
  FOR owner_profile_id IN
    SELECT DISTINCT owner_id
    FROM public.documents
    WHERE owner_id IS NOT NULL
  LOOP
    -- Skip if a Personal Space already exists for this profile
    IF NOT EXISTS (
      SELECT 1
      FROM public.spaces s
      JOIN public.space_members sm ON sm.space_id = s.id
      WHERE sm.profile_id = owner_profile_id
        AND sm.role        = 'owner'
        AND s.name         = 'Personal Space'
    ) THEN
      INSERT INTO public.spaces (name, description)
      VALUES ('Personal Space', 'Auto-created default personal vault')
      RETURNING id INTO new_space_id;

      INSERT INTO public.space_members (space_id, profile_id, role)
      VALUES (new_space_id, owner_profile_id, 'owner');
    END IF;
  END LOOP;
END $$;


-- ── Step 2 ────────────────────────────────────────────────────────────────────
-- Link every unassigned document to its owner's Personal Space.
-- (Leaves documents that already have a space_id untouched.)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.documents d
SET    space_id = s.id
FROM   public.spaces s
JOIN   public.space_members sm ON sm.space_id = s.id
WHERE  sm.profile_id = d.owner_id
  AND  sm.role       = 'owner'
  AND  s.name        = 'Personal Space'
  AND  d.space_id    IS NULL;
