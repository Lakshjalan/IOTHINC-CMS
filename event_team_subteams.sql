-- Fix policies for event_teams to allow managers and organisers to create subteams

-- Drop existing policies
DROP POLICY IF EXISTS "Manage event_teams" ON public.event_teams;
DROP POLICY IF EXISTS "Organisers manage event_teams" ON public.event_teams;
DROP POLICY IF EXISTS "Managers can manage subteams" ON public.event_teams;

-- Admins can manage everything
CREATE POLICY "Manage event_teams" ON public.event_teams FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
);

-- Event organisers can manage event teams for their events
CREATE POLICY "Organisers manage event_teams" ON public.event_teams FOR ALL USING (
  event_id IN (SELECT id FROM public.events WHERE organiser_id = auth.uid())
) WITH CHECK (
  event_id IN (SELECT id FROM public.events WHERE organiser_id = auth.uid())
);

-- Managers of the parent team can manage subteams
CREATE POLICY "Managers can manage subteams" ON public.event_teams FOR ALL USING (
  parent_team_id IS NOT NULL AND public.is_event_team_manager(parent_team_id)
) WITH CHECK (
  parent_team_id IS NOT NULL AND public.is_event_team_manager(parent_team_id)
);

-- A manager can also update the team they are managing (useful for renaming etc.)
CREATE POLICY "Managers update their teams" ON public.event_teams FOR UPDATE USING (
  public.is_event_team_manager(id)
) WITH CHECK (
  public.is_event_team_manager(id)
);
