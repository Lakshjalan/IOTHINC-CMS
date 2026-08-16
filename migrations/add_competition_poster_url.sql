-- ============================================================
-- Migration: Add poster_url to competitions table
-- Description: Adds a poster/image URL field to competitions for Cloudinary-hosted images
-- ============================================================

-- Add poster_url to competitions
alter table public.competitions add column if not exists poster_url text;

-- Add comment for documentation
comment on column public.competitions.poster_url is 'Cloudinary URL for competition poster/banner image';