BEGIN;

-- =====================================================
-- PHASE 1: CREATE MISSING TABLES
-- =====================================================

-- Organization management
CREATE TABLE IF NOT EXISTS public.organizations (
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

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- Organization members (RBAC)
CREATE TABLE IF NOT EXISTS public.organization_members (
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

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON public.organization_members(role);

-- User settings
CREATE TABLE IF NOT EXISTS public.user_settings (
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

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Core projects table
CREATE TABLE IF NOT EXISTS public.projects (
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

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- File revisions (version history)
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

CREATE INDEX IF NOT EXISTS idx_file_revisions_project_id ON public.file_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_file_revisions_file_path ON public.file_revisions(file_path);
CREATE INDEX IF NOT EXISTS idx_file_revisions_created_at ON public.file_revisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_revisions_project_file ON public.file_revisions(project_id, file_path);

-- File snapshots (backups)
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

CREATE INDEX IF NOT EXISTS idx_file_snapshots_project_id ON public.file_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_file_snapshots_file_path ON public.file_snapshots(file_path);
CREATE INDEX IF NOT EXISTS idx_file_snapshots_created_at ON public.file_snapshots(created_at DESC);

-- Code versions (for action tracking)
CREATE TABLE IF NOT EXISTS public.code_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_id UUID,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  version_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_versions_project_id ON public.code_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_code_versions_action_id ON public.code_versions(action_id);

-- History snapshots (complete state snapshots)
CREATE TABLE IF NOT EXISTS public.history_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_index INTEGER NOT NULL,
  files_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_snapshots_project_id ON public.history_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_history_snapshots_snapshot_index ON public.history_snapshots(project_id, snapshot_index);

-- Action logs (audit trail)
CREATE TABLE IF NOT EXISTS public.action_logs (
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

CREATE INDEX IF NOT EXISTS idx_action_logs_project_id ON public.action_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_file_path ON public.action_logs(file_path);

-- Chat messages (for AI interactions)
CREATE TABLE IF NOT EXISTS public.chat_messages (
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

CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Sites (for site builder)
CREATE TABLE IF NOT EXISTS public.sites (
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

CREATE INDEX IF NOT EXISTS idx_sites_org_id ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_slug ON public.sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_status ON public.sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_visibility ON public.sites(visibility);
CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON public.sites(custom_domain);

-- Pages (within sites)
CREATE TABLE IF NOT EXISTS public.pages (
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

CREATE INDEX IF NOT EXISTS idx_pages_site_id ON public.pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_visibility ON public.pages(visibility);

-- Page versions
CREATE TABLE IF NOT EXISTS public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  custom_css TEXT,
  custom_javascript TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_page_version UNIQUE(page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON public.page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_created_by ON public.page_versions(created_by);

-- Components library
CREATE TABLE IF NOT EXISTS public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url VARCHAR(512),
  content JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_components_org_id ON public.components(organization_id);
CREATE INDEX IF NOT EXISTS idx_components_category ON public.components(category);

-- Sections library
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url VARCHAR(512),
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sections_org_id ON public.sections(organization_id);
CREATE INDEX IF NOT EXISTS idx_sections_category ON public.sections(category);

-- Deployments
CREATE TABLE IF NOT EXISTS public.deployments (
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

CREATE INDEX IF NOT EXISTS idx_deployments_site_id ON public.deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON public.deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_platform ON public.deployments(platform);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON public.deployments(created_at DESC);

-- Integrations (organization-level)
CREATE TABLE IF NOT EXISTS public.integrations (
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

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON public.integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

-- User integrations (user-level)
CREATE TABLE IF NOT EXISTS public.user_integrations (
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

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON public.user_integrations(provider);

-- User environment variables
CREATE TABLE IF NOT EXISTS public.user_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) CHECK (provider IN ('github', 'netlify', 'supabase', 'session')),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_user_env_vars_user_id ON public.user_env_vars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_env_vars_provider ON public.user_env_vars(provider);

-- User sessions
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

-- AI generations
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_content JSONB,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_page_id ON public.ai_generations(page_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_site_id ON public.ai_generations(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON public.ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON public.ai_generations(created_at DESC);

-- AI conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_page_id ON public.ai_conversations(page_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);

-- Billing & Usage tables
CREATE TABLE IF NOT EXISTS public.user_ai_usage (
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

CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user_id ON public.user_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_period ON public.user_ai_usage(user_id, period_start);

-- API usage logs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
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

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_model ON public.api_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status ON public.api_usage_logs(status);

-- Solana payments
CREATE TABLE IF NOT EXISTS public.solana_payments (
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

CREATE INDEX IF NOT EXISTS idx_solana_payments_user_id ON public.solana_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_solana_payments_status ON public.solana_payments(status);
CREATE INDEX IF NOT EXISTS idx_solana_payments_created_at ON public.solana_payments(created_at DESC);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
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

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Usage quotas
CREATE TABLE IF NOT EXISTS public.usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id VARCHAR(255),
  ai_generations_limit INTEGER DEFAULT 100,
  ai_generations_used INTEGER DEFAULT 0,
  pages_limit INTEGER DEFAULT 50,
  pages_used INTEGER DEFAULT 0,
  storage_limit_gb INTEGER DEFAULT 10,
  storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  team_members_limit INTEGER DEFAULT 5,
  team_members_used INTEGER DEFAULT 0,
  custom_domains_limit INTEGER DEFAULT 1,
  custom_domains_used INTEGER DEFAULT 0,
  reset_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_org_id ON public.usage_quotas(organization_id);

-- Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
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

CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON public.error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_site_id ON public.error_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);

-- Page analytics
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  avg_time_on_page INTEGER,
  conversion_rate DECIMAL(5, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_page_date UNIQUE(page_id, date)
);

CREATE INDEX IF NOT EXISTS idx_page_analytics_page_id ON public.page_analytics(page_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_date ON public.page_analytics(date DESC);

-- Page comments
CREATE TABLE IF NOT EXISTS public.page_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  block_id VARCHAR(255),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_comments_page_id ON public.page_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_page_comments_user_id ON public.page_comments(user_id);

-- =====================================================
-- PHASE 2: ADD GIN INDEXES FOR JSONB COLUMNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_data_gin ON public.user_sessions USING GIN(user_data);
CREATE INDEX IF NOT EXISTS idx_user_sessions_form_inputs_gin ON public.user_sessions USING GIN(form_inputs);
CREATE INDEX IF NOT EXISTS idx_user_sessions_integration_settings_gin ON public.user_sessions USING GIN(integration_settings);
CREATE INDEX IF NOT EXISTS idx_action_logs_metadata_gin ON public.action_logs USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_ai_generations_generated_content_gin ON public.ai_generations USING GIN(generated_content);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_response_meta_gin ON public.api_usage_logs USING GIN(response_metadata);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_meta_gin ON public.api_usage_logs USING GIN(request_metadata);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_messages_gin ON public.ai_conversations USING GIN(messages);

COMMIT;
