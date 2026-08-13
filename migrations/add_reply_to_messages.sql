-- ============================================================
-- Migration: Add reply_to fields to messages table
-- Description: Allow users to reply to specific messages with parent context
-- ============================================================

-- 1. Add reply_to columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_text text,
  ADD COLUMN IF NOT EXISTS reply_to_sender_name text;

-- 2. Add index for performance on reply lookup queries
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
  ON public.messages(reply_to_id);
