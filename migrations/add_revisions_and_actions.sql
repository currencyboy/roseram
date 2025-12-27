-- Create file_revisions table
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

-- Create action_logs table
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

-- Enable RLS
ALTER TABLE public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for file_revisions
CREATE POLICY IF NOT EXISTS "Users can view revisions for their projects"
  ON public.file_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_revisions.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can create revisions for their projects"
  ON public.file_revisions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_revisions.project_id
    AND projects.user_id = auth.uid()
  ));

-- Create RLS policies for action_logs
CREATE POLICY IF NOT EXISTS "Users can view action logs for their projects"
  ON public.action_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = action_logs.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can create action logs for their projects"
  ON public.action_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = action_logs.project_id
    AND projects.user_id = auth.uid()
  ));
