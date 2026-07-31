-- add_rate_limiting.sql
-- Enforces backend rate limiting for spam prevention on messages, contributions, and comments.
-- Administrators (chairpersons/vice_chairpersons) are exempt from rate limiting.

-- 1. Rate Limiting for public.messages
create or replace function public.check_message_rate_limit()
returns trigger as $$
declare
  recent_count integer;
  caller_role text;
begin
  -- Retrieve caller's role
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  -- Bypass rate limits for administrators
  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

  -- Count messages sent by this user in the last 10 seconds
  select count(*) into recent_count
  from public.messages
  where sender_id = auth.uid()
    and created_at > now() - interval '10 seconds';

  if recent_count >= 10 then
    raise exception 'Rate limit exceeded: You can only send 10 messages every 10 seconds.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_message_rate_limit on public.messages;
create trigger trg_check_message_rate_limit
  before insert on public.messages
  for each row execute procedure public.check_message_rate_limit();


-- 2. Rate Limiting for public.contributions
create or replace function public.check_contribution_rate_limit()
returns trigger as $$
declare
  recent_count integer;
  caller_role text;
begin
  -- Retrieve caller's role
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  -- Bypass rate limits for administrators
  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

  -- Count contributions posted by this user in the last 5 minutes
  select count(*) into recent_count
  from public.contributions
  where member_id = auth.uid()
    and created_at > now() - interval '5 minutes';

  if recent_count >= 3 then
    raise exception 'Rate limit exceeded: You can only post 3 contributions every 5 minutes.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_contribution_rate_limit on public.contributions;
create trigger trg_check_contribution_rate_limit
  before insert on public.contributions
  for each row execute procedure public.check_contribution_rate_limit();


-- 3. Rate Limiting for public.contribution_comments
create or replace function public.check_comment_rate_limit()
returns trigger as $$
declare
  recent_count integer;
  caller_role text;
begin
  -- Retrieve caller's role
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  -- Bypass rate limits for administrators
  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

  -- Count comments written by this user in the last 1 minute
  select count(*) into recent_count
  from public.contribution_comments
  where author_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if recent_count >= 5 then
    raise exception 'Rate limit exceeded: You can only write 5 comments every 1 minute.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_comment_rate_limit on public.contribution_comments;
create trigger trg_check_comment_rate_limit
  before insert on public.contribution_comments
  for each row execute procedure public.check_comment_rate_limit();
