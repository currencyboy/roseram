-- Actions table - tracks all actions (generation, edits, reverts, saves)
CREATE TABLE IF NOT EXISTS actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'generation', 'edit', 'revert', 'save'
  description TEXT,
  file_path VARCHAR(500),
  code_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store prompt, parameters, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Code versions table - stores snapshots of code at each action
CREATE TABLE IF NOT EXISTS code_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  code_content TEXT NOT NULL,
  language VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- History snapshots table - allows full rollback to any state
CREATE TABLE IF NOT EXISTS history_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  snapshot_index INTEGER NOT NULL, -- Sequential number for ordering
  files_snapshot JSONB NOT NULL, -- Complete state of all files at this action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS actions_project_id_idx ON actions(project_id);
CREATE INDEX IF NOT EXISTS actions_user_id_idx ON actions(user_id);
CREATE INDEX IF NOT EXISTS actions_created_at_idx ON actions(created_at DESC);
CREATE INDEX IF NOT EXISTS code_versions_action_id_idx ON code_versions(action_id);
CREATE INDEX IF NOT EXISTS code_versions_file_path_idx ON code_versions(file_path);
CREATE INDEX IF NOT EXISTS history_snapshots_project_id_idx ON history_snapshots(project_id);
CREATE INDEX IF NOT EXISTS history_snapshots_action_id_idx ON history_snapshots(action_id);
CREATE INDEX IF NOT EXISTS history_snapshots_snapshot_index_idx ON history_snapshots(project_id, snapshot_index DESC);

-- Enable real-time subscriptions for these tables
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for actions table
CREATE POLICY "Users can view their own actions" ON actions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own actions" ON actions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own actions" ON actions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own actions" ON actions
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for code_versions table
CREATE POLICY "Users can view versions of their actions" ON code_versions
  FOR SELECT USING (
    action_id IN (
      SELECT id FROM actions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert versions for their actions" ON code_versions
  FOR INSERT WITH CHECK (
    action_id IN (
      SELECT id FROM actions WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for history_snapshots table
CREATE POLICY "Users can view snapshots of their projects" ON history_snapshots
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert snapshots for their projects" ON history_snapshots
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
