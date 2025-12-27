-- ======================================
-- DIAGNOSTIC: Preview System Status
-- ======================================
-- Run this to check everything is properly set up
-- ======================================

-- 1. Check table exists and shows all columns
SELECT 
  'Table Status' as check_type,
  COUNT(column_name) as column_count,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'auto_preview_instances'
GROUP BY table_schema, table_name;

-- 2. Check specific columns we need
SELECT 
  'Column Existence' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auto_preview_instances'
  AND column_name IN (
    'id', 'project_id', 'user_id', 'owner', 'repo', 'branch',
    'sprite_name', 'port', 'preview_url', 'status', 'github_branch', 'github_repo_url'
  )
ORDER BY column_name;

-- 3. Check RLS is enabled
SELECT 
  'RLS Status' as check_type,
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'auto_preview_instances' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check RLS policies
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd,
  (CASE WHEN qual LIKE '%auth.uid() IS NULL%' THEN 'Allows Service Role' ELSE 'Service Role Blocked' END) as service_role_access
FROM pg_policies
WHERE tablename = 'auto_preview_instances'
ORDER BY policyname;

-- 5. Check if we can select (service role test)
SELECT 
  'Service Role Access Test' as check_type,
  COUNT(*) as accessible_records
FROM public.auto_preview_instances;

-- 6. Check recent records
SELECT 
  'Recent Records' as check_type,
  id,
  project_id,
  status,
  error_message,
  created_at
FROM public.auto_preview_instances
ORDER BY created_at DESC
LIMIT 3;

-- 7. Check constraints and indexes
SELECT 
  'Indexes' as check_type,
  indexname
FROM pg_indexes
WHERE tablename = 'auto_preview_instances'
ORDER BY indexname;

-- ======================================
-- SUMMARY
-- ======================================
-- If all above return data:
-- ✅ Table exists with all columns
-- ✅ RLS allows service role access
-- ✅ Database schema is complete
-- ✅ API should work
--
-- If any errors or missing data:
-- ❌ Report which check failed
