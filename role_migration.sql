-- role_migration.sql
-- This script migrates the database to the new roles and adds the title to announcements.

-- 1. Add title to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;

-- 2. Drop existing role constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_target_role_check;

-- 3. Migrate existing roles
-- 'admin' becomes 'chairperson' or 'vice_chairperson' (defaulting to chairperson for simplicity, you can manually adjust later)
UPDATE public.profiles SET role = 'chairperson' WHERE role = 'admin';
-- 'coordinator' becomes 'department_lead'
UPDATE public.profiles SET role = 'department_lead' WHERE role = 'coordinator';

-- Migrate target_roles in notifications
UPDATE public.notifications SET target_role = 'chairperson' WHERE target_role = 'admin';
UPDATE public.notifications SET target_role = 'department_lead' WHERE target_role = 'coordinator';

-- 4. Add new check constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role in ('chairperson', 'vice_chairperson', 'department_lead', 'member'));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_target_role_check CHECK (target_role in ('all', 'chairperson', 'vice_chairperson', 'department_lead', 'member'));

-- Note: RLS policies will be automatically updated by replacing the old schema.sql and re-running it,
-- or you can manually drop and recreate the specific policies as needed based on the new schema.sql.
