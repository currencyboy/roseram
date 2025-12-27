-- ======================================
-- SPRITES CONFIGURATION AND DATA ENDPOINTS
-- ======================================
-- 
-- Run this entire script in your Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to "SQL Editor"
-- 4. Create new query
-- 5. Copy and paste this entire script
-- 6. Click "Run"
--
-- ======================================

-- ======================================
-- 1. SPRITES CONFIGURATION TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.sprites_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic configuration
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  
  -- Sprites API configuration
  api_token_ref TEXT NOT NULL DEFAULT 'SPRITES_TOKEN',
  api_base_url TEXT NOT NULL DEFAULT 'https://api.sprites.dev',
  api_timeout_ms INTEGER DEFAULT 30000,
  
  -- Default resource allocation
  default_ram_mb INTEGER DEFAULT 1024,
  default_cpus INTEGER DEFAULT 2,
  default_region TEXT DEFAULT 'ord',
  
  -- Dev server settings
  default_package_manager TEXT DEFAULT 'npm',
  default_script_name TEXT DEFAULT 'dev',
  port_detection_timeout_ms INTEGER DEFAULT 300000,
  port_detection_patterns JSONB DEFAULT '[
    "(?:listening|listening on|Local:.*?:)(\\d{4,5})",
    "http://localhost:(\\d{4,5})",
    "Port (\\d{4,5})",
    ":(\\d{4,5})/",
    "\\*\\*\\*\\s*(\\d{4,5})\\s*\\*\\*\\*",
    "http.*?(\\d{4,5})"
  ]',
  
  -- Preview URL configuration
  preview_url_template TEXT DEFAULT 'https://{sprite_name}.sprites.dev',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- ======================================
-- 2. DATA ENDPOINTS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.data_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Endpoint identification
  name TEXT NOT NULL,
  endpoint_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  
  -- Endpoint configuration
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  
  -- Authentication
  auth_type TEXT DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'api_key', 'custom')),
  auth_header_name TEXT,
  auth_token_ref TEXT,  -- Reference to environment variable
  
  -- Request/Response configuration
  headers JSONB DEFAULT '{}',
  query_params JSONB DEFAULT '{}',
  request_body JSONB,
  
  -- Response handling
  response_format TEXT DEFAULT 'json' CHECK (response_format IN ('json', 'text', 'binary')),
  response_path TEXT,  -- JSONPath to extract data from response
  
  -- Caching
  cache_enabled BOOLEAN DEFAULT false,
  cache_ttl_seconds INTEGER,
  
  -- Category/purpose
  category TEXT DEFAULT 'general',  -- general, preview, configuration, monitoring
  service_name TEXT,  -- e.g., 'github', 'supabase', 'netlify'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  documentation_url TEXT
);

-- ======================================
-- 3. SPRITE CONFIGURATION MAPPINGS
-- ======================================
CREATE TABLE IF NOT EXISTS public.sprite_config_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  sprites_config_id UUID NOT NULL REFERENCES public.sprites_config(id) ON DELETE CASCADE,
  data_endpoint_id UUID NOT NULL REFERENCES public.data_endpoints(id) ON DELETE CASCADE,
  
  -- Mapping configuration
  is_required BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,  -- Primary endpoint for this purpose
  purpose TEXT,  -- e.g., 'provisioning', 'status_check', 'deployment'
  
  -- Override settings
  override_url TEXT,
  override_method TEXT,
  override_headers JSONB,
  override_query_params JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_index INTEGER DEFAULT 0,
  
  -- Unique constraint: one mapping per purpose per config
  UNIQUE(sprites_config_id, data_endpoint_id, purpose)
);

-- ======================================
-- 4. PREVIEW CONFIGURATION TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.preview_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sprites_config_id UUID REFERENCES public.sprites_config(id),
  
  -- Preview settings
  enabled BOOLEAN DEFAULT true,
  auto_launch BOOLEAN DEFAULT false,
  
  -- Resource overrides
  ram_mb INTEGER,
  cpus INTEGER,
  region TEXT,
  
  -- Repository settings
  github_repo TEXT,
  github_branch TEXT,
  github_token_ref TEXT,
  
  -- Environment variables for preview
  env_vars JSONB DEFAULT '{}',
  
  -- Webhook configuration (for CI/CD)
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- ======================================
-- 5. ENDPOINT HEALTH CHECK TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.endpoint_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  data_endpoint_id UUID NOT NULL REFERENCES public.data_endpoints(id) ON DELETE CASCADE,
  
  status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- INDEXES
-- ======================================
CREATE INDEX IF NOT EXISTS idx_sprites_config_enabled ON public.sprites_config(enabled);
CREATE INDEX IF NOT EXISTS idx_data_endpoints_enabled ON public.data_endpoints(enabled);
CREATE INDEX IF NOT EXISTS idx_data_endpoints_service ON public.data_endpoints(service_name);
CREATE INDEX IF NOT EXISTS idx_data_endpoints_category ON public.data_endpoints(category);
CREATE INDEX IF NOT EXISTS idx_sprite_config_mappings_config ON public.sprite_config_mappings(sprites_config_id);
CREATE INDEX IF NOT EXISTS idx_sprite_config_mappings_endpoint ON public.sprite_config_mappings(data_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_preview_config_project ON public.preview_config(project_id);
CREATE INDEX IF NOT EXISTS idx_preview_config_user ON public.preview_config(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_health_checks_endpoint ON public.endpoint_health_checks(data_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_health_checks_checked ON public.endpoint_health_checks(last_checked_at DESC);

-- ======================================
-- ROW LEVEL SECURITY
-- ======================================
ALTER TABLE public.sprites_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprite_config_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoint_health_checks ENABLE ROW LEVEL SECURITY;

-- Sprites Config - Admin only
DROP POLICY IF EXISTS "Admin can manage sprites config" ON public.sprites_config;
CREATE POLICY "Admin can manage sprites config" ON public.sprites_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('2notice@venezuela.com')
    )
  );

-- Data Endpoints - Admin only
DROP POLICY IF EXISTS "Admin can manage data endpoints" ON public.data_endpoints;
CREATE POLICY "Admin can manage data endpoints" ON public.data_endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('2notice@venezuela.com')
    )
  );

-- Sprite Config Mappings - Admin only
DROP POLICY IF EXISTS "Admin can manage sprite config mappings" ON public.sprite_config_mappings;
CREATE POLICY "Admin can manage sprite config mappings" ON public.sprite_config_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('2notice@venezuela.com')
    )
  );

-- Preview Config - Users can manage own
DROP POLICY IF EXISTS "Users can manage own preview config" ON public.preview_config;
CREATE POLICY "Users can manage own preview config" ON public.preview_config
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Endpoint Health Checks - Admin only
DROP POLICY IF EXISTS "Admin can manage endpoint health checks" ON public.endpoint_health_checks;
CREATE POLICY "Admin can manage endpoint health checks" ON public.endpoint_health_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('2notice@venezuela.com')
    )
  );

-- ======================================
-- TRIGGERS
-- ======================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sprites_config_updated_at ON public.sprites_config;
CREATE TRIGGER trigger_sprites_config_updated_at
  BEFORE UPDATE ON public.sprites_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_data_endpoints_updated_at ON public.data_endpoints;
CREATE TRIGGER trigger_data_endpoints_updated_at
  BEFORE UPDATE ON public.data_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_sprite_config_mappings_updated_at ON public.sprite_config_mappings;
CREATE TRIGGER trigger_sprite_config_mappings_updated_at
  BEFORE UPDATE ON public.sprite_config_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_preview_config_updated_at ON public.preview_config;
CREATE TRIGGER trigger_preview_config_updated_at
  BEFORE UPDATE ON public.preview_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================================
-- INITIAL DATA
-- ======================================

-- Insert default Sprites configuration
INSERT INTO public.sprites_config (name, enabled, description)
VALUES (
  'default',
  true,
  'Default Sprites.dev configuration for preview instances'
)
ON CONFLICT (name) DO NOTHING;

-- Insert common data endpoints for Sprites ecosystem
INSERT INTO public.data_endpoints (name, endpoint_key, url, method, category, service_name, description)
VALUES
  (
    'Sprites List',
    'sprites.list',
    'https://api.sprites.dev/sprites',
    'GET',
    'preview',
    'sprites',
    'List all active sprites'
  ),
  (
    'Sprites Create',
    'sprites.create',
    'https://api.sprites.dev/sprites',
    'POST',
    'preview',
    'sprites',
    'Create a new sprite instance'
  ),
  (
    'Sprites Status',
    'sprites.status',
    'https://api.sprites.dev/sprites/{sprite_id}',
    'GET',
    'preview',
    'sprites',
    'Get sprite status and information'
  ),
  (
    'Sprites Delete',
    'sprites.delete',
    'https://api.sprites.dev/sprites/{sprite_id}',
    'DELETE',
    'preview',
    'sprites',
    'Delete a sprite instance'
  ),
  (
    'Sprites Port Detection',
    'sprites.port-detect',
    'https://api.sprites.dev/sprites/{sprite_id}/ports',
    'GET',
    'preview',
    'sprites',
    'Detect opened ports in sprite'
  )
ON CONFLICT (endpoint_key) DO NOTHING;

-- ======================================
-- Setup Complete!
-- ======================================
