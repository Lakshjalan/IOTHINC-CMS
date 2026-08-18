-- Fix to explicitly allow team managers to add and remove members
-- For General Teams (team_members)
DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Modify team_members" ON public.team_members FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
) WITH CHECK (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR 
  team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid())
);

-- For Event Sub-Teams (event_team_members)
DROP POLICY IF EXISTS "Managers manage event_team_members" ON public.event_team_members;
CREATE POLICY "Managers manage event_team_members" ON public.event_team_members FOR ALL USING (
  public.is_event_team_manager(event_team_id)
) WITH CHECK (
  public.is_event_team_manager(event_team_id)
);
