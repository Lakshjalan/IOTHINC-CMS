-- Migration to add project fields (github_link, repo_url, etc.) safely if not already present
-- Run this in your Supabase SQL Editor

alter table public.projects 
  add column if not exists github_link text,
  add column if not exists repo_url text,
  add column if not exists milestone text,
  add column if not exists deadline date,
  add column if not exists category text;

-- Optional: ensure standard categories and defaults
alter table public.projects 
  alter column status set default 'planned';
