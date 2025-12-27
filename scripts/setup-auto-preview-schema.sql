-- ======================================
-- AUTO PREVIEW INSTANCES TABLE SETUP
-- ======================================
-- 
-- Run this entire script in your Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to "SQL Editor"
-- 4. Create new query
-- 5. Copy and paste this entire script
-- 6. Click "Run"
--
-- ======================================

-- Create the auto_preview_instances table
CREATE TABLE IF NOT EXISTS public.auto_preview_instances (
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
  status TEXT CHECK (status IN ('initializing', 'detecting_environment', 'installing', 'running', 'stopped', 'error', 'provisioning')) DEFAULT 'initializing',
  
  -- Package manager and build info
  package_manager TEXT CHECK (package_manager IN ('npm', 'pnpm', 'yarn', 'bun')) DEFAULT 'npm',
  script_name TEXT DEFAULT 'dev',
  
  -- Error handling
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  
  -- GitHub repo URLs (for compatibility)
  github_repo_url TEXT,
  github_branch TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_preview_project_user ON public.auto_preview_instances(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auto_preview_user_status ON public.auto_preview_instances(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_preview_created ON public.auto_preview_instances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_preview_sprite_name ON public.auto_preview_instances(sprite_name);

-- Enable Row Level Security
ALTER TABLE public.auto_preview_instances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (so we can recreate them)
DROP POLICY IF EXISTS "Users can view own previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can create previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can update own previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can delete own previews" ON public.auto_preview_instances;

-- RLS Policy: Users can only see their own previews
CREATE POLICY "Users can view own previews" ON public.auto_preview_instances
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create previews for themselves
CREATE POLICY "Users can create previews" ON public.auto_preview_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own previews
CREATE POLICY "Users can update own previews" ON public.auto_preview_instances
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own previews
CREATE POLICY "Users can delete own previews" ON public.auto_preview_instances
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_auto_preview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_preview_updated_at ON public.auto_preview_instances;

-- Create trigger to update updated_at on every update
CREATE TRIGGER trigger_auto_preview_updated_at
  BEFORE UPDATE ON public.auto_preview_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_auto_preview_updated_at();

-- ======================================
-- VERIFICATION QUERIES (optional)
-- ======================================
-- Run these to verify the setup:

-- Check if table exists and has the right columns
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'auto_preview_instances';

-- Check policies are enabled
-- SELECT * FROM pg_tables WHERE tablename = 'auto_preview_instances';

-- ======================================
-- Setup Complete!
-- ======================================
