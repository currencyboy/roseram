-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION TABLES
-- ============================================================================

-- Organizations table
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

-- Organization members table
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

-- User settings table
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

-- ============================================================================
-- PAGES & CONTENT TABLES
-- ============================================================================

-- Sites table
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
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX sites_org_id_idx ON public.sites(organization_id);
CREATE INDEX sites_slug_idx ON public.sites(slug);
CREATE INDEX sites_status_idx ON public.sites(status);
CREATE INDEX sites_visibility_idx ON public.sites(visibility);
CREATE INDEX sites_custom_domain_idx ON public.sites(custom_domain);

-- Pages table
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
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX pages_site_id_idx ON public.pages(site_id);
CREATE INDEX pages_slug_idx ON public.pages(slug);
CREATE INDEX pages_status_idx ON public.pages(status);
CREATE INDEX pages_visibility_idx ON public.pages(visibility);

-- Page versions (for history/rollback)
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

CREATE INDEX page_versions_page_id_idx ON public.page_versions(page_id);
CREATE INDEX page_versions_created_by_idx ON public.page_versions(created_by);

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

CREATE INDEX components_org_id_idx ON public.components(organization_id);
CREATE INDEX components_category_idx ON public.components(category);

-- Sections/blocks library
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

CREATE INDEX sections_org_id_idx ON public.sections(organization_id);
CREATE INDEX sections_category_idx ON public.sections(category);

-- ============================================================================
-- AI & GENERATION TABLES
-- ============================================================================

-- AI Generations (Grok integration)
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

CREATE INDEX ai_generations_page_id_idx ON public.ai_generations(page_id);
CREATE INDEX ai_generations_site_id_idx ON public.ai_generations(site_id);
CREATE INDEX ai_generations_user_id_idx ON public.ai_generations(user_id);
CREATE INDEX ai_generations_status_idx ON public.ai_generations(status);
CREATE INDEX ai_generations_created_at_idx ON public.ai_generations(created_at DESC);

-- AI Chat/Conversations
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

CREATE INDEX ai_conversations_page_id_idx ON public.ai_conversations(page_id);
CREATE INDEX ai_conversations_user_id_idx ON public.ai_conversations(user_id);

-- ============================================================================
-- DEPLOYMENT & HOSTING TABLES
-- ============================================================================

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

CREATE INDEX deployments_site_id_idx ON public.deployments(site_id);
CREATE INDEX deployments_status_idx ON public.deployments(status);
CREATE INDEX deployments_platform_idx ON public.deployments(platform);
CREATE INDEX deployments_created_at_idx ON public.deployments(created_at DESC);

-- Integration credentials (encrypted)
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

CREATE INDEX integrations_org_id_idx ON public.integrations(organization_id);
CREATE INDEX integrations_provider_idx ON public.integrations(provider);

-- ============================================================================
-- ANALYTICS & MONITORING TABLES
-- ============================================================================

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

CREATE INDEX page_analytics_page_id_idx ON public.page_analytics(page_id);
CREATE INDEX page_analytics_date_idx ON public.page_analytics(date DESC);

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

CREATE INDEX error_logs_org_id_idx ON public.error_logs(organization_id);
CREATE INDEX error_logs_site_id_idx ON public.error_logs(site_id);
CREATE INDEX error_logs_user_id_idx ON public.error_logs(user_id);
CREATE INDEX error_logs_severity_idx ON public.error_logs(severity);
CREATE INDEX error_logs_created_at_idx ON public.error_logs(created_at DESC);

-- API usage/billing
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  tokens_used INTEGER DEFAULT 0,
  request_duration_ms INTEGER,
  status_code INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX api_usage_org_id_idx ON public.api_usage(organization_id);
CREATE INDEX api_usage_created_at_idx ON public.api_usage(created_at DESC);

-- ============================================================================
-- BILLING & SUBSCRIPTIONS
-- ============================================================================

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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

CREATE INDEX invoices_org_id_idx ON public.invoices(organization_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);

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

CREATE INDEX usage_quotas_org_id_idx ON public.usage_quotas(organization_id);

-- ============================================================================
-- COLLABORATION & COMMENTS
-- ============================================================================

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

CREATE INDEX page_comments_page_id_idx ON public.page_comments(page_id);
CREATE INDEX page_comments_user_id_idx ON public.page_comments(user_id);

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

CREATE INDEX activity_logs_org_id_idx ON public.activity_logs(organization_id);
CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_resource_idx ON public.activity_logs(resource_type, resource_id);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
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

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Sites RLS Policies
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
    )
  );

-- Pages RLS Policies
CREATE POLICY "Users can view pages they have access to"
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
      )
    )
  );

-- AI Generations RLS Policies
CREATE POLICY "Users can view their own AI generations"
  ON public.ai_generations FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.pages
    WHERE pages.id = ai_generations.page_id
    AND EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = pages.site_id
      AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = sites.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  ));

-- Add other RLS policies similarly...

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.user_organizations AS
SELECT DISTINCT
  u.id as user_id,
  o.id as organization_id,
  o.name,
  o.slug,
  om.role,
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

CREATE OR REPLACE VIEW public.site_stats AS
SELECT
  s.id,
  s.organization_id,
  COUNT(DISTINCT p.id) as total_pages,
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as published_pages,
  COUNT(DISTINCT d.id) as total_deployments,
  MAX(d.created_at) as last_deployment,
  SUM(COALESCE(pa.views, 0)) as total_views
FROM public.sites s
LEFT JOIN public.pages p ON s.id = p.site_id
LEFT JOIN public.deployments d ON s.id = d.site_id
LEFT JOIN public.page_analytics pa ON p.id = pa.page_id
GROUP BY s.id, s.organization_id;
