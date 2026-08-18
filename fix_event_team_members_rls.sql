DROP POLICY IF EXISTS "Organiser and managers can manage team members" ON public.event_team_members;

CREATE POLICY "Organiser and managers can manage team members"
ON public.event_team_members FOR ALL
USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson') OR
  (SELECT created_by FROM public.event_teams WHERE id = public.event_team_members.event_team_id) = auth.uid() OR
  (SELECT organiser_id FROM public.events e JOIN public.event_teams t ON e.id = t.event_id WHERE t.id = public.event_team_members.event_team_id) = auth.uid() OR
  (SELECT role FROM public.event_team_members etm WHERE etm.event_team_id = public.event_team_members.event_team_id AND etm.member_id = auth.uid()) = 'manager'
);
