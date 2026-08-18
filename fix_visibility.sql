-- Let's restore all policies carefully!

-- TEAMS
DROP POLICY IF EXISTS "Modify teams" ON public.teams;
CREATE POLICY "Modify teams" ON public.teams FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  lead_id = auth.uid()
);

-- TEAM MEMBERS
DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Modify team_members" ON public.team_members FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

-- EVENT TEAM MEMBERS (Ensure SELECT is still there)
DROP POLICY IF EXISTS "Read event_team_members" ON public.event_team_members;
CREATE POLICY "Read event_team_members" ON public.event_team_members FOR SELECT USING (auth.role() = 'authenticated');

-- We must make sure Organisers and Managers can update event_team_members
DROP POLICY IF EXISTS "Organiser manage event_team_members" ON public.event_team_members;
CREATE POLICY "Organiser manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT et.id FROM public.event_teams et
    JOIN public.events e ON e.id = et.event_id
    WHERE e.organiser_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers manage event_team_members" ON public.event_team_members;
CREATE POLICY "Managers manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT event_team_id FROM public.event_team_members WHERE member_id = auth.uid() AND role = 'manager' AND status = 'active'
  )
);

-- Make sure event_teams is readable
DROP POLICY IF EXISTS "Read event_teams" ON public.event_teams;
CREATE POLICY "Read event_teams" ON public.event_teams FOR SELECT USING (auth.role() = 'authenticated');
