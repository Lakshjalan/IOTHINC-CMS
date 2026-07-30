-- meeting_details_migration.sql
-- Creates tables for structured meeting details: agenda items, action items, and decisions.

-- ═══════════════════════════════════════════════════════════════
-- TABLE: meetings (Pre-requisite check to avoid missing relation error)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  actual_duration_minutes integer,
  meeting_link text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status in ('scheduled','live','completed','cancelled')),
  minutes_text text,
  minutes_doc_url text,
  recording_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════
-- TABLE: meeting_agenda_items
-- Ordered agenda topics for each meeting
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes integer,          -- estimated time for this agenda item
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'discussed', 'deferred', 'skipped')),
  presenter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: meeting_action_items
-- Action items assigned to members during or after a meeting
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: meeting_decisions
-- Key decisions recorded during the meeting
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  decided_by text,                   -- free text: "Board vote", "Chairperson", etc.
  category text DEFAULT 'general'
    CHECK (category IN ('general', 'budget', 'policy', 'project', 'event', 'other')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES for query performance
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_agenda_meeting ON public.meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_assigned ON public.meeting_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON public.meeting_decisions(meeting_id);

-- ═══════════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES — meeting_agenda_items
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Select agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Insert agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Update agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Delete agenda items" ON public.meeting_agenda_items;

CREATE POLICY "Select agenda items" ON public.meeting_agenda_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insert agenda items" ON public.meeting_agenda_items
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
  );

CREATE POLICY "Update agenda items" ON public.meeting_agenda_items
  FOR UPDATE USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Delete agenda items" ON public.meeting_agenda_items
  FOR DELETE USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES — meeting_action_items
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Select action items" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Insert action items" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Update action items" ON public.meeting_action_items;
DROP POLICY IF EXISTS "Delete action items" ON public.meeting_action_items;

CREATE POLICY "Select action items" ON public.meeting_action_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insert action items" ON public.meeting_action_items
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
  );

CREATE POLICY "Update action items" ON public.meeting_action_items
  FOR UPDATE USING (
    -- Assigned member can update their own action items (mark complete, etc.)
    auth.uid() = assigned_to
    OR public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Delete action items" ON public.meeting_action_items
  FOR DELETE USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES — meeting_decisions
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Select decisions" ON public.meeting_decisions;
DROP POLICY IF EXISTS "Insert decisions" ON public.meeting_decisions;
DROP POLICY IF EXISTS "Update decisions" ON public.meeting_decisions;
DROP POLICY IF EXISTS "Delete decisions" ON public.meeting_decisions;

CREATE POLICY "Select decisions" ON public.meeting_decisions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insert decisions" ON public.meeting_decisions
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('chairperson', 'vice_chairperson', 'department_lead')
  );

CREATE POLICY "Update decisions" ON public.meeting_decisions
  FOR UPDATE USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Delete decisions" ON public.meeting_decisions
  FOR DELETE USING (
    public.get_my_role() IN ('chairperson', 'vice_chairperson')
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );
