-- ============================================================
-- SQL PATCH: Allow Team Leads to Manage Members & Join Requests, and Secure Team Chat
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS and adjust policies on team_join_requests (General Club Teams)
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read team join requests" ON public.team_join_requests;
CREATE POLICY "Read team join requests" ON public.team_join_requests
  FOR SELECT USING (
    auth.uid() = member_id 
    OR public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
    OR team_id IN (
      SELECT id FROM public.teams WHERE lead_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage join requests" ON public.team_join_requests;
DROP POLICY IF EXISTS "Team leads and admin manage requests" ON public.team_join_requests;
CREATE POLICY "Team leads and admin manage requests" ON public.team_join_requests
  FOR ALL USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
    OR team_id IN (
      SELECT id FROM public.teams WHERE lead_id = auth.uid()
    )
  );

-- 2. Adjust policies on team_members (General Club Teams) to allow Team Leads to add/remove members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Modify team_members" ON public.team_members
  FOR ALL USING (
    public.get_my_role() in ('chairperson', 'vice_chairperson')
    OR team_id IN (
      SELECT id FROM public.teams WHERE lead_id = auth.uid()
    )
  );

-- 3. Update messages policies to ensure team chat messages can only be sent by team members (General Club Teams)
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id 
    AND (
      team_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = messages.team_id 
          AND team_members.member_id = auth.uid()
      )
    )
  );

-- 4. Secure select messages to ensure members have no access to other teams' chats (General Club Teams)
DROP POLICY IF EXISTS "Users can read messages" ON public.messages;
CREATE POLICY "Users can read messages" ON public.messages
  FOR SELECT USING (
    -- Global lobby
    (receiver_id IS NULL AND team_id IS NULL)
    -- 1-on-1 DM
    OR (team_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
    -- Team chat: must be a member of the team
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = messages.team_id
        AND team_members.member_id = auth.uid()
    ))
  );

-- 5. Adjust policies on event_team_members (Event Sub-Teams) to allow Sub-Team Leads to manage members
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lead manage event_team_members" ON public.event_team_members;
CREATE POLICY "Lead manage event_team_members" ON public.event_team_members
  FOR ALL USING (
    event_team_id IN (
      SELECT id FROM public.event_teams WHERE created_by = auth.uid()
    )
  );

-- 6. Adjust policies on event_tasks (Event Sub-Teams) to allow Sub-Team Leads to manage tasks
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage event_tasks" ON public.event_tasks;
CREATE POLICY "Manage event_tasks" ON public.event_tasks
  FOR ALL USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
    OR event_team_id IN (
      SELECT id FROM public.event_teams WHERE created_by = auth.uid()
    )
  );

-- 7. Adjust policies on teams (General Club Teams) to allow Team Leads to modify/delete their own teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Modify teams" ON public.teams;
CREATE POLICY "Modify teams" ON public.teams
  FOR ALL USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR lead_id = auth.uid()
  );
