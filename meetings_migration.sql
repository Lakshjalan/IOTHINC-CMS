-- meetings_migration.sql
-- This script creates the meetings and meeting_attendees tables and sets up their RLS policies.

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
  minutes_doc_url text,       -- optional uploaded doc (Supabase storage, same bucket pattern as your Contributions feature)
  recording_url text,         -- Google Drive link, pasted by the host
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (meeting_id, member_id)
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

-- drop existing policies if any to avoid errors on duplicate run
DROP POLICY IF EXISTS "Select meetings" ON public.meetings;
DROP POLICY IF EXISTS "Create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Select attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Join meeting" ON public.meeting_attendees;

-- create policies
CREATE POLICY "Select meetings" ON public.meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Create meetings" ON public.meetings
  FOR INSERT WITH CHECK (public.get_my_role() in ('chairperson','vice_chairperson','department_lead'));

CREATE POLICY "Update meetings" ON public.meetings
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.get_my_role() in ('chairperson','vice_chairperson')
  );

CREATE POLICY "Select attendees" ON public.meeting_attendees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Join meeting" ON public.meeting_attendees
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- Enable realtime for meetings table so client-side "Starting soon" can sync automatically
-- Note: Requires superuser to execute the publication update or through dashboard.
-- We can add a policy comment or execute if needed.
