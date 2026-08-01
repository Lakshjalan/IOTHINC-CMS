-- ============================================================
-- Migration: Message Deletion Feature (48-hour window)
-- Description: Allow users to delete their own messages within 48 hours
-- ============================================================

-- 1. Add columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Create function to enforce 48-hour deletion window
CREATE OR REPLACE FUNCTION public.check_message_deletion_window()
RETURNS TRIGGER AS $$
DECLARE
  hours_since_creation integer;
BEGIN
  -- Calculate hours since message was created
  SELECT EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600 
  INTO hours_since_creation;
  
  -- Only allow deletion if message was sent within 48 hours
  IF hours_since_creation > 48 THEN
    RAISE EXCEPTION 'Cannot delete message: message was sent more than 48 hours ago';
  END IF;
  
  -- Only allow the original sender to delete their message
  IF NEW.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete message: you are not the sender';
  END IF;
  
  -- Set deleted_at timestamp
  NEW.deleted_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger for message deletion validation
DROP TRIGGER IF EXISTS trg_check_message_deletion_window ON public.messages;
CREATE TRIGGER trg_check_message_deletion_window
  BEFORE UPDATE OF is_deleted ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND OLD.is_deleted = false)
  EXECUTE PROCEDURE public.check_message_deletion_window();

-- 4. Update RLS policies to handle soft deletes
-- Drop old read policy
DROP POLICY IF EXISTS "Users can read messages" ON public.messages;

-- Create new read policy that excludes deleted messages
CREATE POLICY "Users can read messages"
  ON public.messages FOR SELECT
  USING (
    (is_deleted = false)
    AND (
      -- Global lobby
      (receiver_id IS NULL AND team_id IS NULL)
      -- 1-on-1 DM
      OR (team_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
      -- Team chat: must be a member of the team
      OR (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = messages.team_id
          AND team_members.member_id = auth.uid()
      ))
    )
  );

-- 5. Create policy for users to update is_deleted flag on their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 6. Create a function to check if a message can be deleted (for frontend validation)
CREATE OR REPLACE FUNCTION public.can_delete_message(message_id uuid)
RETURNS boolean AS $$
DECLARE
  message_record RECORD;
  hours_since_creation numeric;
BEGIN
  -- Get message details
  SELECT id, sender_id, created_at 
  INTO message_record
  FROM public.messages
  WHERE id = message_id;
  
  -- If message doesn't exist, return false
  IF message_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if current user is the sender
  IF message_record.sender_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Calculate hours since message was created
  SELECT EXTRACT(EPOCH FROM (now() - message_record.created_at)) / 3600
  INTO hours_since_creation;
  
  -- Return true if within 48 hours
  RETURN hours_since_creation <= 48;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to get time remaining for deletion (for UI countdown)
CREATE OR REPLACE FUNCTION public.get_message_deletion_time_remaining(message_id uuid)
RETURNS TABLE(hours_remaining numeric, minutes_remaining numeric, can_delete boolean) AS $$
DECLARE
  message_record RECORD;
  total_minutes numeric;
  hours_remaining_calc numeric;
  minutes_remaining_calc numeric;
BEGIN
  -- Get message details
  SELECT id, sender_id, created_at 
  INTO message_record
  FROM public.messages
  WHERE id = message_id;
  
  -- If message doesn't exist or user is not sender, return 0
  IF message_record IS NULL OR message_record.sender_id != auth.uid() THEN
    RETURN QUERY SELECT 
      0::numeric, 
      0::numeric, 
      false;
    RETURN;
  END IF;
  
  -- Calculate remaining time
  SELECT EXTRACT(EPOCH FROM (message_record.created_at + interval '48 hours' - now())) / 60
  INTO total_minutes;
  
  -- Ensure we don't return negative values
  IF total_minutes <= 0 THEN
    RETURN QUERY SELECT 
      0::numeric, 
      0::numeric, 
      false;
  ELSE
    hours_remaining_calc := floor(total_minutes / 60);
    minutes_remaining_calc := total_minutes - (hours_remaining_calc * 60);
    
    RETURN QUERY SELECT 
      hours_remaining_calc, 
      minutes_remaining_calc, 
      true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add index for better performance on deletion queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_deleted_created 
ON public.messages(sender_id, is_deleted, created_at DESC);
