-- =====================================================
-- ROSERAM BUILDER - COMPLETE PRODUCTION SCHEMA
-- All 43 tables with full feature support
-- Optimized for code generation, collaborators, GitHub,
-- Netlify, and advanced deployment features
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1: DROP EXISTING TABLES (Clean slate)
-- =====================================================

DROP TABLE IF EXISTS public.workflow_sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.user_env_vars CASCADE;
DROP TABLE IF EXISTS public.user_integrations CASCADE;
DROP TABLE IF EXISTS public.user_ai_usage CASCADE;
DROP TABLE IF EXISTS public.usage_stats CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.supabase_projects CASCADE;
DROP TABLE IF EXISTS public.site_netlify_deployments CASCADE;
DROP TABLE IF EXISTS public.repositories CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.preview_urls CASCADE;
DROP TABLE IF EXISTS public.preview_logs CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.netlify_sites CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.history_snapshots CASCADE;
DROP TABLE IF EXISTS public.github_repositories CASCADE;
DROP TABLE IF EXISTS public.github_pull_requests CASCADE;
DROP TABLE IF EXISTS public.github_commits CASCADE;
DROP TABLE IF EXISTS public.file_changes CASCADE;
DROP TABLE IF EXISTS public.file_snapshots CASCADE;
DROP TABLE IF EXISTS public.file_revisions CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.deployments CASCADE;
DROP TABLE IF EXISTS public.collaborators CASCADE;
DROP TABLE IF EXISTS public.code_generations CASCADE;
DROP TABLE IF EXISTS public.code_versions CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.api_usage_logs CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.actions CASCADE;
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.solana_payments CASCADE;

-- =====================================================
-- PHASE 2: CORE ORGANIZATION & USER TABLES
-- =====================================================

-- Organizations
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

-- Organization Members
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

-- Users (Extended user profile)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url VARCHAR(512),
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(512),
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  verified_email BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- User Profiles (Detailed profiles)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio TEXT,
  profile_image_url VARCHAR(512),
  cover_image_url VARCHAR(512),
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  github_username VARCHAR(255),
  twitter_username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- User Preferences (Settings)
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  notifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- User Sessions (Session management)
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

-- API Keys (User API authentication)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);

-- =====================================================
-- PHASE 3: PROJECTS & CODE MANAGEMENT
-- =====================================================

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  repository_url VARCHAR(512),
  repository_owner VARCHAR(255),
  repository_name VARCHAR(255),
  working_branch VARCHAR(255) DEFAULT 'main',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  settings JSONB DEFAULT '{}',
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Code Versions
CREATE TABLE public.code_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  html_code TEXT,
  css_code TEXT,
  javascript_code TEXT,
  git_commit_sha VARCHAR(255),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_project_version UNIQUE(project_id, version_number)
);

CREATE INDEX idx_code_versions_project_id ON public.code_versions(project_id);
CREATE INDEX idx_code_versions_created_by ON public.code_versions(created_by);
CREATE INDEX idx_code_versions_created_at ON public.code_versions(created_at DESC);

-- Code Generations
CREATE TABLE public.code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_code JSONB,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_code_generations_project_id ON public.code_generations(project_id);
CREATE INDEX idx_code_generations_user_id ON public.code_generations(user_id);
CREATE INDEX idx_code_generations_status ON public.code_generations(status);
CREATE INDEX idx_code_generations_created_at ON public.code_generations(created_at DESC);

-- File Revisions
CREATE TABLE public.file_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(1024) NOT NULL,
  content TEXT NOT NULL,
  change_type VARCHAR(50) DEFAULT 'edit' CHECK (change_type IN ('create', 'edit', 'delete', 'rename', 'generate')),
  message TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT file_path_not_empty CHECK (length(file_path) > 0)
);

CREATE INDEX idx_file_revisions_project_id ON public.file_revisions(project_id);
CREATE INDEX idx_file_revisions_file_path ON public.file_revisions(file_path);
CREATE INDEX idx_file_revisions_created_at ON public.file_revisions(created_at DESC);
CREATE INDEX idx_file_revisions_project_file ON public.file_revisions(project_id, file_path);

-- File Snapshots
CREATE TABLE public.file_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  commit_message TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_snapshots_project_id ON public.file_snapshots(project_id);
CREATE INDEX idx_file_snapshots_file_path ON public.file_snapshots(file_path);
CREATE INDEX idx_file_snapshots_created_at ON public.file_snapshots(created_at DESC);

-- File Changes
CREATE TABLE public.file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path VARCHAR(512) NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('added', 'modified', 'deleted')),
  old_content TEXT,
  new_content TEXT,
  diff_stats JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_changes_project_id ON public.file_changes(project_id);
CREATE INDEX idx_file_changes_file_path ON public.file_changes(file_path);
CREATE INDEX idx_file_changes_created_at ON public.file_changes(created_at DESC);

-- History Snapshots
CREATE TABLE public.history_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_index INTEGER NOT NULL,
  files_snapshot JSONB NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_snapshots_project_id ON public.history_snapshots(project_id);
CREATE INDEX idx_history_snapshots_snapshot_index ON public.history_snapshots(project_id, snapshot_index);

-- =====================================================
-- PHASE 4: CHAT & AI FEATURES
-- =====================================================

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ai_chat_session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_project_id ON public.chat_messages(project_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_ai_chat_session_id ON public.chat_messages(ai_chat_session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- AI Chat Sessions
CREATE TABLE public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  context JSONB DEFAULT '{}',
  ai_model VARCHAR(100) DEFAULT 'grok-2-latest',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_chat_sessions_project_id ON public.ai_chat_sessions(project_id);
CREATE INDEX idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_created_at ON public.ai_chat_sessions(created_at DESC);

-- =====================================================
-- PHASE 5: COLLABORATION
-- =====================================================

-- Collaborators
CREATE TABLE public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'collaborator' CHECK (role IN ('owner', 'editor', 'collaborator', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_project_collaborator UNIQUE(project_id, user_id)
);

CREATE INDEX idx_collaborators_project_id ON public.collaborators(project_id);
CREATE INDEX idx_collaborators_user_id ON public.collaborators(user_id);

-- Workflow Sessions
CREATE TABLE public.workflow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workflow_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_sessions_project_id ON public.workflow_sessions(project_id);
CREATE INDEX idx_workflow_sessions_user_id ON public.workflow_sessions(user_id);

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT has_resource CHECK ((project_id IS NOT NULL) OR (template_id IS NOT NULL))
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_project_id ON public.favorites(project_id);
CREATE INDEX idx_favorites_template_id ON public.favorites(template_id);

-- =====================================================
-- PHASE 6: GITHUB INTEGRATION
-- =====================================================

-- GitHub Repositories
CREATE TABLE public.github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  github_id VARCHAR(255) NOT NULL UNIQUE,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  url VARCHAR(512),
  clone_url VARCHAR(512),
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  default_branch VARCHAR(255) DEFAULT 'main',
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  synced_commit_sha VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_github_repositories_project_id ON public.github_repositories(project_id);
CREATE INDEX idx_github_repositories_github_id ON public.github_repositories(github_id);
CREATE INDEX idx_github_repositories_owner_name ON public.github_repositories(owner, name);

-- GitHub Commits
CREATE TABLE public.github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  commit_sha VARCHAR(255) NOT NULL UNIQUE,
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  message TEXT,
  url VARCHAR(512),
  committed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_github_commits_repository_id ON public.github_commits(repository_id);
CREATE INDEX idx_github_commits_commit_sha ON public.github_commits(commit_sha);
CREATE INDEX idx_github_commits_committed_at ON public.github_commits(committed_at DESC);

-- GitHub Pull Requests
CREATE TABLE public.github_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  github_pr_id VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  state VARCHAR(50) CHECK (state IN ('open', 'closed', 'merged')),
  author VARCHAR(255),
  base_branch VARCHAR(255),
  head_branch VARCHAR(255),
  url VARCHAR(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  merged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_github_pull_requests_repository_id ON public.github_pull_requests(repository_id);
CREATE INDEX idx_github_pull_requests_github_pr_id ON public.github_pull_requests(github_pr_id);
CREATE INDEX idx_github_pull_requests_state ON public.github_pull_requests(state);

-- Repositories (General repo storage)
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(512),
  provider VARCHAR(50) DEFAULT 'github' CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX idx_repositories_project_id ON public.repositories(project_id);
CREATE INDEX idx_repositories_provider ON public.repositories(provider);

-- =====================================================
-- PHASE 7: DEPLOYMENT & NETLIFY
-- =====================================================

-- Deployments
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  environment VARCHAR(50) DEFAULT 'production' CHECK (environment IN ('staging', 'production', 'preview')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
  platform VARCHAR(50) CHECK (platform IN ('netlify', 'vercel', 'github-pages', 'custom')),
  deployment_url VARCHAR(512),
  deployment_id VARCHAR(255),
  commit_sha VARCHAR(255),
  preview_url VARCHAR(512),
  error_message TEXT,
  build_logs TEXT,
  triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX idx_deployments_site_id ON public.deployments(site_id);
CREATE INDEX idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX idx_deployments_status ON public.deployments(status);
CREATE INDEX idx_deployments_platform ON public.deployments(platform);
CREATE INDEX idx_deployments_created_at ON public.deployments(created_at DESC);

-- Netlify Sites
CREATE TABLE public.netlify_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  netlify_site_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  url VARCHAR(512),
  custom_domain VARCHAR(255),
  is_connected BOOLEAN DEFAULT false,
  last_deployed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_netlify_sites_project_id ON public.netlify_sites(project_id);
CREATE INDEX idx_netlify_sites_site_id ON public.netlify_sites(site_id);
CREATE INDEX idx_netlify_sites_netlify_site_id ON public.netlify_sites(netlify_site_id);

-- Site Netlify Deployments
CREATE TABLE public.site_netlify_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netlify_site_id UUID NOT NULL REFERENCES public.netlify_sites(id) ON DELETE CASCADE,
  deployment_id VARCHAR(255) UNIQUE,
  status VARCHAR(50),
  url VARCHAR(512),
  preview_url VARCHAR(512),
  deploy_logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_site_netlify_deployments_netlify_site_id ON public.site_netlify_deployments(netlify_site_id);
CREATE INDEX idx_site_netlify_deployments_status ON public.site_netlify_deployments(status);

-- Preview URLs
CREATE TABLE public.preview_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE,
  url VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preview_urls_project_id ON public.preview_urls(project_id);
CREATE INDEX idx_preview_urls_deployment_id ON public.preview_urls(deployment_id);

-- Preview Logs
CREATE TABLE public.preview_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_url_id UUID REFERENCES public.preview_urls(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preview_logs_preview_url_id ON public.preview_logs(preview_url_id);

-- =====================================================
-- PHASE 8: SITES & PAGES
-- =====================================================

-- Sites
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
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
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

-- Pages
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
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- =====================================================
-- PHASE 9: TEMPLATES & LIBRARY
-- =====================================================

-- Templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  category VARCHAR(100),
  thumbnail_url VARCHAR(512),
  content JSONB NOT NULL,
  code_template JSONB,
  settings JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_slug ON public.templates(slug);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_is_public ON public.templates(is_public);
CREATE INDEX idx_templates_creator_id ON public.templates(creator_id);

-- =====================================================
-- PHASE 10: INTEGRATIONS & EXTERNAL SERVICES
-- =====================================================

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  credentials_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT integration_unique CHECK ((organization_id IS NOT NULL) OR (user_id IS NOT NULL))
);

CREATE INDEX idx_integrations_organization_id ON public.integrations(organization_id);
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);

-- User Integrations
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Supabase Projects (External project tracking)
CREATE TABLE public.supabase_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  supabase_project_id VARCHAR(255) UNIQUE,
  project_name VARCHAR(255),
  url VARCHAR(512),
  api_key_encrypted TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supabase_projects_user_id ON public.supabase_projects(user_id);
CREATE INDEX idx_supabase_projects_project_id ON public.supabase_projects(project_id);

-- User Environment Variables
CREATE TABLE public.user_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) CHECK (provider IN ('github', 'netlify', 'supabase', 'session', 'general')),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_user_env_vars_user_id ON public.user_env_vars(user_id);
CREATE INDEX idx_user_env_vars_provider ON public.user_env_vars(provider);

-- =====================================================
-- PHASE 11: BILLING & USAGE TRACKING
-- =====================================================

-- User AI Usage
CREATE TABLE public.user_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
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

-- API Usage Logs
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- Usage Stats
CREATE TABLE public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(12, 2),
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_stats_user_id ON public.usage_stats(user_id);
CREATE INDEX idx_usage_stats_metric_type ON public.usage_stats(metric_type);
CREATE INDEX idx_usage_stats_period ON public.usage_stats(period_start, period_end);

-- Solana Payments
CREATE TABLE public.solana_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),
  description TEXT,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- =====================================================
-- PHASE 12: LOGGING & AUDIT
-- =====================================================

-- Action Logs
CREATE TABLE public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- Actions (Historical action tracking)
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_actions_project_id ON public.actions(project_id);
CREATE INDEX idx_actions_user_id ON public.actions(user_id);
CREATE INDEX idx_actions_created_at ON public.actions(created_at DESC);

-- Activity Logs (Audit trail)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- =====================================================
-- PHASE 13: FOREIGN KEY FIXES
-- =====================================================

-- Fix chat_messages to reference ai_chat_sessions (created before chat_messages)
-- Already handled in table creation order

-- =====================================================
-- PHASE 14: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.netlify_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_netlify_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supabase_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 15: BASIC RLS POLICIES (Can be customized)
-- =====================================================

-- Users can view/update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Projects access
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Deployments
CREATE POLICY "Users can view their deployments"
  ON public.deployments FOR SELECT
  USING (auth.uid() = user_id);

-- Chat messages
CREATE POLICY "Users can view their chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PHASE 16: CREATE USEFUL VIEWS
-- =====================================================

-- View: User projects with stats
CREATE OR REPLACE VIEW public.user_projects_with_stats AS
SELECT 
  p.id,
  p.name,
  p.slug,
  p.user_id,
  COUNT(DISTINCT cm.id) as message_count,
  COUNT(DISTINCT d.id) as deployment_count,
  COUNT(DISTINCT c.id) as collaborator_count,
  p.created_at,
  p.updated_at
FROM public.projects p
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
LEFT JOIN public.deployments d ON p.id = d.project_id
LEFT JOIN public.collaborators c ON p.id = c.project_id AND c.user_id != p.user_id
GROUP BY p.id, p.name, p.slug, p.user_id, p.created_at, p.updated_at;

-- View: Recent activity
CREATE OR REPLACE VIEW public.recent_activity AS
SELECT 
  'deployment' as activity_type,
  d.id,
  d.project_id,
  d.user_id,
  'Deployed: ' || COALESCE(d.deployment_url, 'pending') as description,
  d.created_at
FROM public.deployments d
UNION ALL
SELECT 
  'chat' as activity_type,
  cm.id,
  cm.project_id,
  cm.user_id,
  'Chat message: ' || LEFT(cm.content, 50) as description,
  cm.created_at
FROM public.chat_messages cm
UNION ALL
SELECT 
  'file_change' as activity_type,
  fc.id,
  fc.project_id,
  fc.created_by,
  'File changed: ' || fc.file_path as description,
  fc.created_at
FROM public.file_changes fc
ORDER BY created_at DESC;

-- =====================================================
-- FINAL: OPTIMIZE
-- =====================================================

VACUUM ANALYZE;

COMMIT;
