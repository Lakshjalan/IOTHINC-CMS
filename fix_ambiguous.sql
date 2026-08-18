-- Fix ambiguous column reference

DROP POLICY IF EXISTS "Organiser manage event_team_members" ON public.event_team_members;

CREATE POLICY "Organiser manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT public.event_teams.id 
    FROM public.event_teams 
    JOIN public.events ON public.events.id = public.event_teams.event_id 
    WHERE public.events.organiser_id = auth.uid()
  )
);
