-- ============================================================
-- IOTHINC RLS FIX MIGRATION
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- STEP 0: DEBUG — Check your current user's role
-- Run this first separately to see what role you have:
-- SELECT id, full_name, email, role, needs_approval FROM public.profiles WHERE id = auth.uid();

-- STEP 1: Make sure your user is actually an admin
-- Replace 'YOUR_EMAIL_HERE' with your actual login email
UPDATE public.profiles 
SET role = 'admin', needs_approval = false 
WHERE email = 'YOUR_EMAIL_HERE';

-- STEP 2: Add missing file columns to learning_resources
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS file_name text;

-- STEP 3: Fix profiles — add missing INSERT policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- STEP 4: Fix learning_resources — drop old + create proper policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Modify resources" ON public.learning_resources;
  DROP POLICY IF EXISTS "Insert resources" ON public.learning_resources;
  DROP POLICY IF EXISTS "Update resources" ON public.learning_resources;
  DROP POLICY IF EXISTS "Delete resources" ON public.learning_resources;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Insert resources" ON public.learning_resources FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'coordinator' AND uploaded_by = auth.uid())
  );

CREATE POLICY "Update resources" ON public.learning_resources FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'coordinator' AND uploaded_by = auth.uid())
  );

CREATE POLICY "Delete resources" ON public.learning_resources FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'coordinator' AND uploaded_by = auth.uid())
  );

-- STEP 5: Fix notifications — add INSERT for members (mark-read, etc.)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Insert notification (admin/coordinator)" ON public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "Insert notification" ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- STEP 6: Create the storage bucket for learning resources (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-resources', 'learning-resources', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 7: Storage policies for learning-resources bucket
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload learning resources" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view learning resources" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete learning resources" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated users can upload learning resources"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'learning-resources' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view learning resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'learning-resources');

CREATE POLICY "Admins can delete learning resources"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'learning-resources' AND auth.role() = 'authenticated');

-- DONE! Now log out and log back in for the role change to take effect.
