-- Migration: Remove department from profiles and auto-set from team membership
-- Run this in Supabase SQL Editor

-- 1. Create a function to get member's department from their team membership
create or replace function public.get_member_department(member_id uuid)
returns text as $$
declare
  dept text;
begin
  -- First check if member is a department lead (their managed team's department)
  select t.department into dept
  from public.teams t
  where t.lead_id = member_id
    and t.status = 'active'
    and t.department is not null
  limit 1;

  if dept is not null then
    return dept;
  end if;

  -- Otherwise check team membership
  select t.department into dept
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.member_id = member_id
    and t.status = 'active'
    and t.department is not null
  limit 1;

  return dept;
end;
$$ language plpgsql security definer;

-- 2. Create a view for profiles with computed department
create or replace view public.profiles_with_department as
select
  p.*,
  public.get_member_department(p.id) as computed_department
from public.profiles p;

-- 3. Create trigger to sync department when team membership changes
create or replace function public.sync_member_department()
returns trigger as $$
declare
  dept text;
  member_uuid uuid;
begin
  -- Determine which member to update
  if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
    member_uuid := NEW.member_id;
  else
    member_uuid := OLD.member_id;
  end if;

  -- Get department from the team
  select t.department into dept
  from public.teams t
  where t.id = COALESCE(NEW.team_id, OLD.team_id)
    and t.status = 'active';

  -- Update the member's department in profiles (we'll keep the column for now for backwards compat)
  -- But the computed_department view will always show the correct value

  return COALESCE(NEW, OLD);
end;
$$ language plpgsql security definer;

-- Trigger on team_members changes
drop trigger if exists trg_sync_department_on_team_change on public.team_members;
create trigger trg_sync_department_on_team_change
  after insert or update or delete on public.team_members
  for each row execute procedure public.sync_member_department();

-- Trigger on teams changes (when department changes or lead changes)
drop trigger if exists trg_sync_department_on_team_update on public.teams;
create trigger trg_sync_department_on_team_update
  after update of department, lead_id on public.teams
  for each row execute procedure public.sync_member_department();

-- 4. Optional: If you want to completely remove the department column from profiles
-- UNCOMMENT THE FOLLOWING LINES ONLY AFTER VERIFYING THE VIEW WORKS CORRECTLY:
-- alter table public.profiles drop column if exists department;

-- 5. Grant permissions
grant select on public.profiles_with_department to authenticated;
grant execute on function public.get_member_department(uuid) to authenticated;