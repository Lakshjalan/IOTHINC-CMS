-- add_meetings_platform.sql
-- Adds platform column to public.meetings table.

ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'other'
  CHECK (platform IN ('zoom', 'google_meet', 'teams', 'other', 'in_person'));
