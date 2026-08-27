drop policy if exists "Manage tasks (department_lead)" on public.tasks;

create policy "Manage tasks (department_lead)"
  on public.tasks for all
  using (
    public.get_my_role() = 'department_lead' 
    and (
      assigned_to is null
      or exists (
        select 1 from public.profiles p
        where p.id = tasks.assigned_to
        and p.department = (select department from public.profiles where id = auth.uid())
      )
      or exists (
        select 1 from public.team_members tm 
        join public.teams t on tm.team_id = t.id 
        where t.lead_id = auth.uid() and tm.member_id = tasks.assigned_to
      )
    )
  );
