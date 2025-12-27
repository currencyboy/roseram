-- Fix user_env_vars updated_at column issue
-- Run this in Supabase SQL Editor if you're getting "record has no field updated_at" errors

-- OPTION 1: Drop the trigger that's causing the error
-- This is the quickest fix if you don't need automatic updated_at tracking
DROP TRIGGER IF EXISTS update_user_env_vars_updated_at ON public.user_env_vars;

-- OPTION 2: Make the column nullable if it exists
-- This prevents the "NOT NULL" requirement from causing issues
ALTER TABLE public.user_env_vars 
ALTER COLUMN updated_at DROP NOT NULL;

-- OPTION 3: If the column doesn't exist at all, the above won't hurt
-- The API code will work fine without it

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_env_vars';
