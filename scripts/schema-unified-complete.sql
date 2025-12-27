-- ============================================================================
-- ROSERAM BUILDER - UNIFIED DATABASE SCHEMA
-- Complete schema supporting both Code Editor and Website Builder features
-- ============================================================================

-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: AUTHENTICATION & AUTHORIZATION TABLES
-- (These are foundational and have no dependencies on other tables)
-- ============================================================================

-- User settings table (per-user preferences)
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

CREATE INDEX user_settings_user_id_idx ON public.user_settings(user_id);

-- User sessions table (session management & deduplication)
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

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_updated_at ON public.user_sessions(updated_at DESC);

-- Session audit log
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

-- Duplicate user detection
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

-- Organizations table (multi-tenant support)
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

CREATE INDEX organizations_owner_id_idx ON public.organizations(owner_id);
CREATE INDEX organizations_slug_idx ON public.organizations(slug);
CREATE INDEX organizations_plan_idx ON public.organizations(plan);
CREATE INDEX organizations_status_idx ON public.organizations(status);

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

CREATE INDEX organization_members_org_id_idx ON public.organization_members(organization_id);
CREATE INDEX organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX organization_members_role_idx ON public.organization_members(role);

-- ============================================================================
-- SECTION 2: CODE EDITOR PROJECTS
-- (Projects are simple projects for code editing, linked to individual users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- GitHub integration
  repository_url VARCHAR(512),
  repository_owner VARCHAR(255),
  repository_name VARCHAR(255),
  working_branch VARCHAR(255) DEFAULT 'main',
  github_branch VARCHAR(255),
  github_commit_sha TEXT,
  
  -- Netlify integration
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  netlify_url VARCHAR(512),
  
  -- Project state
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT project_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX projects_user_id_idx ON public.projects(user_id);
CREATE INDEX projects_status_idx ON public.projects(status);
CREATE INDEX projects_created_at_idx ON public.projects(created_at DESC);
CREATE INDEX projects_updated_at_idx ON public.projects(updated_at DESC);

-- Code generations (AI output for projects)
CREATE TABLE IF NOT EXISTS public.code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Generation details
  prompt TEXT NOT NULL,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  generated_content JSONB,
  
  -- AI model info
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'partial')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX code_generations_project_id_idx ON public.code_generations(project_id);
CREATE INDEX code_generations_user_id_idx ON public.code_generations(user_id);
CREATE INDEX code_generations_status_idx ON public.code_generations(status);
CREATE INDEX code_generations_created_at_idx ON public.code_generations(created_at DESC);

-- Chat messages (conversation history for projects)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message details
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Token tracking
  tokens_used INTEGER,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX chat_messages_role_idx ON public.chat_messages(role);
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages(created_at DESC);

-- File revisions (version history for project files)
CREATE TABLE IF NOT EXISTS public.file_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(1024) NOT NULL,
  content TEXT NOT NULL,
  
  -- Change tracking
  change_type VARCHAR(50) DEFAULT 'edit' CHECK (change_type IN ('create', 'edit', 'delete', 'rename', 'generate')),
  message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT file_path_not_empty CHECK (length(file_path) > 0)
);

CREATE INDEX file_revisions_project_id_idx ON public.file_revisions(project_id);
CREATE INDEX file_revisions_file_path_idx ON public.file_revisions(file_path);
CREATE INDEX file_revisions_created_at_idx ON public.file_revisions(created_at DESC);
CREATE INDEX file_revisions_project_file_idx ON public.file_revisions(project_id, file_path);

-- File snapshots (complete snapshots of project files)
CREATE TABLE IF NOT EXISTS public.file_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  
  -- Snapshot details
  original_content TEXT,
  modified_content TEXT,
  language VARCHAR(50) DEFAULT 'plaintext',
  commit_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX file_snapshots_project_id_idx ON public.file_snapshots(project_id);
CREATE INDEX file_snapshots_file_path_idx ON public.file_snapshots(file_path);
CREATE INDEX file_snapshots_created_at_idx ON public.file_snapshots(created_at DESC);

-- Action logs (audit trail for projects)
CREATE TABLE IF NOT EXISTS public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action details
  action VARCHAR(100) NOT NULL CHECK (action IN ('edit', 'generate', 'deploy', 'commit', 'rollback', 'create', 'delete', 'rename', 'push')),
  file_path VARCHAR(1024),
  description TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT action_not_empty CHECK (length(action) > 0)
);

CREATE INDEX action_logs_project_id_idx ON public.action_logs(project_id);
CREATE INDEX action_logs_user_id_idx ON public.action_logs(user_id);
CREATE INDEX action_logs_action_idx ON public.action_logs(action);
CREATE INDEX action_logs_created_at_idx ON public.action_logs(created_at DESC);
CREATE INDEX action_logs_file_path_idx ON public.action_logs(file_path);

-- ============================================================================
-- SECTION 3: WEBSITE BUILDER (SITES & PAGES)
-- (For visual website builder, multi-tenant at organization level)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Theme & design
  favicon_url VARCHAR(512),
  theme_color VARCHAR(7),
  
  -- Status & visibility
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  
  -- Domain & SEO
  custom_domain VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description VARCHAR(512),
  seo_keywords VARCHAR(512),
  og_image_url VARCHAR(512),
  google_analytics_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT site_slug_org_unique UNIQUE(organization_id, slug),
  CONSTRAINT site_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX sites_org_id_idx ON public.sites(organization_id);
CREATE INDEX sites_slug_idx ON public.sites(slug);
CREATE INDEX sites_status_idx ON public.sites(status);
CREATE INDEX sites_visibility_idx ON public.sites(visibility);
CREATE INDEX sites_custom_domain_idx ON public.sites(custom_domain);

-- Pages within a site
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Page info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description VARCHAR(512),
  
  -- Content & design
  content JSONB NOT NULL DEFAULT '{"blocks":[]}',
  layout_type VARCHAR(50) DEFAULT 'default',
  custom_css TEXT,
  custom_javascript TEXT,
  
  -- Status & visibility
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'inherit' CHECK (visibility IN ('inherit', 'private', 'public', 'unlisted')),
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description VARCHAR(512),
  seo_keywords VARCHAR(512),
  og_image_url VARCHAR(512),
  
  -- Versioning & metadata
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT page_slug_site_unique UNIQUE(site_id, slug),
  CONSTRAINT page_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX pages_site_id_idx ON public.pages(site_id);
CREATE INDEX pages_slug_idx ON public.pages(slug);
CREATE INDEX pages_status_idx ON public.pages(status);
CREATE INDEX pages_visibility_idx ON public.pages(visibility);
CREATE INDEX pages_created_at_idx ON public.pages(created_at DESC);

-- Page versions (version control for pages)
CREATE TABLE IF NOT EXISTS public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Content snapshot
  content JSONB NOT NULL,
  custom_css TEXT,
  custom_javascript TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_page_version UNIQUE(page_id, version_number)
);

CREATE INDEX page_versions_page_id_idx ON public.page_versions(page_id);
CREATE INDEX page_versions_created_by_idx ON public.page_versions(created_by);
CREATE INDEX page_versions_created_at_idx ON public.page_versions(created_at DESC);

-- Components library (reusable UI components)
CREATE TABLE IF NOT EXISTS public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Component info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url VARCHAR(512),
  
  -- Content & config
  content JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  
  -- Visibility & usage
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT component_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX components_org_id_idx ON public.components(organization_id);
CREATE INDEX components_category_idx ON public.components(category);

-- Sections/blocks library (pre-built sections for pages)
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Section info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url VARCHAR(512),
  
  -- Content
  content JSONB NOT NULL,
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT section_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX sections_org_id_idx ON public.sections(organization_id);
CREATE INDEX sections_category_idx ON public.sections(category);

-- ============================================================================
-- SECTION 4: AI GENERATION (for both projects and sites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Can be for a page or a site
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- User who triggered generation
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Generation details
  prompt TEXT NOT NULL,
  generated_content JSONB,
  
  -- AI model info
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX ai_generations_page_id_idx ON public.ai_generations(page_id);
CREATE INDEX ai_generations_site_id_idx ON public.ai_generations(site_id);
CREATE INDEX ai_generations_user_id_idx ON public.ai_generations(user_id);
CREATE INDEX ai_generations_status_idx ON public.ai_generations(status);
CREATE INDEX ai_generations_created_at_idx ON public.ai_generations(created_at DESC);

-- AI conversations (multi-turn conversations per page)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Associated with a page
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  
  -- User who started conversation
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation details
  title VARCHAR(255),
  messages JSONB DEFAULT '[]',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_conversations_page_id_idx ON public.ai_conversations(page_id);
CREATE INDEX ai_conversations_user_id_idx ON public.ai_conversations(user_id);
CREATE INDEX ai_conversations_created_at_idx ON public.ai_conversations(created_at DESC);

-- ============================================================================
-- SECTION 5: DEPLOYMENTS (both for projects and sites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Can deploy either a project or a site
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Deployment details
  deployment_type VARCHAR(20) NOT NULL CHECK (deployment_type IN ('github', 'netlify', 'vercel', 'github-pages', 'custom')),
  environment VARCHAR(50) DEFAULT 'production' CHECK (environment IN ('staging', 'production')),
  
  -- Platform-specific info
  github_url TEXT,
  github_commit_sha VARCHAR(255),
  github_branch VARCHAR(255),
  
  netlify_site_id TEXT,
  netlify_deploy_id VARCHAR(255),
  netlify_url VARCHAR(512),
  
  vercel_url VARCHAR(512),
  
  -- General deployment info
  deployment_url VARCHAR(512),
  preview_url VARCHAR(512),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'success', 'deployed', 'failed')),
  error_message TEXT,
  build_logs TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX deployments_project_id_idx ON public.deployments(project_id);
CREATE INDEX deployments_site_id_idx ON public.deployments(site_id);
CREATE INDEX deployments_status_idx ON public.deployments(status);
CREATE INDEX deployments_type_idx ON public.deployments(deployment_type);
CREATE INDEX deployments_created_at_idx ON public.deployments(created_at DESC);

-- ============================================================================
-- SECTION 6: INTEGRATIONS & CREDENTIALS
-- ============================================================================

-- Organization-level integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Provider info
  provider VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Encrypted credentials
  credentials_encrypted TEXT NOT NULL,
  
  -- Metadata & tracking
  metadata JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_org_provider UNIQUE(organization_id, provider)
);

CREATE INDEX integrations_org_id_idx ON public.integrations(organization_id);
CREATE INDEX integrations_provider_idx ON public.integrations(provider);
CREATE INDEX integrations_is_active_idx ON public.integrations(is_active);

-- User-level integrations (for backward compatibility)
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider info
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('github', 'netlify', 'vercel', 'stripe')),
  is_active BOOLEAN DEFAULT true,
  
  -- Encrypted credentials
  token_encrypted TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX user_integrations_user_id_idx ON public.user_integrations(user_id);
CREATE INDEX user_integrations_provider_idx ON public.user_integrations(provider);

-- API keys for external access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Key details
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
  
  -- Tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX api_keys_key_hash_idx ON public.api_keys(key_hash);
CREATE INDEX api_keys_is_active_idx ON public.api_keys(is_active);

-- ============================================================================
-- SECTION 7: BILLING & USAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Invoice details
  stripe_invoice_id VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),
  
  description TEXT,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX invoices_org_id_idx ON public.invoices(organization_id);
CREATE INDEX invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);
CREATE INDEX invoices_created_at_idx ON public.invoices(created_at DESC);

-- Usage quotas per organization (per plan)
CREATE TABLE IF NOT EXISTS public.usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  plan_id VARCHAR(255),
  
  -- AI generation limits
  ai_generations_limit INTEGER DEFAULT 100,
  ai_generations_used INTEGER DEFAULT 0,
  
  -- Page/site limits
  pages_limit INTEGER DEFAULT 50,
  pages_used INTEGER DEFAULT 0,
  sites_limit INTEGER DEFAULT 10,
  sites_used INTEGER DEFAULT 0,
  
  -- Storage limits
  storage_limit_gb INTEGER DEFAULT 10,
  storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  
  -- Team limits
  team_members_limit INTEGER DEFAULT 5,
  team_members_used INTEGER DEFAULT 0,
  
  -- Domain limits
  custom_domains_limit INTEGER DEFAULT 1,
  custom_domains_used INTEGER DEFAULT 0,
  
  -- Reset date for monthly quotas
  reset_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX usage_quotas_org_id_idx ON public.usage_quotas(organization_id);

-- API usage tracking (for billing and analytics)
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint VARCHAR(255),
  method VARCHAR(10),
  
  -- Usage metrics
  tokens_used INTEGER DEFAULT 0,
  request_duration_ms INTEGER,
  status_code INTEGER,
  
  -- Request info
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX api_usage_org_id_idx ON public.api_usage(organization_id);
CREATE INDEX api_usage_user_id_idx ON public.api_usage(user_id);
CREATE INDEX api_usage_created_at_idx ON public.api_usage(created_at DESC);

-- Usage statistics (aggregated)
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Generation stats
  generations_count INTEGER DEFAULT 0,
  generations_tokens_used BIGINT DEFAULT 0,
  
  -- Deployment stats
  deployments_count INTEGER DEFAULT 0,
  github_pushes_count INTEGER DEFAULT 0,
  netlify_deploys_count INTEGER DEFAULT 0,
  
  -- API stats
  api_requests_count INTEGER DEFAULT 0,
  api_errors_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX usage_stats_user_id_idx ON public.usage_stats(user_id);

-- ============================================================================
-- SECTION 8: ANALYTICS & MONITORING
-- ============================================================================

-- Page analytics
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  
  -- Daily stats
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  
  -- Performance
  bounce_rate DECIMAL(5, 2),
  avg_time_on_page INTEGER,
  conversion_rate DECIMAL(5, 2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_page_date UNIQUE(page_id, date)
);

CREATE INDEX page_analytics_page_id_idx ON public.page_analytics(page_id);
CREATE INDEX page_analytics_date_idx ON public.page_analytics(date DESC);

-- Error logs (application error tracking)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Error details
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  
  -- Severity & status
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX error_logs_org_id_idx ON public.error_logs(organization_id);
CREATE INDEX error_logs_site_id_idx ON public.error_logs(site_id);
CREATE INDEX error_logs_project_id_idx ON public.error_logs(project_id);
CREATE INDEX error_logs_user_id_idx ON public.error_logs(user_id);
CREATE INDEX error_logs_severity_idx ON public.error_logs(severity);
CREATE INDEX error_logs_created_at_idx ON public.error_logs(created_at DESC);

-- Activity logs (audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Activity details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  
  -- Changes
  changes JSONB DEFAULT '{}',
  
  -- Request info
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX activity_logs_org_id_idx ON public.activity_logs(organization_id);
CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_resource_idx ON public.activity_logs(resource_type, resource_id);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

-- ============================================================================
-- SECTION 9: COLLABORATION
-- ============================================================================

-- Page comments
CREATE TABLE IF NOT EXISTS public.page_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment details
  content TEXT NOT NULL,
  block_id VARCHAR(255),
  
  -- Status
  resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX page_comments_page_id_idx ON public.page_comments(page_id);
CREATE INDEX page_comments_user_id_idx ON public.page_comments(user_id);
CREATE INDEX page_comments_resolved_idx ON public.page_comments(resolved);
CREATE INDEX page_comments_created_at_idx ON public.page_comments(created_at DESC);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT user_project_unique UNIQUE (user_id, project_id)
);

CREATE INDEX favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX favorites_project_id_idx ON public.favorites(project_id);

-- ============================================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can update"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Users can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND (organizations.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = organizations.id
          AND om.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Org admins can manage members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- PROJECTS POLICIES (Code Editor)
-- ============================================================================

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PROJECTS DEPENDENCIES POLICIES (for code editors)
-- ============================================================================

CREATE POLICY "Users can view generations for their projects"
  ON public.code_generations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = code_generations.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generations for their projects"
  ON public.code_generations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = code_generations.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view chat for their projects"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = chat_messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add chat for their projects"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = chat_messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view revisions for their projects"
  ON public.file_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = file_revisions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create revisions for their projects"
  ON public.file_revisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = file_revisions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view file snapshots from their projects"
  ON public.file_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = file_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots for their projects"
  ON public.file_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = file_snapshots.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view action logs for their projects"
  ON public.action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = action_logs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create action logs for their projects"
  ON public.action_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = action_logs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SITES & PAGES POLICIES (Website Builder)
-- ============================================================================

CREATE POLICY "Users can view sites in their organizations"
  ON public.sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = sites.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sites in their organizations"
  ON public.sites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = sites.organization_id
      AND organization_members.user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can update sites in their organizations"
  ON public.sites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = sites.organization_id
      AND organization_members.user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can view pages in their organizations"
  ON public.pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = pages.site_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create pages in their sites"
  ON public.pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = pages.site_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can update pages in their sites"
  ON public.pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = pages.site_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can view page versions"
  ON public.page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      WHERE pages.id = page_versions.page_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create page versions"
  ON public.page_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      WHERE pages.id = page_versions.page_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can view components in their organizations"
  ON public.components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = components.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sections in their organizations"
  ON public.sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = sections.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- AI GENERATIONS & CONVERSATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own AI generations"
  ON public.ai_generations FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE pages.id = ai_generations.page_id
      AND organization_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.sites
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE sites.id = ai_generations.site_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create AI generations for their resources"
  ON public.ai_generations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM public.pages
        JOIN public.sites ON pages.site_id = sites.id
        JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
        WHERE pages.id = page_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin', 'editor')
      ) OR
      EXISTS (
        SELECT 1 FROM public.sites
        JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
        WHERE sites.id = site_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can view their conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DEPLOYMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view deployments for their projects"
  ON public.deployments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.sites
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE sites.id = deployments.site_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for their projects"
  ON public.deployments FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.user_id = auth.uid()
    )) OR
    (EXISTS (
      SELECT 1 FROM public.sites
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE sites.id = site_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'editor')
    ))
  );

-- ============================================================================
-- INTEGRATIONS & API KEYS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their organization integrations"
  ON public.integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = integrations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = integrations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BILLING POLICIES
-- ============================================================================

CREATE POLICY "Users can view their organization invoices"
  ON public.invoices FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = invoices.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their usage quotas"
  ON public.usage_quotas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = usage_quotas.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their API usage"
  ON public.api_usage FOR SELECT
  USING (
    auth.uid() = user_id OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = api_usage.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can view their usage stats"
  ON public.usage_stats FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- ANALYTICS & MONITORING POLICIES
-- ============================================================================

CREATE POLICY "Users can view page analytics"
  ON public.page_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE pages.id = page_analytics.page_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view error logs for their resources"
  ON public.error_logs FOR SELECT
  USING (
    auth.uid() = user_id OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = error_logs.organization_id
      AND organization_members.user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = error_logs.project_id
      AND projects.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can view activity logs for their organization"
  ON public.activity_logs FOR SELECT
  USING (
    auth.uid() = user_id OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = activity_logs.organization_id
      AND organization_members.user_id = auth.uid()
    ))
  );

-- ============================================================================
-- COLLABORATION POLICIES
-- ============================================================================

CREATE POLICY "Users can view page comments"
  ON public.page_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE pages.id = page_comments.page_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create page comments"
  ON public.page_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.pages
      JOIN public.sites ON pages.site_id = sites.id
      JOIN public.organization_members ON sites.organization_id = organization_members.organization_id
      WHERE pages.id = page_comments.page_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 11: HELPFUL VIEWS
-- ============================================================================

-- User organizations view
CREATE OR REPLACE VIEW public.user_organizations AS
SELECT DISTINCT
  u.id as user_id,
  o.id as organization_id,
  o.name,
  o.slug,
  COALESCE(om.role, 'owner'::VARCHAR) as role,
  o.plan,
  o.status
FROM auth.users u
LEFT JOIN public.organization_members om ON u.id = om.user_id
LEFT JOIN public.organizations o ON om.organization_id = o.id
WHERE o.id IS NOT NULL
UNION ALL
SELECT
  u.id,
  o.id,
  o.name,
  o.slug,
  'owner'::VARCHAR,
  o.plan,
  o.status
FROM auth.users u
LEFT JOIN public.organizations o ON u.id = o.owner_id;

-- User sites view
CREATE OR REPLACE VIEW public.user_sites AS
SELECT
  u.id as user_id,
  s.id as site_id,
  s.name,
  s.slug,
  s.status,
  o.id as organization_id,
  om.role
FROM auth.users u
JOIN public.organization_members om ON u.id = om.user_id
JOIN public.organizations o ON om.organization_id = o.id
JOIN public.sites s ON o.id = s.organization_id;

-- Site statistics view
CREATE OR REPLACE VIEW public.site_stats AS
SELECT
  s.id,
  s.organization_id,
  COUNT(DISTINCT p.id) as total_pages,
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as published_pages,
  COUNT(DISTINCT d.id) as total_deployments,
  MAX(d.created_at) as last_deployment,
  COALESCE(SUM(pa.views), 0) as total_views
FROM public.sites s
LEFT JOIN public.pages p ON s.id = p.site_id
LEFT JOIN public.deployments d ON s.id = d.site_id
LEFT JOIN public.page_analytics pa ON p.id = pa.page_id
GROUP BY s.id, s.organization_id;

-- User statistics view
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  u.id as user_id,
  COALESCE(u.email, '') as email,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN d.deployment_type = 'github' THEN d.id END) as github_deployments,
  COUNT(DISTINCT CASE WHEN d.deployment_type = 'netlify' THEN d.id END) as netlify_deployments,
  COALESCE(SUM(CASE WHEN cm.role = 'user' THEN 1 ELSE 0 END), 0) as total_prompts,
  COALESCE(SUM(cg.tokens_used), 0) as total_tokens_used,
  MAX(p.updated_at) as last_activity
FROM auth.users u
LEFT JOIN public.projects p ON u.id = p.user_id
LEFT JOIN public.deployments d ON p.id = d.project_id
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
LEFT JOIN public.code_generations cg ON p.id = cg.project_id
GROUP BY u.id, u.email;

-- Project statistics view
CREATE OR REPLACE VIEW public.project_stats AS
SELECT
  p.id,
  p.user_id,
  p.name,
  COUNT(DISTINCT cm.id) as message_count,
  COUNT(DISTINCT d.id) as deployment_count,
  COUNT(DISTINCT cg.id) as generation_count,
  COALESCE(SUM(cm.tokens_used), 0) as total_tokens,
  COALESCE(SUM(cg.tokens_used), 0) as generation_tokens,
  MAX(cm.created_at) as last_message,
  MAX(cg.created_at) as last_generation
FROM public.projects p
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
LEFT JOIN public.deployments d ON p.id = d.project_id
LEFT JOIN public.code_generations cg ON p.id = cg.project_id
GROUP BY p.id, p.user_id, p.name;

-- ============================================================================
-- SECTION 12: VERIFY & SUCCESS
-- ============================================================================

-- This completes the unified schema
-- All tables created with proper relationships and indexes
-- RLS policies enabled for security
-- Helper views created for common queries
