# Supabase Setup: Revisions and Actions Tables

## Quick Start

To enable the new revision history and activity logging features, you need to create two new tables in Supabase.

### Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com
   - Select your project "roseram-builder"

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste Migration SQL**
   - Copy the entire contents of `migrations/add_revisions_and_actions.sql`
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" (or Ctrl+Enter)
   - Wait for success message
   - You should see: "Success. No rows returned"

5. **Verify Tables Created**
   - Click "Table Editor" in left sidebar
   - You should see two new tables:
     - `file_revisions`
     - `action_logs`

6. **Enable Real-Time (Optional)**
   - Click on `file_revisions` table
   - Click "Realtime" tab
   - Click "Enable Realtime" if you want real-time sync

## What Gets Created

### file_revisions Table
Stores every file modification:
- `id`: Unique identifier (UUID)
- `project_id`: Links to project
- `file_path`: Path to the file being edited
- `content`: Full file content at that revision
- `change_type`: Type of change (create, edit, delete, rename, generate)
- `message`: Optional message describing the change
- `created_at`: Timestamp of revision

**Example Data**:
```
id: 550e8400-e29b-41d4-a716-446655440000
project_id: default-project
file_path: index.html
content: <html><body>...</body></html>
change_type: generate
message: Generated with prompt: Create a landing page
created_at: 2024-01-15 10:30:45
```

### action_logs Table
Tracks all user actions:
- `id`: Unique identifier (UUID)
- `project_id`: Links to project
- `action`: Type of action (edit, generate, deploy, rollback, etc.)
- `file_path`: File involved (optional)
- `description`: Human-readable description
- `metadata`: Additional JSON data
- `created_at`: Timestamp of action

**Example Data**:
```
id: 650e8400-e29b-41d4-a716-446655440001
project_id: default-project
action: generate
file_path: index.html
description: Generated with Grok AI
metadata: {"tokens_used": 150, "prompt_length": 45}
created_at: 2024-01-15 10:30:45
```

## Manual Table Creation (If Needed)

If the migration fails, create tables manually:

### Create file_revisions

```sql
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

CREATE INDEX file_revisions_project_id_idx ON public.file_revisions(project_id);
CREATE INDEX file_revisions_file_path_idx ON public.file_revisions(file_path);
CREATE INDEX file_revisions_created_at_idx ON public.file_revisions(created_at DESC);
CREATE INDEX file_revisions_project_file_idx ON public.file_revisions(project_id, file_path);
```

### Create action_logs

```sql
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

CREATE INDEX action_logs_project_id_idx ON public.action_logs(project_id);
CREATE INDEX action_logs_action_idx ON public.action_logs(action);
CREATE INDEX action_logs_created_at_idx ON public.action_logs(created_at DESC);
CREATE INDEX action_logs_file_path_idx ON public.action_logs(file_path);
```

### Enable Row-Level Security

```sql
ALTER TABLE public.file_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Policies for file_revisions
CREATE POLICY "Users can view revisions for their projects"
  ON public.file_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_revisions.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create revisions for their projects"
  ON public.file_revisions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = file_revisions.project_id
    AND projects.user_id = auth.uid()
  ));

-- Policies for action_logs
CREATE POLICY "Users can view action logs for their projects"
  ON public.action_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = action_logs.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create action logs for their projects"
  ON public.action_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = action_logs.project_id
    AND projects.user_id = auth.uid()
  ));
```

## Verification Queries

After creating the tables, run these to verify:

```sql
-- Check file_revisions table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'file_revisions';

-- Check action_logs table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'action_logs';

-- List columns in file_revisions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'file_revisions';

-- List columns in action_logs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'action_logs';
```

## Testing

Once tables are created, test by:

1. Go to `/builder` page
2. Select a file to edit
3. Make a change and click "Save File"
4. Go to Supabase Table Editor
5. Click on `file_revisions` table
6. You should see a new row with your file content

## Common Issues

### "Column 'user_id' does not exist"
- Make sure `projects` table has `user_id` column
- Check: `SELECT * FROM public.projects LIMIT 1;`

### "Referenced table does not exist"
- Verify `projects` table exists first
- Run: `SELECT table_name FROM information_schema.tables WHERE table_name = 'projects';`

### RLS Policies Return No Rows
- Ensure you're authenticated
- Check you're owner of the project (user_id matches)
- Temporarily disable RLS to test: `ALTER TABLE public.file_revisions DISABLE ROW LEVEL SECURITY;`

### Queries Return 0 Rows
1. Check user is authenticated
2. Verify projectId is correct
3. Manually insert test data with correct user_id

## Need Help?

Check:
1. Supabase docs: https://supabase.com/docs
2. Browser console for API errors
3. Supabase SQL Editor for table errors
4. Network tab for request/response details
