-- promote_user.sql
-- Run this in your Supabase SQL Editor to promote your user account to chairperson (admin role)
-- and approve your profile, which will allow you to bypass RLS restrictions for scheduling meetings.

-- 1. Replace 'your_email@example.com' with the email address you use to log in:
UPDATE public.profiles
SET 
  role = 'chairperson',
  needs_approval = false
WHERE email = 'your_email@example.com'; -- <-- CHANGE THIS TO YOUR EMAIL

-- 2. Verify that the update succeeded and displays your correct role:
SELECT id, full_name, email, role, needs_approval 
FROM public.profiles 
WHERE email = 'your_email@example.com'; -- <-- CHANGE THIS TO YOUR EMAIL
