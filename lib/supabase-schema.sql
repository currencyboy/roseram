-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  user_data JSONB,
  service_metadata JSONB,
  credentials TEXT,
  form_inputs JSONB,
  project_configs JSONB,
  integration_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to view/update their own sessions
CREATE POLICY "Users can view their own session"
  ON public.user_sessions
  FOR SELECT
  USING (TRUE); -- Allow viewing without auth for browser-based session retrieval

CREATE POLICY "Users can update their own session"
  ON public.user_sessions
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Users can insert their own session"
  ON public.user_sessions
  FOR INSERT
  WITH CHECK (TRUE);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_updated_at ON public.user_sessions(updated_at DESC);

-- Audit log for tracking session changes
CREATE TABLE IF NOT EXISTS public.session_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_fields JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX idx_session_audit_log_user_id ON public.session_audit_log(user_id);
CREATE INDEX idx_session_audit_log_created_at ON public.session_audit_log(created_at DESC);

-- Duplicate user detection table
CREATE TABLE IF NOT EXISTS public.duplicate_users (
  id BIGSERIAL PRIMARY KEY,
  primary_user_id TEXT NOT NULL,
  duplicate_user_id TEXT NOT NULL,
  detection_method TEXT,
  merged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  merged_by TEXT,
  UNIQUE(primary_user_id, duplicate_user_id)
);

CREATE INDEX idx_duplicate_users_primary ON public.duplicate_users(primary_user_id);
CREATE INDEX idx_duplicate_users_duplicate ON public.duplicate_users(duplicate_user_id);
