-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TABLE: profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null default 'member' check (role in ('chairperson', 'vice_chairperson', 'department_lead', 'member')),
  department text,
  year text,
  skills text[],
  bio text,
  avatar_url text,
  github_url text,
  linkedin_url text,
  needs_approval boolean not null default true,
  created_at timestamptz default now()
);

-- TABLE: teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  lead_id uuid references public.profiles(id) on delete set null,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

-- TABLE: team_members
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now()
);

-- TABLE: events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text check (category in ('WORKSHOP','HACKATHON','SEMINAR','COMPETITION','OTHER')),
  venue text,
  event_date timestamptz,
  registration_deadline timestamptz,
  max_seats integer,
  status text default 'upcoming' check (status in ('upcoming','ongoing','past','cancelled')),
  organiser_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: registrations
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  status text default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  notify boolean default true,
  registered_at timestamptz default now(),
  unique(event_id, member_id)
);

-- TABLE: projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  status text default 'planned' check (status in ('planned','active','completed','blocked')),
  milestone text,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  deadline date,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: contributions
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  event_id uuid references public.events(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  categories text[],
  visibility text default 'public' check (visibility in ('public','private')),
  flagged boolean not null default false,
  created_at timestamptz default now()
);

-- TABLE: contribution_comments
create table public.contribution_comments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references public.contributions(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz default now()
);

-- TABLE: tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assigned_to uuid references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text default 'not_started' check (status in ('not_started','in_progress','completed','blocked')),
  priority text default 'medium' check (priority in ('high','medium','low')),
  progress integer default 0 check (progress >= 0 and progress <= 100),
  due_date date,
  admin_comment text,
  created_at timestamptz default now()
);

-- TABLE: notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text not null,
  type text check (type in ('event','announcement','task','system')),
  priority integer not null check (priority in (1, 2, 3)),
  target_role text check (target_role in ('all','chairperson','vice_chairperson','department_lead','member')),
  target_member_id uuid references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  sender_id uuid references public.profiles(id) on delete set null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- TABLE: competitions
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text check (type in ('hackathon','coding_contest','design_jam','other')),
  format text check (format in ('solo','team','both')),
  registration_deadline timestamptz,
  start_date timestamptz,
  prize_pool text,
  status text default 'active' check (status in ('active','completed','archived')),
  hosted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: competition_submissions
create table public.competition_submissions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  team_name text,
  status text default 'draft' check (status in ('draft','submitted','reviewed')),
  result text,
  created_at timestamptz default now()
);

-- TABLE: learning_resources
create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text check (type in ('VIDEO','ARTICLE','PDF','WORKSHOP')),
  description text,
  url text,
  file_url text,
  file_name text,
  track text,
  duration_mins integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Storage bucket for learning resource files
-- Run this in Supabase SQL Editor or create via Dashboard > Storage:
-- insert into storage.buckets (id, name, public) values ('learning-resources', 'learning-resources', true);

-- Helper function (defined AFTER tables exist)
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.projects enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_comments enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_submissions enable row level security;
alter table public.learning_resources enable row level security;

-- profiles
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile or admins can update any"
  on public.profiles for update
  using (auth.uid() = id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- events
create policy "Authenticated users can read all events"
  on public.events for select
  using (auth.role() = 'authenticated');

create policy "Admins and coordinators can modify events"
  on public.events for all
  using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

-- registrations
create policy "Select registration"
  on public.registrations for select
  using (auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

create policy "Insert registration"
  on public.registrations for insert
  with check (auth.uid() = member_id);

create policy "Delete registration"
  on public.registrations for delete
  using (auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- contributions
create policy "Select contribution"
  on public.contributions for select
  using (visibility = 'public' or auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

create policy "Insert contribution"
  on public.contributions for insert
  with check (auth.uid() = member_id);

create policy "Update or delete contribution"
  on public.contributions for all
  using (auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- contribution_comments
create policy "Select comments"
  on public.contribution_comments for select
  using (auth.role() = 'authenticated');

create policy "Insert comment"
  on public.contribution_comments for insert
  with check (auth.uid() = author_id);

create policy "Update or delete comment"
  on public.contribution_comments for all
  using (auth.uid() = author_id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- tasks
create policy "Select task"
  on public.tasks for select
  using (auth.uid() = assigned_to or public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

create policy "Insert/update task (admin/coordinator)"
  on public.tasks for all
  using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

create policy "Update task progress (assigned member)"
  on public.tasks for update
  using (auth.uid() = assigned_to)
  with check (auth.uid() = assigned_to);

-- notifications
create policy "Select notification"
  on public.notifications for select
  using (
    auth.uid() = target_member_id
    or target_role = 'all'
    or target_role = public.get_my_role()
    or public.get_my_role() in ('chairperson', 'vice_chairperson')
  );

create policy "Insert notification (admin/coordinator)"
  on public.notifications for insert
  with check (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

create policy "Update notification (is_read)"
  on public.notifications for update
  using (auth.uid() = target_member_id)
  with check (auth.uid() = target_member_id);

-- teams
create policy "Select teams" on public.teams for select using (auth.role() = 'authenticated');
create policy "Modify teams" on public.teams for all using (public.get_my_role() in ('chairperson', 'vice_chairperson') or lead_id = auth.uid());

-- team_members
create policy "Select team_members" on public.team_members for select using (auth.role() = 'authenticated');
create policy "Modify team_members" on public.team_members for all using (public.get_my_role() in ('chairperson', 'vice_chairperson') or team_id in (select id from public.teams where lead_id = auth.uid()));

-- projects
create policy "Select projects" on public.projects for select using (auth.role() = 'authenticated');
create policy "Modify projects" on public.projects for all using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

-- competitions
create policy "Select competitions" on public.competitions for select using (auth.role() = 'authenticated');
create policy "Modify competitions" on public.competitions for all
  using (public.get_my_role() in ('chairperson', 'vice_chairperson') or (public.get_my_role() = 'department_lead' and hosted_by = auth.uid()));

-- competition_submissions
create policy "Select submissions" on public.competition_submissions for select
  using (auth.role() = 'authenticated');
create policy "Insert submissions" on public.competition_submissions for insert
  with check (auth.uid() = member_id);
create policy "Modify submissions" on public.competition_submissions for all
  using (auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson'));

-- learning_resources
create policy "Select resources" on public.learning_resources for select using (auth.role() = 'authenticated');

create policy "Insert resources" on public.learning_resources for insert
  with check (
    public.get_my_role() in ('chairperson', 'vice_chairperson')
    or (public.get_my_role() = 'department_lead' and uploaded_by = auth.uid())
  );

create policy "Update resources" on public.learning_resources for update
  using (
    public.get_my_role() in ('chairperson', 'vice_chairperson')
    or (public.get_my_role() = 'department_lead' and uploaded_by = auth.uid())
  );

create policy "Delete resources" on public.learning_resources for delete
  using (
    public.get_my_role() in ('chairperson', 'vice_chairperson')
    or (public.get_my_role() = 'department_lead' and uploaded_by = auth.uid())
  );

-- TABLE: messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can read their own messages or global lobby messages"
  on public.messages for select
  using (
    receiver_id is null 
    or auth.uid() = sender_id 
    or auth.uid() = receiver_id
  );

create policy "Users can insert messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can update read status of received messages"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- Enable Realtime for messages table
-- To actually enable this on a live Supabase project, you must also turn it on in the Dashboard or via:
-- alter publication supabase_realtime add table public.messages;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, needs_approval)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'member',
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- TABLE: meetings
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_duration_minutes integer,
  meeting_link text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','live','completed','cancelled')),
  platform text not null default 'other'
    check (platform in ('zoom','google_meet','teams','other','in_person')),
  minutes_text text,
  minutes_doc_url text,
  recording_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: meeting_attendees
create table public.meeting_attendees (
  meeting_id uuid references public.meetings(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (meeting_id, member_id)
);

alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;

create policy "Select meetings" on public.meetings
  for select using (auth.role() = 'authenticated');

create policy "Create meetings" on public.meetings
  for insert with check (public.get_my_role() in ('chairperson','vice_chairperson','department_lead'));

create policy "Update meetings" on public.meetings
  for update using (
    auth.uid() = created_by
    or public.get_my_role() in ('chairperson','vice_chairperson')
  );

create policy "Select attendees" on public.meeting_attendees
  for select using (auth.role() = 'authenticated');

create policy "Join meeting" on public.meeting_attendees
  for insert with check (auth.uid() = member_id);

-- ═══════════════════════════════════════════════════════════════
-- CAPACITY, DURATION, AND CONTENT CHECK CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════
alter table public.events add constraint events_max_seats_check check (max_seats is null or max_seats > 0);
alter table public.learning_resources add constraint learning_resources_duration_check check (duration_mins is null or duration_mins > 0);
alter table public.meetings add constraint meetings_duration_check check (actual_duration_minutes is null or actual_duration_minutes > 0);
alter table public.messages add constraint messages_content_length_check check (length(trim(content)) > 0);

-- ═══════════════════════════════════════════════════════════════
-- PROJECT SUBTASKS CUMULATIVE WEIGHT TRIGGER
-- ═══════════════════════════════════════════════════════════════
create or replace function public.check_project_subtasks_weight()
returns trigger as $$
declare
  total_weight integer;
begin
  if new.project_id is not null then
    select coalesce(sum(progress), 0) into total_weight
    from public.tasks
    where project_id = new.project_id and id != new.id;
    
    if (total_weight + new.progress) > 100 then
      raise exception 'Total subtask weightage for this project cannot exceed 100%%. Current total: %, Attempted: %', total_weight, new.progress;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_subtask_weight
  before insert or update on public.tasks
  for each row execute procedure public.check_project_subtasks_weight();

-- ═══════════════════════════════════════════════════════════════
-- WRITE RATE LIMITING TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- 1. Rate Limiting for public.messages
create or replace function public.check_message_rate_limit()
returns trigger as $$
declare
  recent_count integer;
  caller_role text;
begin
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

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
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

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
  select coalesce(role, 'member') into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role in ('chairperson', 'vice_chairperson') then
    return new;
  end if;

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


-- ═══════════════════════════════════════════════════════════════
-- MISSING TABLES & SCHEMAS (SYNCED FROM LIVE DATABASE)
-- ═══════════════════════════════════════════════════════════════

-- TABLE: meeting_agenda_items
create table public.meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer,
  sort_order integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'discussed', 'deferred', 'skipped')),
  presenter_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: meeting_action_items
create table public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: meeting_decisions
create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  description text,
  decided_by text,
  category text default 'general' check (category in ('general', 'budget', 'policy', 'project', 'event', 'other')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: team_join_requests
create table public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  request_message text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  requested_at timestamptz default now(),
  unique(team_id, member_id)
);

-- TABLE: event_teams
create table public.event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  max_members integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: event_team_members
create table public.event_team_members (
  id uuid primary key default gen_random_uuid(),
  event_team_id uuid not null references public.event_teams(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'active' check (status in ('active', 'pending', 'rejected')),
  request_message text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  joined_at timestamptz default now(),
  unique (event_team_id, member_id)
);

-- TABLE: event_tasks
create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_team_id uuid not null references public.event_teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- TABLE: member_schedules
create table public.member_schedules (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  busy_mask bit varying not null default '000000000000000000000000000000000000000000000000000000000000'::bit varying,
  updated_at timestamptz default now()
);

-- Enable RLS on new tables
alter table public.meeting_agenda_items enable row level security;
alter table public.meeting_action_items enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.team_join_requests enable row level security;
alter table public.event_teams enable row level security;
alter table public.event_team_members enable row level security;
alter table public.event_tasks enable row level security;
alter table public.member_schedules enable row level security;

-- Policies for meeting_agenda_items
create policy "Select agenda items" on public.meeting_agenda_items for select using (auth.role() = 'authenticated');
create policy "Insert agenda items" on public.meeting_agenda_items for insert with check (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));
create policy "Update agenda items" on public.meeting_agenda_items for update using (public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));
create policy "Delete agenda items" on public.meeting_agenda_items for delete using (public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));

-- Policies for meeting_action_items
create policy "Select action items" on public.meeting_action_items for select using (auth.role() = 'authenticated');
create policy "Insert action items" on public.meeting_action_items for insert with check (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));
create policy "Update action items" on public.meeting_action_items for update using (auth.uid() = assigned_to or public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));
create policy "Delete action items" on public.meeting_action_items for delete using (public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));

-- Policies for meeting_decisions
create policy "Select decisions" on public.meeting_decisions for select using (auth.role() = 'authenticated');
create policy "Insert decisions" on public.meeting_decisions for insert with check (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));
create policy "Update decisions" on public.meeting_decisions for update using (public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));
create policy "Delete decisions" on public.meeting_decisions for delete using (public.get_my_role() in ('chairperson', 'vice_chairperson') or exists (select 1 from public.meetings m where m.id = meeting_id and m.created_by = auth.uid()));

-- Policies for team_join_requests
create policy "Member can submit join request" on public.team_join_requests for insert with check (auth.uid() = member_id);
create policy "Read team join requests" on public.team_join_requests for select using (auth.uid() = member_id or public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead') or team_id in (select id from public.teams where lead_id = auth.uid()));
create policy "Team leads and admin manage requests" on public.team_join_requests for all using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead') or team_id in (select id from public.teams where lead_id = auth.uid()));

-- Policies for event_teams
create policy "Read event_teams" on public.event_teams for select using (auth.role() = 'authenticated');
create policy "Manage event_teams" on public.event_teams for all using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

-- Policies for event_team_members
create policy "Read event_team_members" on public.event_team_members for select using (auth.role() = 'authenticated');
create policy "Member can request join event team" on public.event_team_members for insert with check (auth.uid() = member_id);
create policy "Lead manage event_team_members" on public.event_team_members for all using (event_team_id in (select id from public.event_teams where created_by = auth.uid()));
create policy "Admin manage event_team_members" on public.event_team_members for all using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead'));

-- Policies for event_tasks
create policy "Read event_tasks" on public.event_tasks for select using (auth.role() = 'authenticated');
create policy "Assignee can update event task status" on public.event_tasks for update using (auth.uid() = assigned_to);
create policy "Manage event_tasks" on public.event_tasks for all using (public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead') or event_team_id in (select id from public.event_teams where created_by = auth.uid()));

-- Policies for member_schedules
create policy "Select member schedules" on public.member_schedules for select using (auth.role() = 'authenticated');
create policy "All own schedule" on public.member_schedules for all using (auth.uid() = member_id);


-- ═══════════════════════════════════════════════════════════════
-- PROFILE VALIDATION & ROLE PROTECTION TRIGGERS
-- ═══════════════════════════════════════════════════════════════

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

  -- Optional text field checks
  if new.department is not null and length(new.department) > 255 then
    raise exception 'Department cannot exceed 255 characters.';
  end if;
  if new.year is not null and length(new.year) > 50 then
    raise exception 'Academic year cannot exceed 50 characters.';
  end if;
  if new.bio is not null and length(new.bio) > 5000 then
    raise exception 'Bio cannot exceed 5000 characters.';
  end if;

  -- URL checks
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

  -- 1. On INSERT:
  if TG_OP = 'INSERT' then
    if new.role <> 'member' or new.needs_approval <> true then
      if (select coalesce(role, 'member') from public.profiles where id = auth.uid()) not in ('chairperson', 'vice_chairperson') then
        new.role := 'member';
        new.needs_approval := true;
      end if;
    end if;
  end if;

  -- 2. On UPDATE:
  if TG_OP = 'UPDATE' then
    if old.role IS DISTINCT FROM new.role or old.needs_approval IS DISTINCT FROM new.needs_approval then
      if (select coalesce(role, 'member') from public.profiles where id = auth.uid()) not in ('chairperson', 'vice_chairperson') then
        raise exception 'Access Denied: You do not have permission to modify roles or approval status.';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_validate_profile on public.profiles;
create trigger trg_validate_profile
  before insert or update on public.profiles
  for each row execute procedure public.validate_profile();

-- Role Rank helper function
create or replace function public.role_rank(r text)
returns integer as $$
begin
  return case r
    when 'chairperson' then 4
    when 'vice_chairperson' then 3
    when 'department_lead' then 2
    else 1
  end;
end;
$$ language plpgsql;

-- Self-promotion block trigger
create or replace function public.prevent_self_role_escalation()
returns trigger as $$
declare
  actor_rank int := public.role_rank(public.get_my_role());
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception 'You cannot change your own role';
  end if;

  if new.needs_approval is distinct from old.needs_approval and auth.uid() = old.id then
    raise exception 'You cannot change your own approval status';
  end if;

  if new.role is distinct from old.role and auth.uid() <> old.id then
    if actor_rank <= public.role_rank(old.role) or actor_rank <= public.role_rank(new.role) then
      raise exception 'You can only assign roles below your own rank, to members below your own rank';
    end if;
  end if;

  if new.needs_approval is distinct from old.needs_approval and auth.uid() <> old.id then
    if public.get_my_role() not in ('chairperson', 'vice_chairperson') then
      raise exception 'Only chairperson or vice chairperson can change approval status';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_profile_privilege_columns on public.profiles;
create trigger guard_profile_privilege_columns
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_escalation();-- Function to securely delete a user from auth.users (which cascades to public.profiles)
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
