-- Migration: Add Session Management Tables
-- Description: Creates tables for tracking user sessions, login attempts, and session history

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  device_name TEXT
);

-- Create session_history table for tracking user actions per session
CREATE TABLE IF NOT EXISTS public.session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_name VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  file_path TEXT,
  code_content TEXT,
  files_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create login_attempts table for security tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  success BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON public.session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON public.session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON public.session_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at DESC);

-- Create RLS policies for sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for session_history table
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session history"
  ON public.session_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert session history"
  ON public.session_history FOR INSERT
  WITH CHECK (TRUE);

-- Create RLS policies for login_attempts table
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.sessions
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to update session last_activity
CREATE OR REPLACE FUNCTION public.update_session_activity(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.sessions
  SET last_activity = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_history TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;

-- Create comments for documentation
COMMENT ON TABLE public.sessions IS 'Stores active user sessions with session tokens and metadata';
COMMENT ON TABLE public.session_history IS 'Tracks all actions performed within a session for audit and undo/redo functionality';
COMMENT ON TABLE public.login_attempts IS 'Logs all login attempts for security monitoring';
COMMENT ON COLUMN public.sessions.session_token IS 'Secure token for session identification';
COMMENT ON COLUMN public.sessions.is_active IS 'Indicates if the session is still valid';
COMMENT ON COLUMN public.session_history.files_snapshot IS 'Complete state of all files at the time of action for revert functionality';
COMMENT ON COLUMN public.session_history.metadata IS 'Additional metadata for the action (e.g., code generation model, prompt, language)';
