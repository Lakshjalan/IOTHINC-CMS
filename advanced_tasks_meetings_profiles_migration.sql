-- Database Migration: Advanced Tasks, Meetings, and Profiles

-- 1. Profiles modifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS residence_type text CHECK (residence_type IN ('hosteller', 'day_scholar'));

-- 2. Meetings modifications
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'team')),
ADD COLUMN IF NOT EXISTS target_departments text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_team_ids uuid[] DEFAULT '{}';

-- 3. Tasks modifications
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS completion_request_status text NOT NULL DEFAULT 'none' CHECK (completion_request_status IN ('none', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS completion_reg_no text,
ADD COLUMN IF NOT EXISTS completion_desc text;
