-- ============================================================
-- IOTHINC Event & Team Overhaul — Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Event Sub-Teams (teams within a specific event, created by host)
CREATE TABLE IF NOT EXISTS public.event_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  max_members integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Members of each event sub-team
CREATE TABLE IF NOT EXISTS public.event_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_team_id uuid REFERENCES public.event_teams(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  request_message text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(event_team_id, member_id)
);

-- 3. Tasks within event sub-teams
CREATE TABLE IF NOT EXISTS public.event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_team_id uuid REFERENCES public.event_teams(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Join requests for general club Teams
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_message text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  requested_at timestamptz DEFAULT now(),
  UNIQUE(team_id, member_id)
);

-- 5. Add team_id column to messages for team chat
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- ============================================================
-- Enable RLS on new tables
-- ============================================================
ALTER TABLE public.event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: event_teams
-- ============================================================
DROP POLICY IF EXISTS "Read event_teams" ON public.event_teams;
CREATE POLICY "Read event_teams" ON public.event_teams
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Manage event_teams" ON public.event_teams;
CREATE POLICY "Manage event_teams" ON public.event_teams
  FOR ALL USING (public.get_my_role() IN ('admin', 'coordinator'));

-- ============================================================
-- RLS Policies: event_team_members
-- ============================================================
DROP POLICY IF EXISTS "Read event_team_members" ON public.event_team_members;
CREATE POLICY "Read event_team_members" ON public.event_team_members
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin manage event_team_members" ON public.event_team_members;
CREATE POLICY "Admin manage event_team_members" ON public.event_team_members
  FOR ALL USING (public.get_my_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Member can request join event team" ON public.event_team_members;
CREATE POLICY "Member can request join event team" ON public.event_team_members
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- ============================================================
-- RLS Policies: event_tasks
-- ============================================================
DROP POLICY IF EXISTS "Read event_tasks" ON public.event_tasks;
CREATE POLICY "Read event_tasks" ON public.event_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Manage event_tasks" ON public.event_tasks;
CREATE POLICY "Manage event_tasks" ON public.event_tasks
  FOR ALL USING (public.get_my_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Assignee can update event task status" ON public.event_tasks;
CREATE POLICY "Assignee can update event task status" ON public.event_tasks
  FOR UPDATE USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

-- ============================================================
-- RLS Policies: team_join_requests
-- ============================================================
DROP POLICY IF EXISTS "Read team join requests" ON public.team_join_requests;
CREATE POLICY "Read team join requests" ON public.team_join_requests
  FOR SELECT USING (auth.uid() = member_id OR public.get_my_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Member can submit join request" ON public.team_join_requests;
CREATE POLICY "Member can submit join request" ON public.team_join_requests
  FOR INSERT WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Admin can manage join requests" ON public.team_join_requests;
CREATE POLICY "Admin can manage join requests" ON public.team_join_requests
  FOR ALL USING (public.get_my_role() IN ('admin', 'coordinator'));

-- ============================================================
-- Update messages RLS to support team chat
-- ============================================================
DROP POLICY IF EXISTS "Users can read their own messages or global lobby messages" ON public.messages;
CREATE POLICY "Users can read messages" ON public.messages
  FOR SELECT USING (
    -- Global lobby
    (receiver_id IS NULL AND team_id IS NULL)
    -- 1-on-1 DM
    OR auth.uid() = sender_id
    OR auth.uid() = receiver_id
    -- Team chat: must be a member of the team
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = messages.team_id
        AND team_members.member_id = auth.uid()
    ))
  );

-- ============================================================
-- Done! ✅
-- ============================================================
