-- Migration: Summaries Table & Per-User Rate Limits for Chat Summarization

-- 1. Create summaries table to cache room summaries
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL UNIQUE, -- matches lobby ('lobby'), team id, or DM room identifier
  summary_text TEXT NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on summaries table
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view summaries
CREATE POLICY "Authenticated users can select summaries"
  ON public.summaries FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Create summary_usage table to enforce strict limit of 2 calls per user per day
CREATE TABLE IF NOT EXISTS public.summary_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Enable RLS on summary_usage table
ALTER TABLE public.summary_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own usage
CREATE POLICY "Users can view own summary usage"
  ON public.summary_usage FOR SELECT
  USING (auth.uid() = user_id);
