-- This query cleans up orphaned users from the authentication system.
-- It deletes any account in auth.users that does NOT have a corresponding profile in public.profiles.
-- This is useful for cleaning up accounts that were partially deleted before the secure delete function was added.

delete from auth.users 
where id not in (
  select id from public.profiles
);
