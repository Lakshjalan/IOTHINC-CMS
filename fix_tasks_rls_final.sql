-- Fix any missing RLS policies for Tasks that could cause silent failures
-- 1. Ensure admins can do everything
DROP POLICY IF EXISTS "Manage tasks (admin)" ON public.tasks;
CREATE POLICY "Manage tasks (admin)"
  ON public.tasks FOR ALL
  USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
  );

-- 2. Ensure department leads can manage tasks for their department
DROP POLICY IF EXISTS "Manage tasks (department_lead)" ON public.tasks;
CREATE POLICY "Manage tasks (department_lead)"
  ON public.tasks FOR ALL
  USING (
    public.get_my_role() = 'department_lead' 
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = tasks.assigned_to
        AND p.department = (SELECT department FROM public.profiles WHERE id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.team_members tm 
        JOIN public.teams t ON tm.team_id = t.id 
        WHERE t.lead_id = auth.uid() AND tm.member_id = tasks.assigned_to
      )
    )
  );

-- 3. Ensure everyone can view their own tasks AND tasks they created
DROP POLICY IF EXISTS "View own tasks" ON public.tasks;
CREATE POLICY "View own tasks"
  ON public.tasks FOR SELECT
  USING (
    assigned_to = auth.uid() OR assigned_by = auth.uid()
  );

-- 4. Ensure everyone can insert tasks they create (if the above doesn't cover it)
DROP POLICY IF EXISTS "Insert own tasks" ON public.tasks;
CREATE POLICY "Insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
  );
