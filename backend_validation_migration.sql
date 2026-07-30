-- ============================================================
-- IOTHINC Backend Validation Migration
-- ============================================================

-- ── 1. PROFILES VALIDATION ──
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

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_profile on public.profiles;
create trigger trg_validate_profile
  before insert or update on public.profiles
  for each row execute procedure public.validate_profile();


-- ── 2. TEAMS VALIDATION ──
create or replace function public.validate_team()
returns trigger as $$
begin
  if new.name is null or trim(new.name) = '' then
    raise exception 'Team name is required and cannot be empty.';
  end if;
  if length(new.name) > 255 then
    raise exception 'Team name cannot exceed 255 characters.';
  end if;

  if new.department is not null and length(new.department) > 255 then
    raise exception 'Department cannot exceed 255 characters.';
  end if;

  if new.lead_id is null then
    raise exception 'Team lead is required.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_team on public.teams;
create trigger trg_validate_team
  before insert or update on public.teams
  for each row execute procedure public.validate_team();


-- ── 3. EVENTS VALIDATION ──
create or replace function public.validate_event()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Event title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Event title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.venue is not null and length(new.venue) > 255 then
    raise exception 'Venue cannot exceed 255 characters.';
  end if;

  if new.max_seats is not null and (new.max_seats < 1 or new.max_seats > 100000) then
    raise exception 'Max seats must be between 1 and 100,000.';
  end if;

  if new.event_date is null then
    raise exception 'Event date is required.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_event on public.events;
create trigger trg_validate_event
  before insert or update on public.events
  for each row execute procedure public.validate_event();


-- ── 4. PROJECTS VALIDATION ──
create or replace function public.validate_project()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Project title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Project title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.category is not null and length(new.category) > 255 then
    raise exception 'Category cannot exceed 255 characters.';
  end if;

  if new.milestone is not null and length(new.milestone) > 255 then
    raise exception 'Milestone cannot exceed 255 characters.';
  end if;

  if new.progress is not null and (new.progress < 0 or new.progress > 100) then
    raise exception 'Progress must be between 0 and 100.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_project on public.projects;
create trigger trg_validate_project
  before insert or update on public.projects
  for each row execute procedure public.validate_project();


-- ── 5. CONTRIBUTIONS VALIDATION ──
create or replace function public.validate_contribution()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Contribution title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Contribution title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.photo_url is not null and trim(new.photo_url) <> '' then
    if length(new.photo_url) > 2048 then
      raise exception 'Photo URL cannot exceed 2048 characters.';
    end if;
    if new.photo_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid photo URL format.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_contribution on public.contributions;
create trigger trg_validate_contribution
  before insert or update on public.contributions
  for each row execute procedure public.validate_contribution();


-- ── 6. CONTRIBUTION COMMENTS VALIDATION ──
create or replace function public.validate_contribution_comment()
returns trigger as $$
begin
  if new.comment is null or trim(new.comment) = '' then
    raise exception 'Comment is required and cannot be empty.';
  end if;
  if length(new.comment) > 5000 then
    raise exception 'Comment cannot exceed 5000 characters.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_contribution_comment on public.contribution_comments;
create trigger trg_validate_contribution_comment
  before insert or update on public.contribution_comments
  for each row execute procedure public.validate_contribution_comment();


-- ── 7. TASKS VALIDATION ──
create or replace function public.validate_task()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Task title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Task title cannot exceed 255 characters.';
  end if;

  if new.admin_comment is not null and length(new.admin_comment) > 5000 then
    raise exception 'Admin comment cannot exceed 5000 characters.';
  end if;

  if new.progress is not null and (new.progress < 0 or new.progress > 100) then
    raise exception 'Progress must be between 0 and 100.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_task on public.tasks;
create trigger trg_validate_task
  before insert or update on public.tasks
  for each row execute procedure public.validate_task();


-- ── 8. COMPETITIONS VALIDATION ──
create or replace function public.validate_competition()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Competition title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Competition title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.prize_pool is not null and length(new.prize_pool) > 255 then
    raise exception 'Prize pool description cannot exceed 255 characters.';
  end if;

  if new.poster_url is not null and trim(new.poster_url) <> '' then
    if length(new.poster_url) > 2048 then
      raise exception 'Poster URL cannot exceed 2048 characters.';
    end if;
    if new.poster_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid poster URL format.';
    end if;
  end if;

  if new.competition_link is not null and trim(new.competition_link) <> '' then
    if length(new.competition_link) > 2048 then
      raise exception 'Competition link URL cannot exceed 2048 characters.';
    end if;
    if new.competition_link !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid competition link URL format.';
    end if;
  end if;

  if new.start_date is null then
    raise exception 'Start date is required.';
  end if;

  if new.registration_deadline is null then
    raise exception 'Registration deadline is required.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_competition on public.competitions;
create trigger trg_validate_competition
  before insert or update on public.competitions
  for each row execute procedure public.validate_competition();


-- ── 9. COMPETITION SUBMISSIONS VALIDATION ──
create or replace function public.validate_competition_submission()
returns trigger as $$
begin
  if new.team_name is null or trim(new.team_name) = '' then
    raise exception 'Team name / Alias is required and cannot be empty.';
  end if;
  if length(new.team_name) > 255 then
    raise exception 'Team name cannot exceed 255 characters.';
  end if;

  if new.result is not null and length(new.result) > 255 then
    raise exception 'Result cannot exceed 255 characters.';
  end if;

  if new.team_members is not null and length(new.team_members) > 5000 then
    raise exception 'Team members list cannot exceed 5000 characters.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_competition_submission on public.competition_submissions;
create trigger trg_validate_competition_submission
  before insert or update on public.competition_submissions
  for each row execute procedure public.validate_competition_submission();


-- ── 10. LEARNING RESOURCES VALIDATION ──
create or replace function public.validate_learning_resource()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Resource title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Resource title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.url is not null and trim(new.url) <> '' then
    if length(new.url) > 2048 then
      raise exception 'External URL cannot exceed 2048 characters.';
    end if;
    if new.url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid external URL format.';
    end if;
  end if;

  if new.file_url is not null and trim(new.file_url) <> '' then
    if length(new.file_url) > 2048 then
      raise exception 'File URL cannot exceed 2048 characters.';
    end if;
    if new.file_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid file URL format.';
    end if;
  end if;

  if new.file_name is not null and length(new.file_name) > 255 then
    raise exception 'File name cannot exceed 255 characters.';
  end if;

  if new.track is not null and length(new.track) > 255 then
    raise exception 'Track cannot exceed 255 characters.';
  end if;

  if new.duration_mins is not null and (new.duration_mins < 1 or new.duration_mins > 10000) then
    raise exception 'Duration must be between 1 and 10,000 minutes.';
  end if;

  if (new.url is null or trim(new.url) = '') and (new.file_url is null or trim(new.file_url) = '') then
    raise exception 'Either external URL or uploaded file is required.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_learning_resource on public.learning_resources;
create trigger trg_validate_learning_resource
  before insert or update on public.learning_resources
  for each row execute procedure public.validate_learning_resource();


-- ── 11. MESSAGES VALIDATION ──
create or replace function public.validate_message()
returns trigger as $$
begin
  if new.content is null or trim(new.content) = '' then
    raise exception 'Message content is required and cannot be empty.';
  end if;
  if length(new.content) > 5000 then
    raise exception 'Message content cannot exceed 5000 characters.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_message on public.messages;
create trigger trg_validate_message
  before insert or update on public.messages
  for each row execute procedure public.validate_message();


-- ── 12. MEETINGS VALIDATION ──
create or replace function public.validate_meeting()
returns trigger as $$
begin
  if new.title is null or trim(new.title) = '' then
    raise exception 'Meeting title is required and cannot be empty.';
  end if;
  if length(new.title) > 255 then
    raise exception 'Meeting title cannot exceed 255 characters.';
  end if;

  if new.description is not null and length(new.description) > 5000 then
    raise exception 'Description cannot exceed 5000 characters.';
  end if;

  if new.meeting_link is null or trim(new.meeting_link) = '' then
    raise exception 'Meeting link is required and cannot be empty.';
  end if;
  if length(new.meeting_link) > 2048 then
    raise exception 'Meeting link cannot exceed 2048 characters.';
  end if;
  if new.meeting_link !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
    raise exception 'Invalid meeting link format.';
  end if;

  if new.minutes_text is not null and length(new.minutes_text) > 100000 then
    raise exception 'Minutes text cannot exceed 100,000 characters.';
  end if;

  if new.minutes_doc_url is not null and trim(new.minutes_doc_url) <> '' then
    if length(new.minutes_doc_url) > 2048 then
      raise exception 'Minutes document URL cannot exceed 2048 characters.';
    end if;
    if new.minutes_doc_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid minutes document URL format.';
    end if;
  end if;

  if new.recording_url is not null and trim(new.recording_url) <> '' then
    if length(new.recording_url) > 2048 then
      raise exception 'Recording URL cannot exceed 2048 characters.';
    end if;
    if new.recording_url !~* '^https?://[A-Za-z0-9\-\._~:\/\?#\[\]@!\$&''\(\)\*\+,;=%]+$' then
      raise exception 'Invalid recording URL format.';
    end if;
  end if;

  if new.actual_duration_minutes is not null and (new.actual_duration_minutes < 1 or new.actual_duration_minutes > 10000) then
    raise exception 'Actual duration must be between 1 and 10,000 minutes.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_meeting on public.meetings;
create trigger trg_validate_meeting
  before insert or update on public.meetings
  for each row execute procedure public.validate_meeting();


-- ── 13. NOTIFICATIONS VALIDATION ──
create or replace function public.validate_notification()
returns trigger as $$
begin
  if new.message is null or trim(new.message) = '' then
    raise exception 'Notification message is required and cannot be empty.';
  end if;
  if length(new.message) > 5000 then
    raise exception 'Notification message cannot exceed 5000 characters.';
  end if;

  if new.title is not null and length(new.title) > 255 then
    raise exception 'Notification title cannot exceed 255 characters.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_notification on public.notifications;
create trigger trg_validate_notification
  before insert or update on public.notifications
  for each row execute procedure public.validate_notification();
