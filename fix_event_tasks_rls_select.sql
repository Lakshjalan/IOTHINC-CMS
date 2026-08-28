-- Fix event_tasks SELECT RLS policy
-- Currently USING (true) allows ALL authenticated users to see ALL event tasks.
-- This tightens it so users only see event tasks relevant to them.

BEGIN;

-- Drop the overly permissive select policy
DROP POLICY IF EXISTS "Read event_tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "event_tasks_select" ON public.event_tasks;

-- New SELECT policy: users can see event tasks if:
-- 1. They are an admin (chairperson/vice_chairperson) — see all
-- 2. They are the assignee
-- 3. They are a member of the event team the task belongs to
-- 4. They created the event team
-- 5. They are a manager of the event team
-- 6. They are the event organiser
CREATE POLICY "Read event_tasks" ON public.event_tasks FOR SELECT USING (
    -- Admins see everything
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
    -- Assignee sees their own tasks
    OR assigned_to = auth.uid()
    -- Team creator sees their team's tasks
    OR event_team_id IN (
        SELECT id FROM public.event_teams WHERE created_by = auth.uid()
    )
    -- Team members see their team's tasks
    OR event_team_id IN (
        SELECT event_team_id FROM public.event_team_members
        WHERE member_id = auth.uid() AND status = 'active'
    )
    -- Event organiser sees all tasks in their event
    OR event_id IN (
        SELECT id FROM public.events WHERE organiser_id = auth.uid()
    )
);

COMMIT;
