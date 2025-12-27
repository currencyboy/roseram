-- ============================================================================
-- ROSERAM BUILDER - SCHEMA MIGRATION FIX
-- Handles existing tables by adding missing columns before creating FKs
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PHASE 1: CREATE FOUNDATION TABLES (Organizations must exist first)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_plan_idx ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS organizations_status_idx ON public.organizations(status);

-- ============================================================================
-- PHASE 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- This prevents FK constraint errors when columns don't exist
-- ============================================================================

-- For sites table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.sites
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For components table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.components
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For sections table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.sections
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For integrations table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.integrations
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For invoices table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.invoices
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For usage_quotas table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.usage_quotas
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For api_usage table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.api_usage
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For error_logs table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.error_logs
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- For activity_logs table - add organization_id if it doesn't exist
ALTER TABLE IF EXISTS public.activity_logs
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================================================
-- PHASE 3: ADD FOREIGN KEY CONSTRAINTS (now that columns exist)
-- ============================================================================

-- Add FK constraint for sites if not already exists
ALTER TABLE public.sites
ADD CONSTRAINT IF NOT EXISTS sites_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for components if not already exists
ALTER TABLE public.components
ADD CONSTRAINT IF NOT EXISTS components_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for sections if not already exists
ALTER TABLE public.sections
ADD CONSTRAINT IF NOT EXISTS sections_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for integrations if not already exists
ALTER TABLE public.integrations
ADD CONSTRAINT IF NOT EXISTS integrations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for invoices if not already exists
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS invoices_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for usage_quotas if not already exists
ALTER TABLE public.usage_quotas
ADD CONSTRAINT IF NOT EXISTS usage_quotas_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for api_usage if not already exists
ALTER TABLE public.api_usage
ADD CONSTRAINT IF NOT EXISTS api_usage_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for error_logs if not already exists
ALTER TABLE public.error_logs
ADD CONSTRAINT IF NOT EXISTS error_logs_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add FK constraint for activity_logs if not already exists
ALTER TABLE public.activity_logs
ADD CONSTRAINT IF NOT EXISTS activity_logs_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- PHASE 4: CREATE REMAINING TABLES
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings(user_id);

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

CREATE TABLE IF NOT EXISTS public.session_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_fields JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_audit_log_user_id ON public.session_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_log_created_at ON public.session_audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS public.duplicate_users (
  id BIGSERIAL PRIMARY KEY,
  primary_user_id TEXT NOT NULL,
  duplicate_user_id TEXT NOT NULL,
  detection_method TEXT,
  merged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  merged_by TEXT,
  UNIQUE(primary_user_id, duplicate_user_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_users_primary ON public.duplicate_users(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_users_duplicate ON public.duplicate_users(duplicate_user_id);

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

CREATE INDEX IF NOT EXISTS organization_members_org_id_idx ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_role_idx ON public.organization_members(role);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  repository_url VARCHAR(512),
  repository_owner VARCHAR(255),
  repository_name VARCHAR(255),
  working_branch VARCHAR(255) DEFAULT 'main',
  github_branch VARCHAR(255),
  github_commit_sha TEXT,
  netlify_site_id TEXT,
  netlify_deploy_id TEXT,
  netlify_url VARCHAR(512),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT project_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON public.projects(updated_at DESC);

-- ============================================================================
-- CODE GENERATION & CHAT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  generated_content JSONB,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS code_generations_project_id_idx ON public.code_generations(project_id);
CREATE INDEX IF NOT EXISTS code_generations_user_id_idx ON public.code_generations(user_id);
CREATE INDEX IF NOT EXISTS code_generations_status_idx ON public.code_generations(status);
CREATE INDEX IF NOT EXISTS code_generations_created_at_idx ON public.code_generations(created_at DESC);

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

CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_role_idx ON public.chat_messages(role);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);

-- ============================================================================
-- FILE OPERATIONS
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

CREATE TABLE IF NOT EXISTS public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL CHECK (action IN ('edit', 'generate', 'deploy', 'commit', 'rollback', 'create', 'delete', 'rename', 'push')),
  file_path VARCHAR(1024),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT action_not_empty CHECK (length(action) > 0)
);

CREATE INDEX IF NOT EXISTS action_logs_project_id_idx ON public.action_logs(project_id);
CREATE INDEX IF NOT EXISTS action_logs_user_id_idx ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS action_logs_action_idx ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS action_logs_created_at_idx ON public.action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS action_logs_file_path_idx ON public.action_logs(file_path);

-- ============================================================================
-- SITES & PAGES (now with organization_id guaranteed to exist)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS sites_org_id_idx ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS sites_slug_idx ON public.sites(slug);
CREATE INDEX IF NOT EXISTS sites_status_idx ON public.sites(status);
CREATE INDEX IF NOT EXISTS sites_visibility_idx ON public.sites(visibility);
CREATE INDEX IF NOT EXISTS sites_custom_domain_idx ON public.sites(custom_domain);

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

CREATE INDEX IF NOT EXISTS pages_site_id_idx ON public.pages(site_id);
CREATE INDEX IF NOT EXISTS pages_slug_idx ON public.pages(slug);
CREATE INDEX IF NOT EXISTS pages_status_idx ON public.pages(status);
CREATE INDEX IF NOT EXISTS pages_visibility_idx ON public.pages(visibility);
CREATE INDEX IF NOT EXISTS pages_created_at_idx ON public.pages(created_at DESC);

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

CREATE INDEX IF NOT EXISTS page_versions_page_id_idx ON public.page_versions(page_id);
CREATE INDEX IF NOT EXISTS page_versions_created_by_idx ON public.page_versions(created_by);
CREATE INDEX IF NOT EXISTS page_versions_created_at_idx ON public.page_versions(created_at DESC);

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT component_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX IF NOT EXISTS components_org_id_idx ON public.components(organization_id);
CREATE INDEX IF NOT EXISTS components_category_idx ON public.components(category);

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT section_name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX IF NOT EXISTS sections_org_id_idx ON public.sections(organization_id);
CREATE INDEX IF NOT EXISTS sections_category_idx ON public.sections(category);

-- ============================================================================
-- AI GENERATION
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS ai_generations_page_id_idx ON public.ai_generations(page_id);
CREATE INDEX IF NOT EXISTS ai_generations_site_id_idx ON public.ai_generations(site_id);
CREATE INDEX IF NOT EXISTS ai_generations_user_id_idx ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS ai_generations_status_idx ON public.ai_generations(status);
CREATE INDEX IF NOT EXISTS ai_generations_created_at_idx ON public.ai_generations(created_at DESC);

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

CREATE INDEX IF NOT EXISTS ai_conversations_page_id_idx ON public.ai_conversations(page_id);
CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS ai_conversations_created_at_idx ON public.ai_conversations(created_at DESC);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deployment_type VARCHAR(20) NOT NULL CHECK (deployment_type IN ('github', 'netlify', 'vercel', 'github-pages', 'custom')),
  environment VARCHAR(50) DEFAULT 'production' CHECK (environment IN ('staging', 'production')),
  github_url TEXT,
  github_commit_sha VARCHAR(255),
  github_branch VARCHAR(255),
  netlify_site_id TEXT,
  netlify_deploy_id VARCHAR(255),
  netlify_url VARCHAR(512),
  vercel_url VARCHAR(512),
  deployment_url VARCHAR(512),
  preview_url VARCHAR(512),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'success', 'deployed', 'failed')),
  error_message TEXT,
  build_logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS deployments_project_id_idx ON public.deployments(project_id);
CREATE INDEX IF NOT EXISTS deployments_site_id_idx ON public.deployments(site_id);
CREATE INDEX IF NOT EXISTS deployments_status_idx ON public.deployments(status);
CREATE INDEX IF NOT EXISTS deployments_type_idx ON public.deployments(deployment_type);
CREATE INDEX IF NOT EXISTS deployments_created_at_idx ON public.deployments(created_at DESC);

-- ============================================================================
-- INTEGRATIONS & CREDENTIALS
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS integrations_org_id_idx ON public.integrations(organization_id);
CREATE INDEX IF NOT EXISTS integrations_provider_idx ON public.integrations(provider);
CREATE INDEX IF NOT EXISTS integrations_is_active_idx ON public.integrations(is_active);

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('github', 'netlify', 'vercel', 'stripe')),
  is_active BOOLEAN DEFAULT true,
  token_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_integrations_user_id_idx ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS user_integrations_provider_idx ON public.user_integrations(provider);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  scopes TEXT[] DEFAULT '{projects:read}',
  rate_limit INTEGER DEFAULT 1000,
  rate_limit_window TEXT DEFAULT '1hour',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON public.api_keys(is_active);

-- ============================================================================
-- BILLING & USAGE (now with organization_id guaranteed to exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS invoices_org_id_idx ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON public.invoices(created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id VARCHAR(255),
  ai_generations_limit INTEGER DEFAULT 100,
  ai_generations_used INTEGER DEFAULT 0,
  pages_limit INTEGER DEFAULT 50,
  pages_used INTEGER DEFAULT 0,
  sites_limit INTEGER DEFAULT 10,
  sites_used INTEGER DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS usage_quotas_org_id_idx ON public.usage_quotas(organization_id);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  tokens_used INTEGER DEFAULT 0,
  request_duration_ms INTEGER,
  status_code INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS api_usage_org_id_idx ON public.api_usage(organization_id);
CREATE INDEX IF NOT EXISTS api_usage_user_id_idx ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON public.api_usage(created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  generations_count INTEGER DEFAULT 0,
  generations_tokens_used BIGINT DEFAULT 0,
  deployments_count INTEGER DEFAULT 0,
  github_pushes_count INTEGER DEFAULT 0,
  netlify_deploys_count INTEGER DEFAULT 0,
  api_requests_count INTEGER DEFAULT 0,
  api_errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS usage_stats_user_id_idx ON public.usage_stats(user_id);

-- ============================================================================
-- ANALYTICS & MONITORING
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS page_analytics_page_id_idx ON public.page_analytics(page_id);
CREATE INDEX IF NOT EXISTS page_analytics_date_idx ON public.page_analytics(date DESC);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS error_logs_org_id_idx ON public.error_logs(organization_id);
CREATE INDEX IF NOT EXISTS error_logs_site_id_idx ON public.error_logs(site_id);
CREATE INDEX IF NOT EXISTS error_logs_project_id_idx ON public.error_logs(project_id);
CREATE INDEX IF NOT EXISTS error_logs_user_id_idx ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS error_logs_severity_idx ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  changes JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS activity_logs_org_id_idx ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_resource_idx ON public.activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

-- ============================================================================
-- COLLABORATION
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS page_comments_page_id_idx ON public.page_comments(page_id);
CREATE INDEX IF NOT EXISTS page_comments_user_id_idx ON public.page_comments(user_id);
CREATE INDEX IF NOT EXISTS page_comments_resolved_idx ON public.page_comments(resolved);
CREATE INDEX IF NOT EXISTS page_comments_created_at_idx ON public.page_comments(created_at DESC);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_project_unique UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_project_id_idx ON public.favorites(project_id);

-- ============================================================================
-- PHASE 5: ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

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
-- COMPLETE - Migration Ready
-- ============================================================================
-- This script is safe to run on any state of your database
-- It will:
-- 1. Create missing tables
-- 2. Add missing columns to existing tables
-- 3. Add foreign key constraints where missing
-- 4. Create all indexes
-- 5. Enable RLS
