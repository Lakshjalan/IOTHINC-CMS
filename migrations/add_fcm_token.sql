-- Migration: add_fcm_token.sql
-- Adds the fcm_token column to the profiles table to support push notifications

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;
