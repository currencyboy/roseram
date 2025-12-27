-- =====================================================
-- ROSERAM BUILDER - COMPLETE SCHEMA MIGRATION
-- Production-ready database with all necessary tables
-- and optimizations for actual feature usage
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1: DROP EXISTING TABLES (Clean slate)
-- =====================================================

DROP TABLE IF EXISTS public.page_comments CASCADE;
DROP TABLE IF EXISTS public.page_analytics CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.usage_quotas CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.ai_generations CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.components CASCADE;
DROP TABLE IF EXISTS public.page_versions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.page_analytics CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.deployments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.api_usage_logs CASCADE;
DROP TABLE IF EXISTS public.solana_payments CASCADE;
DROP TABLE IF EXISTS public.user_ai_usage CASCADE;
DROP TABLE IF EXISTS public.user_env_vars CASCADE;
DROP TABLE IF EXISTS public.user_integrations CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.history_snapshots CASCADE;
DROP TABLE IF EXISTS public.code_versions CASCADE;
DROP TABLE IF EXISTS public.file_snapshots CASCADE;
DROP TABLE IF EXISTS public.file_revisions CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- =====================================================
-- PHASE 2: CREATE CORE TABLES
-- =====================================================

-- Organizations (Team management)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(512),
  website_url VARCHAR(512),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  billing_email VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_plan ON public.organizations(plan);
CREATE INDEX idx_organizations_status ON public.organizations(status);

-- Organization Members (RBAC)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_org_member UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_role ON public.organization_members(role);

-- Projects (Coding projects/repositories)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  repository_url VARCHAR(512),
  repository_owner VARCHAR(255),
  repository_name VARCHAR(255),
  working_branch VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- User Preferences (Settings)
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- User Sessions (Session & state management)
CREATE TABLE public.user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  user_data JSONB,
  service_metadata JSONB,
  credentials TEXT,
  form_inputs JSONB,
  project_configs JSONB,
  integration_settings JSONB,
  x_api_key_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_updated_at ON public.user_sessions(updated_at DESC);
CREATE INDEX idx_user_sessions_user_data_gin ON public.user_sessions USING GIN(user_data);
CREATE INDEX idx_user_sessions_form_inputs_gin ON public.user_sessions USING GIN(form_inputs);
CREATE INDEX idx_user_sessions_integration_settings_gin ON public.user_sessions USING GIN(integration_settings);
CREATE INDEX idx_user_sessions_service_metadata_gin ON public.user_sessions USING GIN(service_metadata);

-- =====================================================
-- PHASE 3: FILE & CODE MANAGEMENT TABLES
-- =====================================================

-- File Revisions (Version history)
CREATE TABLE public.file_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(1024) NOT NULL,
  content TEXT NOT NULL,
  change_type VARCHAR(50) DEFAULT 'edit' CHECK (change_type IN ('create', 'edit', 'delete', 'rename', 'generate')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT file_path_not_empty CHECK (length(file_path) > 0)
);

CREATE INDEX idx_file_revisions_project_id ON public.file_revisions(project_id);
CREATE INDEX idx_file_revisions_file_path ON public.file_revisions(file_path);
CREATE INDEX idx_file_revisions_created_at ON public.file_revisions(created_at DESC);
CREATE INDEX idx_file_revisions_project_file ON public.file_revisions(project_id, file_path);

-- File Snapshots (Backups)
CREATE TABLE public.file_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  commit_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_snapshots_project_id ON public.file_snapshots(project_id);
CREATE INDEX idx_file_snapshots_file_path ON public.file_snapshots(file_path);
CREATE INDEX idx_file_snapshots_created_at ON public.file_snapshots(created_at DESC);

-- Code Versions (Code change tracking)
CREATE TABLE public.code_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_id UUID,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  version_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_versions_project_id ON public.code_versions(project_id);
CREATE INDEX idx_code_versions_action_id ON public.code_versions(action_id);

-- History Snapshots (Complete state snapshots)
CREATE TABLE public.history_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_index INTEGER NOT NULL,
  files_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_snapshots_project_id ON public.history_snapshots(project_id);
CREATE INDEX idx_history_snapshots_snapshot_index ON public.history_snapshots(project_id, snapshot_index);

-- =====================================================
-- PHASE 4: CHAT & AI TABLES
-- =====================================================

-- Chat Messages (AI interactions)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_project_id ON public.chat_messages(project_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_role ON public.chat_messages(role);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- =====================================================
-- PHASE 5: SITE BUILDER TABLES
-- =====================================================

-- Sites (Website projects)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  favicon_url VARCHAR(512),
  theme_color VARCHAR(7),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  custom_domain VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description VARCHAR(512),
  seo_keywords VARCHAR(512),
  og_image_url VARCHAR(512),
  google_analytics_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT site_slug_org_unique UNIQUE(organization_id, slug),
  CONSTRAINT site_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX idx_sites_org_id ON public.sites(organization_id);
CREATE INDEX idx_sites_slug ON public.sites(slug);
CREATE INDEX idx_sites_status ON public.sites(status);
CREATE INDEX idx_sites_visibility ON public.sites(visibility);
CREATE INDEX idx_sites_custom_domain ON public.sites(custom_domain);

-- Pages (Within sites)
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description VARCHAR(512),
  content JSONB NOT NULL DEFAULT '{"blocks":[]}',
  layout_type VARCHAR(50) DEFAULT 'default',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'inherit' CHECK (visibility IN ('inherit', 'private', 'public', 'unlisted')),
  seo_title VARCHAR(255),
  seo_description VARCHAR(512),
  seo_keywords VARCHAR(512),
  og_image_url VARCHAR(512),
  custom_css TEXT,
  custom_javascript TEXT,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT page_slug_site_unique UNIQUE(site_id, slug),
  CONSTRAINT page_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX idx_pages_site_id ON public.pages(site_id);
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);
CREATE INDEX idx_pages_visibility ON public.pages(visibility);

-- Deployments (Site deployments)
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  environment VARCHAR(50) DEFAULT 'production' CHECK (environment IN ('staging', 'production')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
  platform VARCHAR(50) CHECK (platform IN ('netlify', 'vercel', 'github-pages', 'custom')),
  deployment_url VARCHAR(512),
  deployment_id VARCHAR(255),
  commit_sha VARCHAR(255),
  preview_url VARCHAR(512),
  error_message TEXT,
  build_logs TEXT,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_deployments_site_id ON public.deployments(site_id);
CREATE INDEX idx_deployments_status ON public.deployments(status);
CREATE INDEX idx_deployments_platform ON public.deployments(platform);
CREATE INDEX idx_deployments_created_at ON public.deployments(created_at DESC);

-- =====================================================
-- PHASE 6: ACTION & ACTIVITY LOGGING TABLES
-- =====================================================

-- Action Logs (Detailed action history)
CREATE TABLE public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100),
  file_path VARCHAR(512),
  description TEXT,
  target VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_action_logs_project_id ON public.action_logs(project_id);
CREATE INDEX idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX idx_action_logs_action ON public.action_logs(action);
CREATE INDEX idx_action_logs_created_at ON public.action_logs(created_at DESC);
CREATE INDEX idx_action_logs_file_path ON public.action_logs(file_path);
CREATE INDEX idx_action_logs_metadata_gin ON public.action_logs USING GIN(metadata);

-- Activity Logs (Audit trail)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  changes JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_org_id ON public.activity_logs(organization_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_resource ON public.activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Actions table (Historical action tracking)
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_actions_created_at ON public.actions(created_at DESC);

-- =====================================================
-- PHASE 7: INTEGRATION TABLES
-- =====================================================

-- Integrations (Organization-level)
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  credentials_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_org_provider UNIQUE(organization_id, provider)
);

CREATE INDEX idx_integrations_org_id ON public.integrations(organization_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);

-- User Integrations (User-level)
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  token_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON public.user_integrations(provider);

-- User Environment Variables
CREATE TABLE public.user_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) CHECK (provider IN ('github', 'netlify', 'supabase', 'session')),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_user_env_vars_user_id ON public.user_env_vars(user_id);
CREATE INDEX idx_user_env_vars_provider ON public.user_env_vars(provider);

-- =====================================================
-- PHASE 8: BILLING & USAGE TABLES
-- =====================================================

-- User AI Usage (Token/API tracking)
CREATE TABLE public.user_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  api_calls INTEGER DEFAULT 0,
  cost_amount DECIMAL(10, 2) DEFAULT 0,
  free_tier_used BOOLEAN DEFAULT false,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_period UNIQUE(user_id, period_start)
);

CREATE INDEX idx_user_ai_usage_user_id ON public.user_ai_usage(user_id);
CREATE INDEX idx_user_ai_usage_period ON public.user_ai_usage(user_id, period_start);

-- API Usage Logs (Detailed API usage)
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_endpoint VARCHAR(255),
  operation VARCHAR(50),
  model VARCHAR(100),
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  tokens_used INTEGER,
  cost DECIMAL(10, 2),
  status VARCHAR(50),
  error_message TEXT,
  request_metadata JSONB,
  response_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_model ON public.api_usage_logs(model);
CREATE INDEX idx_api_usage_logs_status ON public.api_usage_logs(status);
CREATE INDEX idx_api_usage_logs_request_meta_gin ON public.api_usage_logs USING GIN(request_metadata);
CREATE INDEX idx_api_usage_logs_response_meta_gin ON public.api_usage_logs USING GIN(response_metadata);

-- Solana Payments (Crypto payments)
CREATE TABLE public.solana_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255),
  recipient_address VARCHAR(255),
  amount_sol DECIMAL(10, 8),
  amount_usd DECIMAL(10, 2),
  transaction_signature VARCHAR(255) UNIQUE,
  status VARCHAR(50),
  confirmations INTEGER DEFAULT 0,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_solana_payments_user_id ON public.solana_payments(user_id);
CREATE INDEX idx_solana_payments_status ON public.solana_payments(status);
CREATE INDEX idx_solana_payments_created_at ON public.solana_payments(created_at DESC);

-- Invoices (Billing records)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- =====================================================
-- PHASE 9: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 10: CREATE RLS POLICIES
-- =====================================================

-- Projects: Users can only see their own
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- User Sessions: Users can only access their own
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE '%' || auth.uid()::text || '%');

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE '%' || auth.uid()::text || '%');

-- Chat Messages: Users can only see their own
CREATE POLICY "Users can view their chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User Preferences: Users can only manage their own
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- User Integrations: Users can only manage their own
CREATE POLICY "Users can view their own integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- User Env Vars: Users can only manage their own
CREATE POLICY "Users can view their env vars"
  ON public.user_env_vars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create env vars"
  ON public.user_env_vars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PHASE 11: CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user organizations
CREATE OR REPLACE VIEW public.user_organizations AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.plan,
  o.owner_id,
  om.user_id,
  om.role,
  o.created_at,
  o.updated_at
FROM public.organizations o
LEFT JOIN public.organization_members om ON o.id = om.organization_id;

-- View for user projects with counts
CREATE OR REPLACE VIEW public.user_projects_with_stats AS
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.created_at,
  COUNT(DISTINCT cm.id) as message_count,
  COUNT(DISTINCT d.id) as deployment_count
FROM public.projects p
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
LEFT JOIN public.deployments d ON p.id = d.site_id
GROUP BY p.id, p.name, p.user_id, p.created_at;

-- =====================================================
-- PHASE 12: VACUUM & ANALYZE
-- =====================================================

VACUUM ANALYZE;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;
