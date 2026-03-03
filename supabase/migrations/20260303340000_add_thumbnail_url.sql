-- Migration: Add thumbnail_url column to documents
-- Run once in: Supabase Dashboard → SQL Editor.

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
