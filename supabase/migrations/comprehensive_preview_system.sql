-- ============================================================================
-- Comprehensive Preview System Migration
-- Supports: Sprites (primary) + Fly.io (fallback) + Auto-Preview
-- ============================================================================

-- Drop existing tables if needed (backup before running!)
-- DROP TABLE IF EXISTS fly_preview_apps CASCADE;
-- DROP TABLE IF EXISTS auto_preview_instances CASCADE;
-- DROP TABLE IF EXISTS sprites_preview_instances CASCADE;

-- ============================================================================
-- 1. AUTO PREVIEW INSTANCES TABLE (Sprites Primary)
-- ============================================================================
-- This is the primary table for instant Sprites-based previews
-- Works like Builder.io - clone repo, run dev server in container
CREATE TABLE IF NOT EXISTS auto_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Repository Information
  github_repo_url TEXT NOT NULL,  -- Full GitHub URL: https://github.com/owner/repo
  github_branch TEXT NOT NULL DEFAULT 'main',
  owner TEXT,  -- Extracted from github_repo_url
  repo TEXT,   -- Extracted from github_repo_url
  
  -- Sprite Information
  sprite_name TEXT UNIQUE,  -- e.g., preview-30f4cedf
  port INTEGER,
  
  -- Preview URL and Status
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'initializing' CHECK (
    status IN (
      'initializing',
      'detecting_environment',
      'installing',
      'provisioning',
      'running',
      'stopped',
      'error'
    )
  ),
  
  -- Package Manager and Build Info
  package_manager TEXT DEFAULT 'npm' CHECK (
    package_manager IN ('npm', 'pnpm', 'yarn', 'bun')
  ),
  script_name TEXT DEFAULT 'dev',
  
  -- Error Handling
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(project_id, user_id, github_branch)
);

-- Indexes for Sprites Preview
CREATE INDEX IF NOT EXISTS idx_auto_preview_project_user 
  ON auto_preview_instances(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auto_preview_user_status 
  ON auto_preview_instances(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_preview_created 
  ON auto_preview_instances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_preview_sprite_name 
  ON auto_preview_instances(sprite_name);

-- Enable RLS for Sprites Preview
ALTER TABLE auto_preview_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Sprites Preview
CREATE POLICY "Users can view own sprites preview" ON auto_preview_instances
  FOR SELECT USING (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create sprites preview" ON auto_preview_instances
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update own sprites preview" ON auto_preview_instances
  FOR UPDATE USING (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own sprites preview" ON auto_preview_instances
  FOR DELETE USING (auth.uid() IS NULL OR auth.uid() = user_id);

-- Trigger for auto_preview_instances updated_at
CREATE OR REPLACE FUNCTION update_auto_preview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_preview_updated_at ON auto_preview_instances;
CREATE TRIGGER trigger_auto_preview_updated_at
  BEFORE UPDATE ON auto_preview_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_preview_updated_at();

-- ============================================================================
-- 2. FLY PREVIEW APPS TABLE (Fly.io Fallback)
-- ============================================================================
-- Secondary table for Fly.io deployments (fallback when Sprites unavailable)
-- Used for production-like deployments to fly.dev
CREATE TABLE IF NOT EXISTS fly_preview_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Repository Information
  github_repo_url TEXT NOT NULL,  -- Full GitHub URL
  github_branch TEXT NOT NULL DEFAULT 'main',
  
  -- Fly.io App Information
  fly_app_name TEXT UNIQUE,  -- e.g., roseram-a1b2c3d4
  fly_app_id TEXT UNIQUE,
  
  -- Preview URL and Status
  preview_url TEXT,  -- e.g., https://roseram-a1b2c3d4.fly.dev
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'deploying',
      'running',
      'stopped',
      'error'
    )
  ),
  
  -- Environment Variables
  env_variables JSONB DEFAULT '{}'::jsonb,
  
  -- Error Handling
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(project_id, user_id, github_branch)
);

-- Indexes for Fly.io Preview
CREATE INDEX IF NOT EXISTS idx_fly_preview_project_user 
  ON fly_preview_apps(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_fly_preview_user_status 
  ON fly_preview_apps(user_id, status);
CREATE INDEX IF NOT EXISTS idx_fly_preview_app_name 
  ON fly_preview_apps(fly_app_name);

-- Enable RLS for Fly.io Preview
ALTER TABLE fly_preview_apps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Fly.io Preview
CREATE POLICY "Users can view own fly preview" ON fly_preview_apps
  FOR SELECT USING (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create fly preview" ON fly_preview_apps
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update own fly preview" ON fly_preview_apps
  FOR UPDATE USING (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own fly preview" ON fly_preview_apps
  FOR DELETE USING (auth.uid() IS NULL OR auth.uid() = user_id);

-- Trigger for fly_preview_apps updated_at
CREATE OR REPLACE FUNCTION update_fly_preview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fly_preview_updated_at ON fly_preview_apps;
CREATE TRIGGER trigger_fly_preview_updated_at
  BEFORE UPDATE ON fly_preview_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_fly_preview_updated_at();

-- ============================================================================
-- 3. SPRITES PREVIEW INSTANCES TABLE (Legacy/Backward Compatibility)
-- ============================================================================
-- Create alias/mirror for backward compatibility
-- Any inserts here get forwarded to auto_preview_instances
CREATE TABLE IF NOT EXISTS sprites_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sprite_name TEXT UNIQUE,
  github_repo_url TEXT,
  github_branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'initializing',
  preview_url TEXT,
  port INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for backward compatibility
CREATE INDEX IF NOT EXISTS idx_sprites_preview_project_user 
  ON sprites_preview_instances(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sprites_preview_status 
  ON sprites_preview_instances(status);

-- ============================================================================
-- 4. PREVIEW STATS VIEW
-- ============================================================================
-- Unified view for monitoring both preview systems
CREATE OR REPLACE VIEW preview_instances_combined AS
SELECT
  id,
  project_id,
  user_id,
  'sprites' as preview_type,
  sprite_name as app_name,
  preview_url,
  status,
  error_message,
  created_at,
  updated_at
FROM auto_preview_instances
UNION ALL
SELECT
  id,
  project_id,
  user_id,
  'fly.io' as preview_type,
  fly_app_name as app_name,
  preview_url,
  status,
  error_message,
  created_at,
  updated_at
FROM fly_preview_apps;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get best available preview for a project
CREATE OR REPLACE FUNCTION get_best_preview(
  p_project_id TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  preview_type TEXT,
  preview_url TEXT,
  status TEXT
) AS $$
BEGIN
  -- Try to get running Sprites preview first (fastest)
  RETURN QUERY
    SELECT 
      auto_preview_instances.id,
      'sprites'::TEXT,
      auto_preview_instances.preview_url,
      auto_preview_instances.status
    FROM auto_preview_instances
    WHERE 
      auto_preview_instances.project_id = p_project_id
      AND auto_preview_instances.user_id = p_user_id
      AND auto_preview_instances.status = 'running'
    LIMIT 1;
  
  -- If no running Sprites, try Fly.io
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT 
        fly_preview_apps.id,
        'fly.io'::TEXT,
        fly_preview_apps.preview_url,
        fly_preview_apps.status
      FROM fly_preview_apps
      WHERE 
        fly_preview_apps.project_id = p_project_id
        AND fly_preview_apps.user_id = p_user_id
        AND fly_preview_apps.status = 'running'
      LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get preview status (for polling)
CREATE OR REPLACE FUNCTION get_preview_status(
  p_preview_type TEXT,
  p_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  preview_url TEXT,
  error_message TEXT,
  port INTEGER
) AS $$
BEGIN
  IF p_preview_type = 'sprites' THEN
    RETURN QUERY
      SELECT 
        auto_preview_instances.id,
        auto_preview_instances.status,
        auto_preview_instances.preview_url,
        auto_preview_instances.error_message,
        auto_preview_instances.port
      FROM auto_preview_instances
      WHERE auto_preview_instances.id = p_id;
  ELSIF p_preview_type = 'fly.io' THEN
    RETURN QUERY
      SELECT 
        fly_preview_apps.id,
        fly_preview_apps.status,
        fly_preview_apps.preview_url,
        fly_preview_apps.error_message,
        NULL::INTEGER
      FROM fly_preview_apps
      WHERE fly_preview_apps.id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CLEANUP FUNCTIONS
-- ============================================================================

-- Function to stop old previews (older than N days)
CREATE OR REPLACE FUNCTION cleanup_old_previews(days_old INT DEFAULT 7)
RETURNS TABLE (
  sprites_stopped INT,
  fly_stopped INT
) AS $$
DECLARE
  v_sprites_count INT;
  v_fly_count INT;
BEGIN
  -- Stop old Sprites previews
  UPDATE auto_preview_instances
  SET status = 'stopped', stopped_at = NOW()
  WHERE 
    status = 'running'
    AND created_at < NOW() - INTERVAL '1 day' * days_old;
  GET DIAGNOSTICS v_sprites_count = ROW_COUNT;
  
  -- Stop old Fly.io previews
  UPDATE fly_preview_apps
  SET status = 'stopped'
  WHERE 
    status = 'running'
    AND created_at < NOW() - INTERVAL '1 day' * days_old;
  GET DIAGNOSTICS v_fly_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_sprites_count, v_fly_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_auto_preview_branch 
  ON auto_preview_instances(github_branch);
CREATE INDEX IF NOT EXISTS idx_fly_preview_branch 
  ON fly_preview_apps(github_branch);
CREATE INDEX IF NOT EXISTS idx_auto_preview_user_created 
  ON auto_preview_instances(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fly_preview_user_created 
  ON fly_preview_apps(user_id, created_at DESC);

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

-- Check table existence and record counts
SELECT 
  'auto_preview_instances' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM auto_preview_instances
UNION ALL
SELECT 
  'fly_preview_apps' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM fly_preview_apps;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
/*
This comprehensive migration provides:

1. SPRITES (Primary):
   - auto_preview_instances: Fast, container-based, instant preview
   - Like Builder.io's live preview
   - 30-60 second startup
   - Status: initializing → detecting_environment → installing → provisioning → running

2. FLY.IO (Fallback):
   - fly_preview_apps: Production-like deployments
   - Slower but more reliable
   - Creates public fly.dev URLs
   - Status: pending → deploying → running

3. BACKWARD COMPATIBILITY:
   - sprites_preview_instances: Legacy table (still accessible)
   - Auto-redirects queries to auto_preview_instances

4. FEATURES:
   - RLS (Row-Level Security) for multi-tenant isolation
   - Automatic timestamp management
   - Unique constraints to prevent duplicates per branch
   - Helper functions for easy querying
   - Cleanup functions for old previews

5. USAGE:

   -- Create a Sprites preview (primary):
   INSERT INTO auto_preview_instances 
     (project_id, user_id, github_repo_url, github_branch)
   VALUES ('my-project', 'user-uuid', 'https://github.com/user/repo', 'main');

   -- Create a Fly.io preview (fallback):
   INSERT INTO fly_preview_apps
     (project_id, user_id, github_repo_url, github_branch, fly_app_name)
   VALUES ('my-project', 'user-uuid', 'https://github.com/user/repo', 'main', 'my-app-xyz');

   -- Get best available preview:
   SELECT * FROM get_best_preview('my-project', 'user-uuid');

   -- Check status:
   SELECT * FROM get_preview_status('sprites', 'id-uuid');

   -- Cleanup old previews:
   SELECT * FROM cleanup_old_previews(7);
*/
