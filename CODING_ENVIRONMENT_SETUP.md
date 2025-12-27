# Unified Coding Environment Setup Guide

## Overview

The Roseram Builder now includes a complete, integrated coding environment with:
- 📁 Repository browser with file explorer
- 💻 Real-time code editor
- 👁️ Live preview window
- 🤖 Grok AI code generation
- 📝 Change tracking and revision history
- 📊 Activity/actions log
- ⏮️ Full rollback capability

## Architecture

### Components

1. **CodeBuilder** (`components/CodeBuilder.tsx`)
   - Main unified component that brings everything together
   - Manages file exploration, editing, preview, and Grok integration
   - Handles state for file changes and operations

2. **RevisionHistory** (`components/RevisionHistory.tsx`)
   - Displays all file revisions with timestamps
   - Shows change type (edit, generate, etc.)
   - Allows reverting to any previous version

3. **ActionsLog** (`components/ActionsLog.tsx`)
   - Real-time activity log of all operations
   - Auto-refreshes every 5 seconds
   - Shows action type, file path, and timestamp

4. **useRevisions Hook** (`lib/useRevisions.ts`)
   - Custom hook for saving revisions and logging actions
   - Provides `saveRevision()` and `logAction()` functions
   - Handles API communication with backend

### API Endpoints

#### `/api/revisions` (GET/POST)
- **GET**: Fetch all revisions for a file
  - Query params: `projectId`, `filePath`
  - Returns array of revisions with content, change_type, timestamp

- **POST**: Save a new revision
  - Body: `{ projectId, filePath, content, changeType, message }`
  - Returns created revision object

#### `/api/actions` (GET/POST)
- **GET**: Fetch all actions for a project
  - Query params: `projectId`, `limit`, `offset`
  - Returns paginated action log

- **POST**: Log an action
  - Body: `{ projectId, action, filePath, description, metadata }`
  - Returns created action object

### Database Tables

#### `file_revisions`
```sql
- id (UUID, PK)
- project_id (FK)
- file_path (VARCHAR)
- content (TEXT)
- change_type (VARCHAR: create, edit, delete, rename, generate)
- message (TEXT)
- created_at (TIMESTAMP)
```

#### `action_logs`
```sql
- id (UUID, PK)
- project_id (FK)
- action (VARCHAR: edit, generate, deploy, commit, rollback, etc.)
- file_path (VARCHAR)
- description (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

## Setup Steps

### 1. Initialize Supabase Tables

Run the migration SQL in your Supabase SQL Editor:

```bash
# Copy the contents of migrations/add_revisions_and_actions.sql
# and paste into Supabase SQL Editor
```

**SQL Location**: `migrations/add_revisions_and_actions.sql`

### 2. Environment Variables

Ensure these are set (already configured in your environment):

```
NEXT_PUBLIC_SUPABASE_PROJECT_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON=your_supabase_anon_key
X_API_KEY=your_xai_api_key (for Grok)
GITHUB_ACCESS_TOKEN=your_github_token
```

### 3. Access the Builder

Navigate to `/builder` to see the unified coding environment.

## Features

### 1. File Explorer
- Browse repository structure
- Click files to open and edit
- Visual indicator (●) shows modified files

### 2. Code Editor
- Real-time editing with syntax highlighting
- Save changes to revisions
- Monitor file changes

### 3. Grok AI Integration
- Write prompts to generate or modify code
- Automatically saves generated code as a revision
- Tracks generation actions in activity log

### 4. Live Preview
- Shows HTML file previews in real-time
- Updates when HTML is edited or generated
- Sandbox iframe for safe code execution

### 5. Revision History
- Shows all changes to a file
- Displays change type and timestamp
- Click to expand and see code preview
- One-click restore to any previous version

### 6. Activity Log
- Real-time log of all operations
- Shows: edits, generations, rollbacks, deployments
- Includes timestamp and file path
- Auto-refreshes every 5 seconds

### 7. View Modes
Three layout options for optimal workflow:

- **Split View**: Code editor on left (1/3), Preview on right (2/3)
- **Editor View**: Full-screen code editor
- **Preview View**: Full-screen live preview

## Workflow Example

1. **Open File**: Click a file in explorer → code editor loads
2. **Edit Code**: Modify content directly in editor
3. **Save Changes**: Click "Save File" → revision created
4. **Generate with Grok**: 
   - Enter prompt in "Grok AI Prompt" box
   - Click "Generate" → AI generates code
   - Revision automatically created
5. **View Changes**: Check "Activity Log" tab to see all changes
6. **Restore Version**: Click "Version History" → select revision → click restore icon
7. **Preview Result**: Switch to "Preview" or "Split" view to see output

## Real-Time Tracking

### Change Detection
- All file edits are tracked
- Grok generations create "generate" type revisions
- Manual saves create "edit" type revisions

### Action Logging
- Every operation is logged to `action_logs` table
- Activity log auto-refreshes every 5 seconds
- Includes metadata about each action

## Error Handling

### Common Issues

**"Missing authorization token"**
- Ensure GitHub token is connected
- Check environment variables are loaded

**"Failed to fetch file"**
- Verify repository is connected
- Check GitHub token has repo access

**"Failed to save revision"**
- Ensure Supabase is connected
- Check database tables are created
- Verify row-level security policies

**Grok Generation Fails**
- Check X_API_KEY environment variable
- Verify Grok API is accessible
- Check rate limits

## Best Practices

1. **Save Regularly**: Click "Save File" to create revision checkpoints
2. **Use Descriptive Prompts**: More specific prompts → better generations
3. **Check Activity Log**: Monitor what changes are being made
4. **Version Control**: Utilize history before major changes
5. **Preview Often**: Switch to preview mode to verify output

## Future Enhancements

Potential additions:
- Diff view between revisions
- Collaborative editing (real-time sync)
- Search within files
- File creation/deletion in UI
- Deployment tracking and history
- Performance metrics
- Error logging and debugging
- Code analysis and linting

## Troubleshooting

### Changes not appearing in history?
1. Check browser console for errors
2. Verify Supabase RLS policies are enabled
3. Ensure user is authenticated

### Activity log not updating?
1. Check /api/actions endpoint response
2. Verify projectId is set correctly
3. Check browser network tab for failed requests

### Revisions not saved?
1. Verify /api/revisions endpoint works
2. Check Supabase connection
3. Review error messages in browser console

## Database Queries

### Check latest revisions for a file
```sql
SELECT * FROM file_revisions 
WHERE project_id = 'your-project-id'
AND file_path = 'path/to/file'
ORDER BY created_at DESC
LIMIT 10;
```

### View all actions for a project
```sql
SELECT * FROM action_logs
WHERE project_id = 'your-project-id'
ORDER BY created_at DESC
LIMIT 50;
```

### Check activity by type
```sql
SELECT action, COUNT(*) as count
FROM action_logs
WHERE project_id = 'your-project-id'
GROUP BY action
ORDER BY count DESC;
```

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify all environment variables are set
3. Check Supabase SQL Editor for table status
4. Review API endpoint logs
