-- fix_meetings_rls.sql
-- Run this script in your Supabase SQL Editor.
-- It recreates the RLS policies for public.meetings and public.meeting_attendees 
-- using the updated roles ('chairperson', 'vice_chairperson', 'department_lead').

-- ═══════════════════════════════════════════════════════════════
-- TABLE CREATION SKELETONS (Pre-requisite check to avoid missing relation errors)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  actual_duration_minutes integer,
  meeting_link text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status in ('scheduled','live','completed','cancelled')),
  minutes_text text,
  minutes_doc_url text,
  recording_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (meeting_id, member_id)
);

-- 1. Ensure the helper function is correctly defined and updated
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. Drop existing policies on meetings
DROP POLICY IF EXISTS "Select meetings" ON public.meetings;
DROP POLICY IF EXISTS "Create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Update meetings" ON public.meetings;

-- 3. Create correct, up-to-date policies on meetings
CREATE POLICY "Select meetings" ON public.meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Create meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
  );

CREATE POLICY "Update meetings" ON public.meetings
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.get_my_role() IN ('chairperson', 'vice_chairperson')
  );

-- 4. Drop existing policies on meeting_attendees
DROP POLICY IF EXISTS "Select attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Join meeting" ON public.meeting_attendees;

-- 5. Create correct policies on meeting_attendees
CREATE POLICY "Select attendees" ON public.meeting_attendees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Join meeting" ON public.meeting_attendees
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- 6. Re-enable Row Level Security on both tables to ensure it is active
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
