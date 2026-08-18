-- Migration to support sub-team managers

-- 1. Add role to event_team_members
ALTER TABLE public.event_team_members 
ADD COLUMN IF NOT EXISTS role text not null default 'member' check (role in ('member', 'manager'));

-- 2. Allow event organiser to manage event_team_members
CREATE POLICY "Organiser manage event_team_members" ON public.event_team_members FOR ALL USING (
  event_team_id IN (
    SELECT et.id FROM public.event_teams et
    JOIN public.events e ON e.id = et.event_id
    WHERE e.organiser_id = auth.uid()
  )
);

-- 3. Update task management policy to allow manager of sub team, organiser of event
DROP POLICY IF EXISTS "Manage event_tasks" ON public.event_tasks;
CREATE POLICY "Manage event_tasks" ON public.event_tasks FOR ALL USING (
  public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
  OR event_team_id IN (SELECT id FROM public.event_teams WHERE created_by = auth.uid())
  OR event_id IN (SELECT id FROM public.events WHERE organiser_id = auth.uid())
  OR event_team_id IN (SELECT event_team_id FROM public.event_team_members WHERE member_id = auth.uid() AND role = 'manager' AND status = 'active')
);
