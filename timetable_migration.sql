-- =========================================================
-- IOTHINC SUPABASE TIMETABLE MIGRATION (60-Bit Bitmask Engine)
-- =========================================================
-- Supporting 5 Days (Mon-Fri) * 12 Time Slots = 60 Slots Total
-- Storage: varbit(60) (Negligible ~8 bytes per user)
-- =========================================================

-- 1. Drop existing table if recreating
DROP TABLE IF EXISTS public.member_schedules CASCADE;

-- 2. Create member_schedules table
CREATE TABLE public.member_schedules (
  member_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- 60 bits representing 5 days (Mon-Fri) * 12 slots
  busy_mask varbit(60) NOT NULL DEFAULT '000000000000000000000000000000000000000000000000000000000000'::varbit,
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.member_schedules ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Select member schedules" ON public.member_schedules;
DROP POLICY IF EXISTS "All own schedule" ON public.member_schedules;

-- 5. Policy: All authenticated members can view schedules for group availability & heatmaps
CREATE POLICY "Select member schedules" ON public.member_schedules
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 6. Policy: Members can insert/update/delete their own schedule
CREATE POLICY "All own schedule" ON public.member_schedules
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = member_id) 
  WITH CHECK (auth.uid() = member_id);

-- 7. Index for ultra-fast primary key joins
CREATE INDEX IF NOT EXISTS idx_member_schedules_member_id ON public.member_schedules(member_id);
