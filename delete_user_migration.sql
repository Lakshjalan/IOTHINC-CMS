-- Function to securely delete a user from auth.users (which cascades to public.profiles)
-- This must run with SECURITY DEFINER so it can access the auth schema,
-- but we explicitly check authorization inside the function.

create or replace function public.delete_user_account(target_user_id uuid)
returns void as $$
begin
  -- Only allow admins (chairperson, vice_chairperson) to delete users
  if (select role from public.profiles where id = auth.uid()) not in ('chairperson', 'vice_chairperson') then
    raise exception 'Unauthorized: Only admins can delete user accounts.';
  end if;

  -- Delete from auth.users. 
  -- Since public.profiles has 'references auth.users(id) on delete cascade', 
  -- this will automatically remove their profile too.
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;
