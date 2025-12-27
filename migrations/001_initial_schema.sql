-- Roseram Builder - Initial Database Schema
-- This migration sets up all tables required for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- User Profiles table (extends Supabase Auth)
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

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
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
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT project_slug_unique UNIQUE (user_id, slug)
);

-- Chat Messages table (for conversation history)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- AI metadata
  tokens_used INTEGER,
  model TEXT DEFAULT 'grok-2-latest',
  temperature FLOAT DEFAULT 0.7,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  CONSTRAINT chat_messages_project_fk FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Generated Code History table (for versioning)
CREATE TABLE IF NOT EXISTS public.code_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Deployments table (track all deployments)
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- API Keys table (for user API access)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Usage Statistics table (for tracking API usage)
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Activity Log table (for audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Templates table (for code templates library)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
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

-- Favorites table (for bookmarking projects)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  CONSTRAINT user_project_unique UNIQUE (user_id, project_id)
);

-- Collaborators table (for team features - future)
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT project_user_unique UNIQUE (project_id, user_id)
);

-- Comments table (for feedback - future)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_public ON public.projects(is_public) WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_code_generations_project_id ON public.code_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_code_generations_user_id ON public.code_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_code_generations_created_at ON public.code_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON public.deployments(status);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON public.usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_project_id ON public.favorites(project_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON public.collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_project_id ON public.comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_usage_stats_updated_at
  BEFORE UPDATE ON public.usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles"
  ON public.user_profiles FOR SELECT
  USING (TRUE);

-- RLS Policies for projects
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can create messages for their projects"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages from their projects"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for code_generations
CREATE POLICY "Users can create generations for their projects"
  ON public.code_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own generations"
  ON public.code_generations FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for deployments
CREATE POLICY "Users can create deployments for their projects"
  ON public.deployments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deployments"
  ON public.deployments FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for api_keys
CREATE POLICY "Users can manage their own API keys"
  ON public.api_keys FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for usage_stats
CREATE POLICY "Users can view their own stats"
  ON public.usage_stats FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for templates
CREATE POLICY "Anyone can view public templates"
  ON public.templates FOR SELECT
  USING (is_public = TRUE);

-- RLS Policies for favorites
CREATE POLICY "Users can manage their own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for collaborators
CREATE POLICY "Users can view collaborators of shared projects"
  ON public.collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their projects"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = comments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Insert some default templates
INSERT INTO public.templates (name, description, category, html_code, css_code, javascript_code, is_official)
VALUES 
  (
    'Simple Hero',
    'A minimalist hero section with title and CTA button',
    'Hero',
    '<section class="hero"><h1>Welcome</h1><button>Get Started</button></section>',
    '.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 100px 20px; text-align: center; color: white; } .hero h1 { margin: 0; font-size: 48px; } .hero button { margin-top: 20px; padding: 12px 30px; font-size: 16px; border: none; background: white; color: #667eea; border-radius: 5px; cursor: pointer; }',
    'console.log("Hero loaded");',
    TRUE
  ),
  (
    'Navbar',
    'A responsive navigation bar',
    'Navigation',
    '<nav class="navbar"><div class="nav-brand">Logo</div><ul class="nav-menu"><li><a href="#">Home</a></li><li><a href="#">About</a></li><li><a href="#">Services</a></li><li><a href="#">Contact</a></li></ul></nav>',
    '.navbar { background: #333; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; } .nav-brand { color: white; font-weight: bold; font-size: 24px; } .nav-menu { list-style: none; display: flex; gap: 2rem; margin: 0; padding: 0; } .nav-menu a { color: white; text-decoration: none; } .nav-menu a:hover { color: #667eea; }',
    'console.log("Navbar loaded");',
    TRUE
  ),
  (
    'Card Component',
    'A reusable card component with image and description',
    'Components',
    '<div class="card"><img src="placeholder.jpg" alt="Card image"><h3>Card Title</h3><p>Card description goes here</p><button>Learn More</button></div>',
    '.card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; max-width: 300px; } .card img { width: 100%; height: 200px; object-fit: cover; } .card h3 { margin: 16px; font-size: 18px; } .card p { margin: 0 16px 16px; color: #666; } .card button { width: calc(100% - 32px); margin: 0 16px 16px; padding: 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }',
    'console.log("Card loaded");',
    TRUE
  ),
  (
    'Form with Validation',
    'A contact form with basic validation',
    'Forms',
    '<form class="form"><input type="text" placeholder="Your name" required><input type="email" placeholder="Your email" required><textarea placeholder="Your message" required></textarea><button type="submit">Send</button></form>',
    '.form { max-width: 500px; margin: 20px auto; } .form input, .form textarea { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; } .form textarea { resize: vertical; min-height: 150px; } .form button { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }',
    'document.querySelector(".form").addEventListener("submit", function(e) { e.preventDefault(); alert("Form submitted!"); });',
    TRUE
  )
ON CONFLICT (name) DO NOTHING;

-- Create initial usage stats for new users (via trigger would be better, but for now we provide the SQL)
-- This should be called when a new user signs up

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
