-- ======================================
-- FIX: Add Missing github_repo_url Column
-- ======================================
-- The API requires this column - run in Supabase SQL Editor
-- ======================================

-- 1. Add the github_repo_url column
ALTER TABLE public.auto_preview_instances
ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

-- 2. Populate github_repo_url from existing owner/repo data
UPDATE public.auto_preview_instances
SET github_repo_url = 'https://github.com/' || owner || '/' || repo
WHERE github_repo_url IS NULL 
  AND owner IS NOT NULL 
  AND repo IS NOT NULL;

-- 3. Verify the fix
SELECT 
  'Column Added' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN github_repo_url IS NOT NULL THEN 1 END) as populated_records
FROM public.auto_preview_instances;

-- 4. Verify all API required columns now exist
SELECT 
  'API Required Columns' as status,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auto_preview_instances'
  AND column_name IN (
    'project_id', 'user_id', 'sprite_name', 
    'github_repo_url', 'github_branch', 'status', 
    'preview_url', 'port', 'error_message'
  );

-- ======================================
-- Done! All columns are now in place.
-- ======================================
