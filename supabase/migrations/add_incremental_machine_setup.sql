-- Create machine_setup_sessions table to track incremental Fly.io machine setup
CREATE TABLE IF NOT EXISTS public.machine_setup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Machine Details
  fly_app_name TEXT,
  fly_app_id TEXT,
  fly_machine_id TEXT,
  
  -- Repository Information
  github_repo_url TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  github_owner TEXT,
  github_repo_name TEXT,
  
  -- Step tracking (current_step: 1-4)
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  
  -- Step Details
  step_1_status TEXT DEFAULT 'pending', -- repository_detected
  step_1_details JSONB,
  
  step_2_status TEXT DEFAULT 'pending', -- machine_allocated
  step_2_details JSONB,
  
  step_3_status TEXT DEFAULT 'pending', -- settings_configured
  step_3_details JSONB,
  
  step_4_status TEXT DEFAULT 'pending', -- repository_booted
  step_4_details JSONB,
  
  -- Overall Status
  overall_status TEXT DEFAULT 'in_progress' CHECK (overall_status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  error_step INTEGER,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Preview URL (set when machine is running)
  preview_url TEXT,
  
  -- Foreign keys
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_machine_setup_sessions_project_id ON public.machine_setup_sessions(project_id);
CREATE INDEX idx_machine_setup_sessions_user_id ON public.machine_setup_sessions(user_id);
CREATE INDEX idx_machine_setup_sessions_overall_status ON public.machine_setup_sessions(overall_status);
CREATE INDEX idx_machine_setup_sessions_current_step ON public.machine_setup_sessions(current_step);
CREATE INDEX idx_machine_setup_sessions_user_project ON public.machine_setup_sessions(user_id, project_id);

-- Enable RLS
ALTER TABLE public.machine_setup_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own setup sessions"
  ON public.machine_setup_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own setup sessions"
  ON public.machine_setup_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setup sessions"
  ON public.machine_setup_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setup sessions"
  ON public.machine_setup_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_machine_setup_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_machine_setup_sessions_updated_at ON public.machine_setup_sessions;
CREATE TRIGGER trigger_update_machine_setup_sessions_updated_at
  BEFORE UPDATE ON public.machine_setup_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_machine_setup_sessions_updated_at();

-- Create helper function to get setup session with step progress
CREATE OR REPLACE FUNCTION public.get_setup_session_progress(session_id UUID)
RETURNS TABLE (
  session_id UUID,
  current_step INTEGER,
  overall_status TEXT,
  step_1_complete BOOLEAN,
  step_2_complete BOOLEAN,
  step_3_complete BOOLEAN,
  step_4_complete BOOLEAN,
  preview_url TEXT,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    machine_setup_sessions.id,
    machine_setup_sessions.current_step,
    machine_setup_sessions.overall_status,
    (machine_setup_sessions.current_step >= 1 AND machine_setup_sessions.step_1_status = 'completed')::BOOLEAN,
    (machine_setup_sessions.current_step >= 2 AND machine_setup_sessions.step_2_status = 'completed')::BOOLEAN,
    (machine_setup_sessions.current_step >= 3 AND machine_setup_sessions.step_3_status = 'completed')::BOOLEAN,
    (machine_setup_sessions.current_step >= 4 AND machine_setup_sessions.step_4_status = 'completed')::BOOLEAN,
    machine_setup_sessions.preview_url,
    machine_setup_sessions.error_message
  FROM public.machine_setup_sessions
  WHERE machine_setup_sessions.id = session_id;
END;
$$ LANGUAGE plpgsql;
