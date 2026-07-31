-- ============================================================================
-- SUPABASE STORAGE BUCKETS FOR UNIFIED STORAGE ARCHITECTURE
-- ============================================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Creates all buckets needed for the multi-provider storage system
-- ============================================================================

-- Enable storage extension if not already enabled
create extension if not exists "storage";

-- ============================================================================
-- BUCKET CREATION
-- ============================================================================

-- Avatar bucket (public - user profile pictures)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Contribution photos bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contribution-photos',
  'contribution-photos',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Competition assets bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'competition-assets',
  'competition-assets',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Event assets bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets',
  'event-assets',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Learning resources bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-resources',
  'learning-resources',
  true,
  52428800, -- 50MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/zip',
    'application/x-zip-compressed'
  ]
) on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/zip',
    'application/x-zip-compressed'
  ];

-- Project files bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  true,
  104857600, -- 100MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
) on conflict (id) do update set
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ];

-- Documents bucket (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  52428800, -- 50MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
  ]
) on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
  ];

-- Meeting recordings bucket (private - authenticated only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meeting-recordings',
  'meeting-recordings',
  false, -- Private bucket
  524288000, -- 500MB
  array['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav']
) on conflict (id) do update set
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = array['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav'];

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all storage buckets
alter table storage.objects enable row level security;

-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================

-- Anyone authenticated can view avatars
create policy "Authenticated users can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Users can upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage all avatars
create policy "Admins can manage all avatars"
  on storage.objects for all
  using (
    bucket_id = 'avatars'
    and public.get_my_role() in ('chairperson', 'vice_chairperson')
  );

-- ============================================================================
-- CONTRIBUTION PHOTOS BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view contribution photos"
  on storage.objects for select
  using (bucket_id = 'contribution-photos' and auth.role() = 'authenticated');

create policy "Users can upload contribution photos"
  on storage.objects for insert
  with check (
    bucket_id = 'contribution-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own contribution photos"
  on storage.objects for update
  using (
    bucket_id = 'contribution-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own contribution photos"
  on storage.objects for delete
  using (
    bucket_id = 'contribution-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins can manage all contribution photos"
  on storage.objects for all
  using (
    bucket_id = 'contribution-photos'
    and public.get_my_role() in ('chairperson', 'vice_chairperson')
  );

-- ============================================================================
-- COMPETITION ASSETS BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view competition assets"
  on storage.objects for select
  using (bucket_id = 'competition-assets' and auth.role() = 'authenticated');

create policy "Hosts can upload competition posters"
  on storage.objects for insert
  with check (
    bucket_id = 'competition-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Hosts can update competition assets"
  on storage.objects for update
  using (
    bucket_id = 'competition-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Hosts can delete competition assets"
  on storage.objects for delete
  using (
    bucket_id = 'competition-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

-- ============================================================================
-- EVENT ASSETS BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view event assets"
  on storage.objects for select
  using (bucket_id = 'event-assets' and auth.role() = 'authenticated');

create policy "Organizers can upload event banners"
  on storage.objects for insert
  with check (
    bucket_id = 'event-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Organizers can update event assets"
  on storage.objects for update
  using (
    bucket_id = 'event-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Organizers can delete event assets"
  on storage.objects for delete
  using (
    bucket_id = 'event-assets'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

-- ============================================================================
-- LEARNING RESOURCES BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view learning resources"
  on storage.objects for select
  using (bucket_id = 'learning-resources' and auth.role() = 'authenticated');

create policy "Department leads and admins can upload learning resources"
  on storage.objects for insert
  with check (
    bucket_id = 'learning-resources'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Uploaders can update learning resources"
  on storage.objects for update
  using (
    bucket_id = 'learning-resources'
    and auth.role() = 'authenticated'
    and (
      public.get_my_role() in ('chairperson', 'vice_chairperson')
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "Uploaders can delete learning resources"
  on storage.objects for delete
  using (
    bucket_id = 'learning-resources'
    and auth.role() = 'authenticated'
    and (
      public.get_my_role() in ('chairperson', 'vice_chairperson')
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ============================================================================
-- PROJECT FILES BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view project files"
  on storage.objects for select
  using (bucket_id = 'project-files' and auth.role() = 'authenticated');

create policy "Project members can upload project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

create policy "Project members can update project files"
  on storage.objects for update
  using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

create policy "Project members can delete project files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

-- ============================================================================
-- DOCUMENTS BUCKET POLICIES
-- ============================================================================

create policy "Authenticated users can view documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Authenticated users can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own documents"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- MEETING RECORDINGS BUCKET POLICIES (Private)
-- ============================================================================

create policy "Meeting attendees can view recordings"
  on storage.objects for select
  using (
    bucket_id = 'meeting-recordings'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.meeting_attendees ma
      join public.meetings m on m.id = ma.meeting_id
      where ma.member_id = auth.uid()
      and m.recording_url like '%' || storage.objects.name || '%'
    )
  );

create policy "Meeting creators can upload recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'meeting-recordings'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Meeting creators can update recordings"
  on storage.objects for update
  using (
    bucket_id = 'meeting-recordings'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

create policy "Meeting creators can delete recordings"
  on storage.objects for delete
  using (
    bucket_id = 'meeting-recordings'
    and auth.role() = 'authenticated'
    and public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
  );

-- ============================================================================
-- CORS CONFIGURATION (for direct browser uploads)
-- ============================================================================

-- Note: CORS must be configured in Supabase Dashboard > Storage > Settings
-- Or via API. Here's the recommended configuration:

/*
Allowed Origins:
- http://localhost:3000
- http://localhost:5173
- https://your-domain.com

Allowed Methods:
- GET
- POST
- PUT
- DELETE
- HEAD

Allowed Headers:
- *
- Authorization
- Content-Type
- x-client-info

Max Age: 3600
Expose Headers:
- Content-Length
- Content-Type
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all buckets created
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in (
  'avatars',
  'contribution-photos',
  'competition-assets',
  'event-assets',
  'learning-resources',
  'project-files',
  'documents',
  'meeting-recordings'
)
order by id;

-- Verify policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'objects' and schemaname = 'storage'
order by policyname;