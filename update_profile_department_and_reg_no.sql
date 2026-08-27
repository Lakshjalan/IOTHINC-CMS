-- 1. Clear existing data in the department column of the profiles table
UPDATE public.profiles SET department = NULL;

-- 2. Add reg_no column to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reg_no text;

-- 3. Create a trigger function to update profile department when a member joins a team
CREATE OR REPLACE FUNCTION update_profile_department_on_team_join()
RETURNS TRIGGER AS $$
DECLARE
  team_dept text;
BEGIN
  -- Retrieve the department from the team the member is joining
  SELECT department INTO team_dept FROM public.teams WHERE id = NEW.team_id;
  
  -- If the team has an associated department, update the member's profile
  IF team_dept IS NOT NULL THEN
    UPDATE public.profiles 
    SET department = team_dept 
    WHERE id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_team_member_join_update_department ON public.team_members;

-- Create the trigger on the team_members table
CREATE TRIGGER on_team_member_join_update_department
AFTER INSERT OR UPDATE OF team_id ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION update_profile_department_on_team_join();
