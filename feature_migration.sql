-- ============================================================
-- IOTHINC Feature Migration  (safe to re-run — all idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. competition_submissions: add team_members column ─────
alter table public.competition_submissions
  add column if not exists team_members text;

-- ── 2. competitions: add poster_url + competition_link ───────
alter table public.competitions
  add column if not exists poster_url text;
alter table public.competitions
  add column if not exists competition_link text;

-- ── 3. tasks: sub-task metadata (no new columns needed) ──────
-- Uses existing admin_comment field tagged as 'subtask:{JSON}'

-- ── 4. messages: team_id for department / event-team chat ────
alter table public.messages
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

-- ── 5. messages RLS: allow team-scoped reads ─────────────────
drop policy if exists "Users can read their own messages or global lobby messages" on public.messages;
drop policy if exists "Users can read messages" on public.messages;

create policy "Users can read messages"
  on public.messages for select
  using (
    receiver_id is null
    or auth.uid() = sender_id
    or auth.uid() = receiver_id
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = messages.team_id
          and tm.member_id = auth.uid()
      )
    )
    or (
      team_id is not null
      and exists (
        select 1 from public.event_team_members etm
        where etm.event_team_id = messages.team_id
          and etm.member_id = auth.uid()
          and etm.status = 'active'
      )
    )
  );

-- ════════════════════════════════════════════════════════════
-- ── 6. Storage: competition-assets bucket + RLS policies ────
-- ════════════════════════════════════════════════════════════

-- 6a. Create the bucket (public = true so poster URLs are readable without auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'competition-assets',
  'competition-assets',
  true,
  5242880,   -- 5 MB max per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- 6b. Drop any stale policies on this bucket (idempotent)
drop policy if exists "competition-assets: public read"  on storage.objects;
drop policy if exists "competition-assets: auth upload"  on storage.objects;
drop policy if exists "competition-assets: auth update"  on storage.objects;
drop policy if exists "competition-assets: auth delete"  on storage.objects;

-- 6c. PUBLIC SELECT — anyone can view poster images via public URL
create policy "competition-assets: public read"
  on storage.objects for select
  using ( bucket_id = 'competition-assets' );

-- 6d. INSERT — any authenticated user can upload
--     (the UI already restricts this button to admin/coordinator only)
create policy "competition-assets: auth upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'competition-assets' );

-- 6e. UPDATE — authenticated user can overwrite / replace a poster
create policy "competition-assets: auth update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'competition-assets' );

-- 6f. DELETE — authenticated user can remove a poster
create policy "competition-assets: auth delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'competition-assets' );

-- ============================================================
-- Done! All changes are additive — no data loss.
-- ============================================================
