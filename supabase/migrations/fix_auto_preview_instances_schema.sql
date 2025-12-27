-- Fix auto_preview_instances table schema
-- This migration updates the table to match the Sprites preview API requirements

-- 1. Update status CHECK constraint to include 'provisioning'
ALTER TABLE auto_preview_instances
DROP CONSTRAINT IF EXISTS auto_preview_instances_status_check;

ALTER TABLE auto_preview_instances
ADD CONSTRAINT auto_preview_instances_status_check 
CHECK (status IN ('initializing', 'detecting_environment', 'installing', 'running', 'stopped', 'error', 'provisioning'));

-- 2. Make owner and repo nullable (since they'll be derived from repo URL)
ALTER TABLE auto_preview_instances
ALTER COLUMN owner DROP NOT NULL;

ALTER TABLE auto_preview_instances
ALTER COLUMN repo DROP NOT NULL;

-- 3. Add github_repo_url column if it doesn't exist
-- This stores the full GitHub URL (e.g., https://github.com/owner/repo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_preview_instances' AND column_name = 'github_repo_url'
  ) THEN
    ALTER TABLE auto_preview_instances ADD COLUMN github_repo_url TEXT;
  END IF;
END
$$;

-- 4. Add github_branch column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_preview_instances' AND column_name = 'github_branch'
  ) THEN
    ALTER TABLE auto_preview_instances ADD COLUMN github_branch TEXT DEFAULT 'main';
  END IF;
END
$$;

-- 5. Populate github_repo_url from existing repo column if not already set
UPDATE auto_preview_instances
SET github_repo_url = 'https://github.com/' || owner || '/' || repo
WHERE github_repo_url IS NULL AND owner IS NOT NULL AND repo IS NOT NULL;

-- 6. Populate github_branch from existing branch column if not already set
UPDATE auto_preview_instances
SET github_branch = branch
WHERE github_branch IS NULL AND branch IS NOT NULL;

-- Verify the migration was successful
-- Count records to ensure no data loss
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN github_repo_url IS NOT NULL THEN 1 END) as records_with_repo_url,
  COUNT(CASE WHEN status = 'provisioning' THEN 1 END) as provisioning_records
FROM auto_preview_instances;
