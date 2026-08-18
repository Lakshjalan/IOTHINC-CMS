-- Restrict department_lead powers

-- 1. Modify public.blogs (remove department_lead from global manage)
DROP POLICY IF EXISTS "Manage blogs" ON public.blogs;
CREATE POLICY "Manage blogs" ON public.blogs FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

-- 2. Modify public.events (remove department_lead)
DROP POLICY IF EXISTS "Admins and coordinators can modify events" ON public.events;
CREATE POLICY "Admins and coordinators can modify events" ON public.events FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

-- 3. Modify public.projects
DROP POLICY IF EXISTS "Modify projects" ON public.projects;
CREATE POLICY "Modify projects" ON public.projects FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));

-- 4. Modify public.teams (Departments)
DROP POLICY IF EXISTS "Modify teams" ON public.teams;
CREATE POLICY "Modify teams" ON public.teams FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  lead_id = auth.uid()
);

-- 5. Modify public.team_members
DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Modify team_members" ON public.team_members FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

-- 6. Modify team_join_requests
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

-- 7. Modify public.tasks
DROP POLICY IF EXISTS "Insert/update task (admin/coordinator)" ON public.tasks;
CREATE POLICY "Insert/update task (admin/coordinator)" ON public.tasks FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR
  (
    public.get_my_role() = 'department_lead' AND 
    (
      -- Can assign to anyone in a team where the current user is the lead
      assigned_to IN (SELECT member_id FROM public.team_members WHERE team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid()))
      OR assigned_to = auth.uid()
    )
  )
);
