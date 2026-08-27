-- Add missing columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS completion_request_status text,
ADD COLUMN IF NOT EXISTS completion_reg_no text,
ADD COLUMN IF NOT EXISTS completion_desc text;

-- Add the same columns to event_tasks if they are used there (batch_id is usually useful for both, but the query in useTasks.js only explicitly asks for them on tasks)
-- Wait, let's also add them to event_tasks just in case to keep parity
ALTER TABLE public.event_tasks 
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS completion_request_status text,
ADD COLUMN IF NOT EXISTS completion_reg_no text,
ADD COLUMN IF NOT EXISTS completion_desc text;

-- Reload the schema cache in Supabase so PostgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
