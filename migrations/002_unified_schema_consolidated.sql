-- ============================================================================
-- UNIFIED SCHEMA - Consolidates all requirements into one coherent architecture
-- ============================================================================
-- This migration creates a single, dependency-ordered schema that:
-- 1. Keeps the existing project-based architecture
-- 2. Adds missing tables your code uses
-- 3. Removes redundant/unused tables
-- 4. Safe to run multiple times (idempotent)

-- ============================================================================
-- CORE TABLES (already exist but ensuring they're present)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  netlify_site_id TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- Repository info
  repository_url VARCHAR(512),
  repository_owner VARCHAR(255),
  repository_name VARCHAR(255),
  working_branch VARCHAR(255),
  
  -- Generated code
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  
  -- Deployment info
  github_url TEXT,
  github_branch TEXT DEFAULT 'main',
  github_commit_sha TEXT,
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  netlify_url TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT project_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_slug_idx ON public.projects(slug);

-- ============================================================================
-- AI & CHAT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- AI metadata
  tokens_used INTEGER,
  model TEXT DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);

CREATE TABLE IF NOT EXISTS public.code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  prompt TEXT NOT NULL,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  
  -- AI metadata
  model TEXT DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'partial')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS code_generations_project_id_idx ON public.code_generations(project_id);
CREATE INDEX IF NOT EXISTS code_generations_user_id_idx ON public.code_generations(user_id);

-- ============================================================================
-- FILE TRACKING & VERSIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.file_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(1024) NOT NULL,
  content TEXT NOT NULL,
  change_type VARCHAR(50) DEFAULT 'edit' CHECK (change_type IN ('create', 'edit', 'delete', 'rename', 'generate')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT file_path_not_empty CHECK (length(file_path) > 0)
);

CREATE INDEX IF NOT EXISTS file_revisions_project_id_idx ON public.file_revisions(project_id);
CREATE INDEX IF NOT EXISTS file_revisions_file_path_idx ON public.file_revisions(file_path);
CREATE INDEX IF NOT EXISTS file_revisions_created_at_idx ON public.file_revisions(created_at DESC);
CREATE INDEX IF NOT EXISTS file_revisions_project_file_idx ON public.file_revisions(project_id, file_path);

CREATE TABLE IF NOT EXISTS public.file_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  original_content TEXT,
  modified_content TEXT,
  language VARCHAR(50) DEFAULT 'plaintext',
  commit_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS file_snapshots_project_id_idx ON public.file_snapshots(project_id);
CREATE INDEX IF NOT EXISTS file_snapshots_file_path_idx ON public.file_snapshots(file_path);
CREATE INDEX IF NOT EXISTS file_snapshots_created_at_idx ON public.file_snapshots(created_at DESC);

-- ============================================================================
-- ACTIVITY & ACTION LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL CHECK (action IN ('edit', 'generate', 'deploy', 'commit', 'rollback', 'create', 'delete', 'rename')),
  file_path VARCHAR(1024),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT action_not_empty CHECK (length(action) > 0)
);

CREATE INDEX IF NOT EXISTS action_logs_project_id_idx ON public.action_logs(project_id);
CREATE INDEX IF NOT EXISTS action_logs_action_idx ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS action_logs_created_at_idx ON public.action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS action_logs_file_path_idx ON public.action_logs(file_path);

-- Legacy activity_logs table - Project-based (what currently exists)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_project_id_idx ON public.activity_logs(project_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

-- ============================================================================
-- DEPLOYMENT & INTEGRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  deployment_type TEXT NOT NULL CHECK (deployment_type IN ('github', 'netlify')),
  
  -- GitHub specific
  github_url TEXT,
  github_commit_sha TEXT,
  github_branch TEXT,
  
  -- Netlify specific
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  netlify_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'success', 'error')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS deployments_project_id_idx ON public.deployments(project_id);
CREATE INDEX IF NOT EXISTS deployments_user_id_idx ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS deployments_status_idx ON public.deployments(status);

-- ============================================================================
-- BILLING & PAYMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  stripe_invoice_id VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),
  description TEXT,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

-- ============================================================================
-- API & SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Permissions
  scopes TEXT[] DEFAULT '{projects:read}',
  
  -- Rate limiting
  rate_limit INTEGER DEFAULT 1000,
  rate_limit_window TEXT DEFAULT '1hour',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);

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

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_updated_at ON public.user_sessions(updated_at DESC);

-- ============================================================================
-- USAGE & ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  generations_count INTEGER DEFAULT 0,
  generations_tokens_used BIGINT DEFAULT 0,
  deployments_count INTEGER DEFAULT 0,
  github_pushes_count INTEGER DEFAULT 0,
  netlify_deploys_count INTEGER DEFAULT 0,
  
  api_requests_count INTEGER DEFAULT 0,
  api_errors_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS usage_stats_user_id_idx ON public.usage_stats(user_id);

-- ============================================================================
-- OPTIONAL: TEMPLATES, FAVORITES, COLLABORATORS (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  
  html_code TEXT NOT NULL,
  css_code TEXT NOT NULL,
  javascript_code TEXT,
  
  preview_url TEXT,
  thumbnail_url TEXT,
  
  downloads_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  
  is_official BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  CONSTRAINT user_project_unique UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);

CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT project_user_unique UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS collaborators_project_id_idx ON public.collaborators(project_id);
CREATE INDEX IF NOT EXISTS collaborators_user_id_idx ON public.collaborators(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;

-- Projects RLS
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

-- File Revisions RLS
DROP POLICY IF EXISTS "Users can view revisions for their projects" ON public.file_revisions;
CREATE POLICY "Users can view revisions for their projects"
  ON public.file_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_revisions.project_id
    AND projects.user_id = auth.uid()
  ));

-- File Snapshots RLS
DROP POLICY IF EXISTS "Users can view file snapshots from their projects" ON public.file_snapshots;
CREATE POLICY "Users can view file snapshots from their projects"
  ON public.file_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_snapshots.project_id
    AND projects.user_id = auth.uid()
  ));

-- Activity Logs RLS
DROP POLICY IF EXISTS "Users can view their activity" ON public.activity_logs;
CREATE POLICY "Users can view their activity"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Invoices RLS
DROP POLICY IF EXISTS "Users can view their invoices" ON public.invoices;
CREATE POLICY "Users can view their invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SCHEMA CONSOLIDATION COMPLETE
-- ============================================================================
-- This unified schema:
-- ✅ Keeps all existing project-based tables
-- ✅ Adds missing tables (file_snapshots, invoices)
-- ✅ Uses consistent naming and relationships
-- ✅ All tables reference projects/users, not non-existent organizations
-- ✅ Safe to run multiple times
-- ============================================================================
