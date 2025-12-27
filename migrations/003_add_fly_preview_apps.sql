-- Roseram Builder - Fly.io Preview Apps Schema
-- Tracks Fly.io applications for dynamic project previews

CREATE TABLE IF NOT EXISTS public.fly_preview_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Fly.io app details
  fly_app_name TEXT NOT NULL UNIQUE,
  fly_app_id TEXT NOT NULL UNIQUE,
  
  -- GitHub repo details for cloning
  github_repo_url TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  github_commit_sha TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'initializing', 'running', 'stopped', 'error')),
  error_message TEXT,
  
  -- Preview URL
  preview_url TEXT,
  
  -- Configuration
  env_variables JSONB DEFAULT '{}',
  build_command TEXT DEFAULT 'npm run dev',
  dev_port INTEGER DEFAULT 3000,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  last_health_check TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fly_preview_apps_project_user UNIQUE (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.fly_preview_apps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see only their own preview apps
CREATE POLICY "Users can view their own fly preview apps"
  ON public.fly_preview_apps
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create preview apps for their own projects
CREATE POLICY "Users can create fly preview apps for their projects"
  ON public.fly_preview_apps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own preview apps
CREATE POLICY "Users can update their own fly preview apps"
  ON public.fly_preview_apps
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own preview apps
CREATE POLICY "Users can delete their own fly preview apps"
  ON public.fly_preview_apps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fly_preview_apps_project_id ON public.fly_preview_apps(project_id);
CREATE INDEX IF NOT EXISTS idx_fly_preview_apps_user_id ON public.fly_preview_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_fly_preview_apps_status ON public.fly_preview_apps(status);
