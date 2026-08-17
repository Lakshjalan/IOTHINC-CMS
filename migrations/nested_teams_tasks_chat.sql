-- Add parent_team_id to event_teams
ALTER TABLE public.event_teams 
ADD COLUMN parent_team_id UUID REFERENCES public.event_teams(id) ON DELETE CASCADE;

-- Add parent_task_id to event_tasks
ALTER TABLE public.event_tasks 
ADD COLUMN parent_task_id UUID REFERENCES public.event_tasks(id) ON DELETE CASCADE;

-- Add event_team_id to messages
ALTER TABLE public.messages
ADD COLUMN event_team_id UUID REFERENCES public.event_teams(id) ON DELETE CASCADE;

-- Update RLS policies for messages table to support event_team_id
-- We need to check if the user is part of the event_team_members for that team.

-- Note: The existing "Users can read their own messages or global lobby messages" might need adjusting
-- to exclude event team messages if they aren't part of the team, or we add a new policy specifically for event team messages.

-- Drop existing select policy to recreate it with event_team_id consideration
DROP POLICY IF EXISTS "Users can read their own messages or global lobby messages" ON public.messages;

-- Create new comprehensive select policy
CREATE POLICY "Users can read messages"
  ON public.messages FOR SELECT
  USING (
    -- Global lobby messages (both receiver and event_team are null)
    (receiver_id IS NULL AND event_team_id IS NULL)
    -- Direct messages
    OR auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    -- Event team messages (user must be a member of the event team)
    OR (
      event_team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.event_team_members
        WHERE event_team_members.event_team_id = messages.event_team_id
          AND event_team_members.member_id = auth.uid()
          AND event_team_members.status = 'active'
      )
    )
  );

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

-- Create new insert policy
CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- If inserting an event team message, user must be a member
      event_team_id IS NULL OR EXISTS (
        SELECT 1 FROM public.event_team_members
        WHERE event_team_members.event_team_id = messages.event_team_id
          AND event_team_members.member_id = auth.uid()
          AND event_team_members.status = 'active'
      )
    )
  );
