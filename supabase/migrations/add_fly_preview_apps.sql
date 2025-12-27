-- Create fly_preview_apps table to track Fly.io preview deployments
CREATE TABLE IF NOT EXISTS public.fly_preview_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  fly_app_name TEXT NOT NULL UNIQUE,
  fly_app_id TEXT,
  github_repo_url TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  preview_url TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'initializing', 'running', 'stopped', 'error')),
  error_message TEXT,
  env_variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_deployment_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key to projects table
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Foreign key to auth.users table
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_fly_preview_apps_project_id ON public.fly_preview_apps(project_id);
CREATE INDEX idx_fly_preview_apps_user_id ON public.fly_preview_apps(user_id);
CREATE INDEX idx_fly_preview_apps_status ON public.fly_preview_apps(status);
CREATE INDEX idx_fly_preview_apps_user_project ON public.fly_preview_apps(user_id, project_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.fly_preview_apps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preview apps
CREATE POLICY "Users can view their own preview apps"
  ON public.fly_preview_apps
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only create preview apps for themselves
CREATE POLICY "Users can create their own preview apps"
  ON public.fly_preview_apps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own preview apps
CREATE POLICY "Users can update their own preview apps"
  ON public.fly_preview_apps
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own preview apps
CREATE POLICY "Users can delete their own preview apps"
  ON public.fly_preview_apps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_fly_preview_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_fly_preview_apps_updated_at ON public.fly_preview_apps;
CREATE TRIGGER trigger_update_fly_preview_apps_updated_at
  BEFORE UPDATE ON public.fly_preview_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fly_preview_apps_updated_at();
