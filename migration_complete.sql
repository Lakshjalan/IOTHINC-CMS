-- TOTAL RESET & FIX FOR ALL TEAM & TASK POLICIES

-- 1. Fix the infinite recursion by using a completely separate auth check for managers
DROP FUNCTION IF EXISTS public.is_event_team_manager(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_event_team_manager(target_team_id uuid)
RETURNS boolean AS $$
DECLARE
  is_mgr boolean;
BEGIN
  -- We query the table directly into a variable. 
  -- SECURITY DEFINER ensures this bypasses RLS and won't cause infinite recursion.
  SELECT true INTO is_mgr 
  FROM public.event_team_members 
  WHERE event_team_id = target_team_id 
    AND member_id = auth.uid() 
    AND role = 'manager' 
    AND status = 'active'
  LIMIT 1;
  
  IF is_mgr THEN
    RETURN true;
  END IF;

  SELECT true INTO is_mgr
  FROM public.event_teams
  WHERE id = target_team_id
    AND created_by = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(is_mgr, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. Reset and rebuild EVENT TEAM MEMBERS policies
DROP POLICY IF EXISTS "Read event_team_members" ON public.event_team_members;
DROP POLICY IF EXISTS "Member can request join event team" ON public.event_team_members;
DROP POLICY IF EXISTS "Lead manage event_team_members" ON public.event_team_members;
DROP POLICY IF EXISTS "Admin manage event_team_members" ON public.event_team_members;
DROP POLICY IF EXISTS "Organiser manage event_team_members" ON public.event_team_members;
DROP POLICY IF EXISTS "Managers manage event_team_members" ON public.event_team_members;
DROP POLICY IF EXISTS "Organiser and managers can manage team members" ON public.event_team_members;

CREATE POLICY "Read event_team_members" ON public.event_team_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Member can request join event team" ON public.event_team_members FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admin manage event_team_members" ON public.event_team_members FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson'));
CREATE POLICY "Lead manage event_team_members" ON public.event_team_members FOR ALL USING (event_team_id IN (SELECT id FROM public.event_teams WHERE created_by = auth.uid()));
CREATE POLICY "Organiser manage event_team_members" ON public.event_team_members FOR ALL USING (event_team_id IN (SELECT id FROM public.event_teams JOIN public.events ON public.events.id = public.event_teams.event_id WHERE public.events.organiser_id = auth.uid()));
CREATE POLICY "Managers manage event_team_members" ON public.event_team_members FOR ALL USING (public.is_event_team_manager(event_team_id));


-- 3. Reset and rebuild EVENT TASKS policies
DROP POLICY IF EXISTS "Read event_tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "Assignee can update event task status" ON public.event_tasks;
DROP POLICY IF EXISTS "Manage event_tasks" ON public.event_tasks;

CREATE POLICY "Read event_tasks" ON public.event_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Assignee can update event task status" ON public.event_tasks FOR UPDATE USING (auth.uid() = assigned_to);
CREATE POLICY "Manage event_tasks" ON public.event_tasks FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson')
  OR event_team_id IN (SELECT id FROM public.event_teams WHERE created_by = auth.uid())
  OR event_id IN (SELECT id FROM public.events WHERE organiser_id = auth.uid())
  OR public.is_event_team_manager(event_team_id)
);


-- 4. Restore GLOBAL TEAMS visibility (just in case they were broken)
DROP POLICY IF EXISTS "Select teams" ON public.teams;
DROP POLICY IF EXISTS "Modify teams" ON public.teams;
CREATE POLICY "Select teams" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify teams" ON public.teams FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson') OR lead_id = auth.uid());


-- 5. Restore GLOBAL TEAM MEMBERS visibility
DROP POLICY IF EXISTS "Select team_members" ON public.team_members;
DROP POLICY IF EXISTS "Modify team_members" ON public.team_members;
CREATE POLICY "Select team_members" ON public.team_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify team_members" ON public.team_members FOR ALL USING (public.get_my_role() IN ('chairperson', 'vice_chairperson') OR team_id IN (SELECT id FROM public.teams WHERE lead_id = auth.uid()));
