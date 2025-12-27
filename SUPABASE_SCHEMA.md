# Roseram Builder - Supabase Schema

This document outlines the complete database schema for Roseram Builder. Run these migrations in your Supabase dashboard.

## Tables Overview

### 1. Projects Table
Stores user-generated projects and code.

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  generated_code JSONB NOT NULL DEFAULT '{"html":"","css":"","javascript":""}',
  github_url VARCHAR(512),
  netlify_url VARCHAR(512),
  github_branch VARCHAR(255) DEFAULT 'main',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_generated TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

CREATE INDEX projects_user_id_idx ON public.projects(user_id);
CREATE INDEX projects_status_idx ON public.projects(status);
CREATE INDEX projects_updated_at_idx ON public.projects(updated_at DESC);
```

### 2. Chat Messages Table
Stores conversation history for code generation and debugging.

```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT content_not_empty CHECK (length(content) > 0)
);

CREATE INDEX chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX chat_messages_role_idx ON public.chat_messages(role);
```

### 3. Deployments Table
Tracks deployment history to GitHub and Netlify.

```sql
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('github', 'netlify')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  url VARCHAR(512),
  commit_sha VARCHAR(255),
  deploy_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployments_project_id_idx ON public.deployments(project_id);
CREATE INDEX deployments_status_idx ON public.deployments(status);
CREATE INDEX deployments_type_idx ON public.deployments(type);
CREATE INDEX deployments_created_at_idx ON public.deployments(created_at DESC);
```

### 4. User Preferences Table
Stores user settings and preferences.

```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX user_preferences_user_id_idx ON public.user_preferences(user_id);
```

### 5. User Integrations Table
Stores GitHub and Netlify integration tokens (encrypted).

```sql
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('github', 'netlify')),
  token_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE INDEX user_integrations_user_id_idx ON public.user_integrations(user_id);
CREATE INDEX user_integrations_provider_idx ON public.user_integrations(provider);
```

### 6. API Usage Table
Tracks API token usage for billing and rate limiting.

```sql
CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  request_duration_ms INTEGER,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX api_usage_user_id_idx ON public.api_usage(user_id);
CREATE INDEX api_usage_created_at_idx ON public.api_usage(created_at DESC);
CREATE INDEX api_usage_endpoint_idx ON public.api_usage(endpoint);
```

### 7. Error Logs Table
Stores application errors for debugging and monitoring.

```sql
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX error_logs_user_id_idx ON public.error_logs(user_id);
CREATE INDEX error_logs_project_id_idx ON public.error_logs(project_id);
CREATE INDEX error_logs_error_type_idx ON public.error_logs(error_type);
CREATE INDEX error_logs_created_at_idx ON public.error_logs(created_at DESC);
```

## Row Level Security (RLS)

Enable RLS on tables and create policies:

```sql
-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Projects policies
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

-- Chat messages policies
CREATE POLICY "Users can view chat for their projects"
  ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = chat_messages.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can add chat messages to their projects"
  ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = chat_messages.project_id
    AND projects.user_id = auth.uid()
  ));

-- Deployments policies
CREATE POLICY "Users can view deployments for their projects"
  ON public.deployments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = deployments.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create deployments for their projects"
  ON public.deployments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = deployments.project_id
    AND projects.user_id = auth.uid()
  ));

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User integrations policies
CREATE POLICY "Users can view their own integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- API usage policies
CREATE POLICY "Users can view their own usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Error logs policies
CREATE POLICY "Users can view their own error logs"
  ON public.error_logs FOR SELECT
  USING (auth.uid() = user_id);
```

## Setup Instructions

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create new queries and run each table creation SQL
4. Enable RLS for each table
5. Create the RLS policies as shown above

## Views (Optional but Recommended)

Create useful views for analytics:

```sql
-- User statistics view
CREATE VIEW public.user_stats AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN d.type = 'github' THEN d.id END) as github_deployments,
  COUNT(DISTINCT CASE WHEN d.type = 'netlify' THEN d.id END) as netlify_deployments,
  COALESCE(SUM(CASE WHEN cm.role = 'user' THEN 1 ELSE 0 END), 0) as total_prompts,
  MAX(p.updated_at) as last_activity
FROM auth.users u
LEFT JOIN public.projects p ON u.id = p.user_id
LEFT JOIN public.deployments d ON p.id = d.project_id
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
GROUP BY u.id, u.email;

-- Project analytics view
CREATE VIEW public.project_stats AS
SELECT
  p.id,
  p.user_id,
  p.name,
  COUNT(DISTINCT cm.id) as message_count,
  COUNT(DISTINCT d.id) as deployment_count,
  COALESCE(SUM(cm.tokens_used), 0) as total_tokens,
  MAX(cm.created_at) as last_interaction
FROM public.projects p
LEFT JOIN public.chat_messages cm ON p.id = cm.project_id
LEFT JOIN public.deployments d ON p.id = d.project_id
GROUP BY p.id, p.user_id, p.name;
```

## Backup & Recovery

Regular backups are handled automatically by Supabase. To manually export:

1. Go to Supabase Dashboard > Settings > Backups
2. Download latest backup
3. For disaster recovery, contact Supabase support

## Monitoring

Monitor table sizes and performance:

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
