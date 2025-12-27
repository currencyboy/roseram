# Action History & Code Versioning Setup

This guide explains how to set up the action history and code versioning features for the Roseram Builder.

## Overview

The application now tracks all user actions (code generation, edits, reverts, and saves) in Supabase. This enables:
- Complete audit trail of all changes
- Individual action revert capability
- Full project rollback to any previous state
- Code version history per file

## Prerequisites

1. Supabase project configured (with auth enabled)
2. Environment variables set:
   - `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON`

## Setup Steps

### 1. Create the Database Schema

The database tables need to be created in your Supabase project. Follow these steps:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Open the **SQL Editor** (on the left sidebar)
4. Click **+ New Query**
5. Copy the entire contents of `scripts/create-actions-schema.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

The schema includes:
- `actions` table - tracks all user actions with metadata
- `code_versions` table - stores code snapshots for each action
- `history_snapshots` table - complete project state for full rollbacks
- RLS (Row Level Security) policies - ensure users only see their own data
- Indexes - optimized query performance

### 2. Enable Required Extensions

The schema automatically uses PostGIS `gen_random_uuid()` function. Ensure it's available:

```sql
-- This is built-in to Supabase, no additional setup needed
SELECT gen_random_uuid();
```

### 3. Verify Schema Creation

After running the SQL:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Expected tables:
-- - actions
-- - code_versions
-- - history_snapshots
```

## How It Works

### Creating Actions

When a user generates code via Grok:

1. **CodeGeneratorChat component** sends the prompt to `/api/grok-generate`
2. Grok returns generated code
3. CodeGeneratorChat creates an action via `/api/actions` with:
   - `action_type`: "generation"
   - `description`: the user's prompt
   - `file_path`: current file being edited
   - `code_content`: the generated code
   - `metadata`: additional context (prompt, language, model)

### Tracking Actions

The **ActionHistory component** displays:
- All past actions with timestamps
- Action type (✨ generation, ✏️ edit, ↩️ revert, 💾 save)
- Expandable code preview
- Revert buttons

### Reverting Actions

Users can revert in two ways:

#### Individual Action Revert
- Click ↩️ button next to an action
- The specific action is undone
- A new "revert" action is recorded for audit trail
- File state is restored to before that action

#### Full Rollback
- Click 🗑️ button on an older action
- Project rolls back to the state before that action
- All changes after that point are lost
- A "revert" action records this rollback

### Database Operations

#### Creating an Action
```typescript
// From CodeGeneratorChat
const actionResponse = await fetch("/api/actions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    action: "create",
    projectId,
    actionType: "generation",
    description: prompt,
    filePath: currentFilePath,
    codeContent: generatedCode,
    metadata: {
      prompt,
      language,
      model: "grok-beta",
    },
  }),
});
```

#### Getting Action History
```typescript
// From ActionHistory
const historyResponse = await fetch("/api/actions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    action: "getHistory",
    projectId,
  }),
});
```

#### Reverting an Action
```typescript
const revertResponse = await fetch("/api/actions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    action: "revert",
    projectId,
    actionId,
  }),
});
```

## Architecture

### Components

1. **CodeGeneratorChat.tsx**
   - Generates code via Grok xAI
   - Creates actions for each generation
   - Displays generated code with history

2. **ActionHistory.tsx**
   - Lists all actions chronologically
   - Allows individual action revert
   - Allows full project rollback
   - Shows action metadata and code previews

3. **RepoExplorer.tsx**
   - Main code exploration interface
   - Integrates chat and history panels
   - Manages file selection and project context

### API Endpoints

**POST /api/actions**

Operations:
- `create`: Add a new action and code version
- `getHistory`: List all actions for a project
- `revert`: Undo a specific action
- `rollback`: Restore to a previous snapshot

**POST /api/grok-generate**

Generates code using Grok xAI with context from:
- User prompt
- Current file content
- File path (language detection)
- Previous code snippets

## Authentication

All action tracking requires authentication:

1. User must be logged in via Supabase Auth
2. Each API request includes `Authorization: Bearer {access_token}`
3. RLS policies ensure users only access their own data
4. Server-side validation prevents cross-user access

## Troubleshooting

### "Actions table not found"
- Ensure SQL migration in `scripts/create-actions-schema.sql` was run
- Verify tables exist in Supabase SQL Editor:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```

### "Permission denied" errors
- Check RLS policies on actions/code_versions/history_snapshots tables
- Verify user is logged in before making requests
- Check Authorization header is properly formatted: `Bearer {token}`

### "Invalid token" errors
- Ensure `session.access_token` is being used
- Token may have expired, refresh authentication
- In development, the API falls back to local user ID if auth fails

### No actions appearing in history
- Check browser DevTools Network tab for API responses
- Verify projectId is correctly set
- Check Supabase tables have data:
  ```sql
  SELECT * FROM actions WHERE project_id = '{projectId}';
  ```

## Performance Considerations

- Indexes on `project_id`, `user_id`, `created_at` optimize query performance
- History snapshots store complete file states (be mindful of large files)
- Consider archiving old actions for projects with extensive history
- RLS policies are evaluated server-side for security

## Future Enhancements

- [ ] Action filtering by type and date range
- [ ] Export action history as audit log
- [ ] Collaborate with real-time action sync
- [ ] Automatic daily snapshots
- [ ] Code diff view between versions
- [ ] Undo/redo stack management
- [ ] Action labeling and bookmarking
