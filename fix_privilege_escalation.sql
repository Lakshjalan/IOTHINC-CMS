-- fix_privilege_escalation.sql
-- Run this script in the Supabase SQL editor to secure user roles against unauthorized promotion/privilege escalation.

-- Create or update the validate_profile trigger function
create or replace function public.validate_profile()
returns trigger as $$
begin
  -- Required and trimmed field checks
  if new.full_name is null or trim(new.full_name) = '' then
    raise exception 'Full name is required and cannot be empty.';
  end if;
  if length(new.full_name) > 255 then
    raise exception 'Full name cannot exceed 255 characters.';
  end if;
  
  if new.email is null or trim(new.email) = '' then
    raise exception 'Email is required and cannot be empty.';
  end if;
  if length(new.email) > 255 then
    raise exception 'Email cannot exceed 255 characters.';
  end if;
  if new.email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'Invalid email format: %', new.email;
  end if;

  -- Optional text field length checks
  if new.department is not null and length(new.department) > 255 then
    raise exception 'Department cannot exceed 255 characters.';
  end if;

  if new.year is not null and length(new.year) > 50 then
    raise exception 'Academic year cannot exceed 50 characters.';
  end if;

  if new.bio is not null and length(new.bio) > 5000 then
    raise exception 'Bio cannot exceed 5000 characters.';
  end if;

  -- URL and media checks
  if new.avatar_url is not null and trim(new.avatar_url) <> '' then
    if length(new.avatar_url) > 2048 then
      raise exception 'Avatar URL cannot exceed 2048 characters.';
    end if;
    if new.avatar_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid avatar URL format.';
    end if;
  end if;

  if new.github_url is not null and trim(new.github_url) <> '' then
    if length(new.github_url) > 2048 then
      raise exception 'GitHub URL cannot exceed 2048 characters.';
    end if;
    if new.github_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid GitHub URL format.';
    end if;
  end if;

  if new.linkedin_url is not null and trim(new.linkedin_url) <> '' then
    if length(new.linkedin_url) > 2048 then
      raise exception 'LinkedIn URL cannot exceed 2048 characters.';
    end if;
    if new.linkedin_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid LinkedIn URL format.';
    end if;
  end if;

  -- ── PRIVILEGE ESCALATION PREVENTION RULES ──
  
  -- 1. On INSERT:
  if TG_OP = 'INSERT' then
    -- Authenticated users (self-signup) must start as a member and require approval.
    -- We allow chairperson/vice_chairperson to insert profiles with other roles.
    if new.role <> 'member' or new.needs_approval <> true then
      if (select coalesce(role, 'member') from public.profiles where id = auth.uid()) not in ('chairperson', 'vice_chairperson') then
        new.role := 'member';
        new.needs_approval := true;
      end if;
    end if;
  end if;

  -- 2. On UPDATE:
  if TG_OP = 'UPDATE' then
    -- Check if role or needs_approval status is being modified
    if old.role IS DISTINCT FROM new.role or old.needs_approval IS DISTINCT FROM new.needs_approval then
      -- Only chairpersons and vice_chairpersons are allowed to alter roles or approval status
      if (select coalesce(role, 'member') from public.profiles where id = auth.uid()) not in ('chairperson', 'vice_chairperson') then
        raise exception 'Access Denied: You do not have permission to modify roles or approval status.';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger is registered
drop trigger if exists trg_validate_profile on public.profiles;
create trigger trg_validate_profile
  before insert or update on public.profiles
  for each row execute procedure public.validate_profile();
