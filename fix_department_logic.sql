-- Revert the trigger that tied profile department to team membership
DROP TRIGGER IF EXISTS on_team_member_join_update_department ON public.team_members;
DROP FUNCTION IF EXISTS update_profile_department_on_team_join();

-- Remove the old RPC function if it exists, since we no longer compute department dynamically
DROP FUNCTION IF EXISTS public.get_member_department(uuid);
