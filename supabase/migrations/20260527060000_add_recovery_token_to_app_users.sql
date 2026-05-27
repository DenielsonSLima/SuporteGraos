-- Migration: Add recovery_token column to app_users table
-- Description: Adds recovery_token column to hold the token for password recovery, plus an index for fast lookups.

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS recovery_token text;

-- Create an index to make token lookup fast
CREATE INDEX IF NOT EXISTS idx_app_users_recovery_token ON public.app_users (recovery_token);
