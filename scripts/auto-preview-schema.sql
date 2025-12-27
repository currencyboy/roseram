-- Auto Preview Instances Table
-- Tracks automated preview deployments with package manager detection

CREATE TABLE IF NOT EXISTS auto_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  
  -- Sprite information
  sprite_name TEXT,
  port INTEGER,
  
  -- Preview URL and status
  preview_url TEXT,
  status TEXT CHECK (status IN ('initializing', 'detecting_environment', 'installing', 'running', 'stopped', 'error')) DEFAULT 'initializing',
  
  -- Package manager and build info
  package_manager TEXT CHECK (package_manager IN ('npm', 'pnpm', 'yarn', 'bun')) DEFAULT 'npm',
  script_name TEXT DEFAULT 'dev',
  
  -- Error handling
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auto_preview_project_user ON auto_preview_instances(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auto_preview_user_status ON auto_preview_instances(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_preview_created ON auto_preview_instances(created_at DESC);

-- Enable RLS
ALTER TABLE auto_preview_instances ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own previews
-- Service role (bypasses RLS) or user's own records
CREATE POLICY "Users can view own previews" ON auto_preview_instances
  FOR SELECT
  USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "Users can create previews" ON auto_preview_instances
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "Users can update own previews" ON auto_preview_instances
  FOR UPDATE USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "Users can delete own previews" ON auto_preview_instances
  FOR DELETE USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_preview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_auto_preview_updated_at ON auto_preview_instances;
CREATE TRIGGER trigger_auto_preview_updated_at
  BEFORE UPDATE ON auto_preview_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_preview_updated_at();
