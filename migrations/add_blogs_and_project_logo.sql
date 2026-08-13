-- ============================================================
-- Migration: Add blogs table and project image_url
-- Description: Creates a blogs table for home page content and adds image_url to projects for custom logos
-- ============================================================

-- Add image_url to projects
alter table public.projects add column if not exists image_url text;

-- Create blogs table
create table public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.blogs enable row level security;

-- Policies for blogs
create policy "Read published blogs" on public.blogs for select using (
  published = true or 
  public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead') or 
  auth.uid() = author_id
);

create policy "Manage blogs" on public.blogs for all using (
  public.get_my_role() in ('chairperson', 'vice_chairperson', 'department_lead')
);
