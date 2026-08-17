-- Drop the existing broad policy for tasks
drop policy if exists "Insert/update task (admin/coordinator)" on public.tasks;

-- Chairperson and Vice Chairperson can manage all tasks
create policy "Manage tasks (chairperson/vc)"
  on public.tasks for all
  using (public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- Department leads can only manage tasks if assigned to their team members (or unassigned)
create policy "Manage tasks (department_lead)"
  on public.tasks for all
  using (
    public.get_my_role() = 'department_lead' 
    and (
      assigned_to is null
      or exists (
        select 1 from public.team_members tm 
        join public.teams t on tm.team_id = t.id 
        where t.lead_id = auth.uid() and tm.member_id = tasks.assigned_to
      )
    )
  );
