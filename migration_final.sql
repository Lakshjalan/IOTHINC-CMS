-- 1. Add role column to event_team_members (if it doesn't exist)
ALTER TABLE public.event_team_members 
ADD COLUMN IF NOT EXISTS role text not null default 'member' check (role in ('member', 'manager'));

-- 2. Allow event organiser to manage event_team_members
DROP POLICY IF EXISTS "Organiser manage event_team_members" ON public.event_team_members;
CREATE POLICY "Organiser manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT et.id FROM public.event_teams et
    JOIN public.events e ON e.id = et.event_id
    WHERE e.organiser_id = auth.uid()
  )
);

-- 3. Allow sub-team managers to manage event_team_members in their team
DROP POLICY IF EXISTS "Managers manage event_team_members" ON public.event_team_members;
CREATE POLICY "Managers manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT event_team_id FROM public.event_team_members WHERE member_id = auth.uid() AND role = 'manager' AND status = 'active'
  )
);

-- 4. Update task management policy to allow manager of sub team, organiser of event
DROP POLICY IF EXISTS "Manage event_tasks" ON public.event_tasks;
CREATE POLICY "Manage event_tasks" ON public.event_tasks FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson')
  OR event_team_id IN (SELECT id FROM public.event_teams WHERE created_by = auth.uid())
  OR event_id IN (SELECT id FROM public.events WHERE organiser_id = auth.uid())
  OR event_team_id IN (SELECT event_team_id FROM public.event_team_members WHERE member_id = auth.uid() AND role = 'manager' AND status = 'active')
);

-- 5. Restrict department_lead powers globally
DROP POLICY IF EXISTS "Manage blogs" ON public.blogs;
CREATE POLICY "Manage blogs" ON public.blogs FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

DROP POLICY IF EXISTS "Admins and coordinators can modify events" ON public.events;
CREATE POLICY "Admins and coordinators can modify events" ON public.events FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

DROP POLICY IF EXISTS "Modify projects" ON public.projects;
CREATE POLICY "Modify projects" ON public.projects FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

DROP POLICY IF EXISTS "Modify teams" ON public.teams;
CREATE POLICY "Modify teams" ON public.teams FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  lead_id = auth.uid()
);

DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Modify team_members" ON public.team_members FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

DROP POLICY IF EXISTS "Read team join requests" ON public.team_join_requests;
CREATE POLICY "Read team join requests" ON public.team_join_requests FOR SELECT USING (
  auth.uid() = member_id OR 
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

DROP POLICY IF EXISTS "Team leads and admin manage requests" ON public.team_join_requests;
CREATE POLICY "Team leads and admin manage requests" ON public.team_join_requests FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

DROP POLICY IF EXISTS "Insert/update task (admin/coordinator)" ON public.tasks;
CREATE POLICY "Insert/update task (admin/coordinator)" ON public.tasks FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR
  (
    public.get_my_role() = 'department_lead' AND 
    (
      assigned_to IN (SELECT member_id FROM public.team_members WHERE team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid()))
      OR assigned_to = auth.uid()
    )
  )
);
