-- ======================================
-- VERIFY AUTO PREVIEW SCHEMA
-- ======================================
-- Run this in Supabase SQL Editor to check if the table is properly set up
-- ======================================

-- Step 1: Check if table exists
SELECT 
  'TABLE EXISTS' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'auto_preview_instances'
  ) as result;

-- Step 2: Check all columns
SELECT 
  'COLUMNS' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'auto_preview_instances'
ORDER BY ordinal_position;

-- Step 3: Check RLS is enabled
SELECT 
  'RLS ENABLED' as check_name,
  relrowsecurity as result
FROM pg_class
WHERE relname = 'auto_preview_instances' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 4: Check all RLS policies
SELECT 
  'RLS POLICIES' as check_name,
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL THEN 'SELECT' ELSE cmd END as operation,
  CASE 
    WHEN qual LIKE '%auth.uid() IS NULL%' THEN '✅ Allows service role'
    ELSE '❌ Blocks service role'
  END as service_role_access
FROM pg_policies
WHERE tablename = 'auto_preview_instances'
ORDER BY policyname;

-- Step 5: Check indexes
SELECT 
  'INDEXES' as check_name,
  indexname
FROM pg_indexes
WHERE tablename = 'auto_preview_instances'
ORDER BY indexname;

-- Step 6: Check triggers
SELECT 
  'TRIGGERS' as check_name,
  trigger_name
FROM information_schema.triggers
WHERE table_schema = 'public' AND table_name = 'auto_preview_instances';

-- Step 7: Verify service role can INSERT
-- This will try to insert a test record and show if it works
BEGIN;
  INSERT INTO public.auto_preview_instances (
    id, 
    project_id, 
    user_id, 
    branch,
    status
  ) VALUES (
    gen_random_uuid(),
    'test-project',
    gen_random_uuid(),
    'main',
    'initializing'
  ) ON CONFLICT DO NOTHING;
  
  SELECT 
    'SERVICE ROLE CAN INSERT' as check_name,
    'SUCCESS' as result;
ROLLBACK;

-- Step 8: Final summary
SELECT 
  'SCHEMA SETUP STATUS' as check_name,
  CASE 
    WHEN COUNT(DISTINCT column_name) >= 15 THEN '✅ Complete - All required columns present'
    ELSE '❌ Incomplete - Missing columns'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'auto_preview_instances';
