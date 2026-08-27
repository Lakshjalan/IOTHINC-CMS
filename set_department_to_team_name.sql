-- Update the trigger function to use the team's NAME instead of its department/track
CREATE OR REPLACE FUNCTION update_profile_department_on_team_join()
RETURNS TRIGGER AS $$
DECLARE
  joined_team_name text;
BEGIN
  -- Retrieve the NAME from the team the member is joining
  SELECT name INTO joined_team_name FROM public.teams WHERE id = NEW.team_id;
  
  -- Update the member's profile department to match the team's name
  IF joined_team_name IS NOT NULL THEN
    UPDATE public.profiles 
    SET department = joined_team_name 
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
