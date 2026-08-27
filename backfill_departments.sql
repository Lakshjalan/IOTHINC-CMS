-- 1. Backfill profiles.department for all members currently in teams using the team's department
UPDATE public.profiles p
SET department = (
  SELECT t.department 
  FROM public.teams t 
  JOIN public.team_members tm ON t.id = tm.team_id 
  WHERE tm.member_id = p.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM public.team_members tm 
  WHERE tm.member_id = p.id
);

-- 2. Update the trigger function to use the team's department (track) instead of its name
CREATE OR REPLACE FUNCTION update_profile_department_on_team_join()
RETURNS TRIGGER AS $$
DECLARE
  joined_team_dept text;
BEGIN
  -- Retrieve the DEPARTMENT from the team the member is joining
  SELECT department INTO joined_team_dept FROM public.teams WHERE id = NEW.team_id;
  
  -- Update the member's profile department to match the team's department
  IF joined_team_dept IS NOT NULL THEN
    UPDATE public.profiles 
    SET department = joined_team_dept 
    WHERE id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_team_member_join_update_department ON public.team_members;

-- Create the trigger on the team_members table
CREATE TRIGGER on_team_member_join_update_department
AFTER INSERT OR UPDATE OF team_id ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION update_profile_department_on_team_join();
