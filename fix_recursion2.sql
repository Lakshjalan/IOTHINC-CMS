-- 1. Drop the function and replace with plpgsql to prevent inlining
DROP FUNCTION IF EXISTS public.is_event_team_manager(uuid);

CREATE OR REPLACE FUNCTION public.is_event_team_manager(team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_team_members 
    WHERE event_team_id = team_id 
      AND member_id = auth.uid() 
      AND role = 'manager' 
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.event_teams
    WHERE id = team_id
      AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ensure we use the safe function
DROP POLICY IF EXISTS "Managers manage event_team_members" ON public.event_team_members;

CREATE POLICY "Managers manage event_team_members" ON public.event_team_members FOR ALL USING (
  public.is_event_team_manager(event_team_id)
);
