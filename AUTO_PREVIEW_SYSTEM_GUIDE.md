# Auto-Click Preview System - Complete Guide

## Overview

The preview system now **auto-clicks** and starts automatically when a repository is detected with valid GitHub credentials and Sprites infrastructure configured. No manual button clicking required!

## How It Works (Happy Path)

### 1. User Navigates to Preview Tab
```
User opens app → AuthProvider loads session → EnhancedPreview mounts
```

### 2. Repository Auto-Detection
```
EnhancedPreview useEffect fires → Loads GitHub integration → Fetches repository config
└─ Extracts: owner, repo, branch, GitHub token status
```

### 3. Automatic Preview Start
```
RepoConfig loaded with:
  ✓ owner & repo name
  ✓ GitHub token available
  ✓ User authenticated (session.user)
        ↓
  setPreviewUrl('auto-preview-starting')
  setShowInstructions(false)
  ↓
  AutoPreview component auto-starts
```

### 4. AutoPreview Initialization
```
AutoPreview mounts with owner, repo, branch
       ↓
  Check if user authenticated
  └─ YES: startPreview() immediately
  └─ NO (dev only): Auto-setup demo user, then start
       ↓
  POST /api/auto-preview with repo info
       ↓
  Background provisioning begins (AutoPreviewManager)
       ↓
  GET polling starts (3s intervals)
       ↓
  Preview URL obtained → Render in iframe
```

## Key Components

### 1. **EnhancedPreview.jsx** (Frontend orchestrator)
- **Detects** repository from GitHub integration
- **Triggers** auto-start when repo + token + user exist
- **Manages** state: loading → auto-preview → live preview
- **Single responsibility**: Orchestration, not rendering

```jsx
// Auto-start effect
useEffect(() => {
  if (repoConfig?.owner && repoConfig?.hasGithubToken && session?.user) {
    setPreviewUrl('auto-preview-starting'); // Trigger AutoPreview
  }
}, [repoConfig, session?.user, autoStartAttempted]);
```

### 2. **AutoPreview.jsx** (Preview engine)
- **Receives**: projectId, owner, repo, branch
- **Handles**: Authentication, demo mode, preview lifecycle
- **Auto-demos**: Automatically sets up test user (dev only)
- **Polls**: Status updates every 3 seconds
- **Renders**: Progress → Running preview → Controls

```jsx
// Auto-demo setup (development only)
useEffect(() => {
  if (showDemoPrompt && process.env.NODE_ENV === 'development') {
    setTimeout(() => setupTestUser(), 500);
  }
}, [showDemoPrompt]);
```

### 3. **API Routes**

#### POST /api/auto-preview
- **Input**: projectId, owner, repo, branch, GitHub token
- **Output**: Creates DB record, starts background provisioning
- **Token Resolution**:
  1. Check user's stored GitHub integration
  2. Fall back to `GITHUB_ACCESS_TOKEN` environment variable
  3. Fail if no token available

```javascript
// Route validates and spawns background task
const preview = await autoPreviewManager.createPreview(
  githubAPI,      // Authenticated Octokit instance
  projectId,      // Generated or provided
  owner,          // GitHub repo owner
  repo,           // GitHub repo name
  branch,         // Branch to preview
  { region, ramMB, cpus }
);
```

### 4. **AutoPreviewManager** (Background worker)
Runs in parallel to handle:
- Package manager detection (npm/yarn/pnpm)
- Package.json generation if needed
- Framework detection
- Sprites container creation
- Dev server startup
- Port exposure
- Preview URL generation

```
Detection Phase
├─ Check for lock files
├─ Detect package.json
└─ Identify framework

Creation Phase
├─ Generate package.json if needed
├─ Create Sprites container
├─ Install dependencies
├─ Start dev server
└─ Expose preview URL

Status Update
└─ Database update with preview_url → Frontend polls & sees it
```

## Infrastructure Requirements

### Configured & Available ✅
- ✅ **GitHub**: `GITHUB_ACCESS_TOKEN` environment variable
- ✅ **Sprites**: `SPRITES_TOKEN` environment variable (container management)
- ✅ **Supabase**: Database for preview instance tracking
- ✅ **GitHub Integration**: User's personal access token (optional)

### Database Schema
```sql
auto_preview_instances:
  - id (UUID)
  - project_id (string) - generated if not provided
  - user_id (UUID) - from authenticated session
  - owner (string) - GitHub owner
  - repo (string) - GitHub repo name
  - branch (string) - default 'main'
  - status (enum) - initializing → detecting_environment → running → error
  - preview_url (string) - public preview URL
  - package_manager (string) - npm/yarn/pnpm
  - sprite_name (string) - container identifier
  - port (int) - dev server port
  - error_message (string) - if status = 'error'
  - created_at, updated_at (timestamps)
```

## File Integration (Future Enhancement)

Currently implemented:
- ✅ GitHub token-based repository access
- ✅ Sprites-based container provisioning
- ✅ Real-time preview URL streaming

Future enhancements to consider:
- File explorer tree data integration (skip GitHub fetch if local files available)
- Cached package.json parsing
- Local workspace detection
- Direct file mounting in Sprites container

## Authentication Flow

### For Authenticated Users
1. Session loaded via `useAuth()` hook
2. GitHub token from integration context or env fallback
3. All API calls validated with access token
4. User ID extracted from token for DB records

### For Development (Unauthenticated)
1. `showDemoPrompt` state triggered
2. Auto-calls `POST /api/auth/test-user` (dev only)
3. Test user auto-created and auto-signed-in
4. Preview starts with test user session

## Workflow Simplification

### Before (Manual)
```
1. Click "Start Automatic Preview" button
2. Wait for preview to start
3. See error or success
```

### After (Auto-Click)
```
1. Navigate to Preview tab
2. Automatic detection happens
3. Preview starts automatically
4. User sees live preview while it's provisioning
```

## Error Handling

### Auto-Start Failures
If auto-start fails, users can:
1. See error message in AutoPreview component
2. Click "Try Again" button
3. Fall back to manual "Start Automatic Preview" button

### Manual Fallback
Instructions UI still available for:
- Users wanting local dev server connection
- Users with deployment needs (Fly.io)
- Debugging and advanced use cases

## Configuration

### Enable Auto-Start
- ✅ Automatic when all conditions met
- ✅ No config needed

### Disable Auto-Start (if needed)
- Modify `autoStartAttempted` logic in EnhancedPreview
- Remove auto-start useEffect block
- Return to manual button approach

### Override Behavior
```javascript
// In EnhancedPreview.jsx
const shouldAutoStart = 
  repoConfig?.owner &&
  repoConfig?.hasGithubToken &&
  session?.user &&
  !alwaysShowInstructions; // Add this flag to allow override
```

## Monitoring & Debugging

### Key Log Prefixes
- `[EnhancedPreview]` - Repository detection
- `[AutoPreview]` - Component lifecycle
- `[AutoPreview]` - API communication
- `[AutoPreviewManager]` - Background provisioning
- `[Sprites]` - Container management

### Debug Checklist
1. ✅ Check `[EnhancedPreview] Auto-starting preview` log
2. ✅ Verify `[AutoPreview] Starting preview with:` parameters
3. ✅ Check `[AutoPreviewManager] Creating Sprite` logs
4. ✅ Look for `[Sprites] Container created` success message
5. ✅ Wait for `[AutoPreview] Preview created successfully` log

### Common Issues

| Issue | Log | Solution |
|-------|-----|----------|
| No auto-start | Missing `[EnhancedPreview] Auto-starting preview` | Check user session, repo config, GitHub token |
| projectId missing | "projectId, owner, and repo are required" | Check if owner/repo loaded correctly |
| Sprites failure | `[Sprites]` error logs | Verify SPRITES_TOKEN, container resources |
| Package.json missing | `[AutoPreviewManager]` error | Check repo structure or detection logic |
| Dev server fails | `[AutoPreviewManager] Dev server started` not found | Check package.json scripts or dependencies |

## Performance Metrics

- **Repository detection**: ~200-500ms
- **GitHub API calls**: ~500-1000ms per call
- **Sprites container creation**: ~30-60 seconds
- **Dependency installation**: Varies (2-10 minutes depending on project)
- **Dev server startup**: ~5-30 seconds
- **Total time to preview**: ~40 seconds - 15 minutes (usually <2 min for small projects)

## User Experience Flow

```
User (Opens Preview Tab)
  ↓
[Loading...] "Loading configuration..."
  ↓ (repo detected, auto-start triggered)
[Starting] "Detecting environment... X seconds elapsed"
  ├─ Progress bar filling
  ├─ Real-time status updates
  └─ Polling every 3 seconds
  ↓
[Running] "Preview Running"
  ├─ Preview URL displayed
  ├─ Copy button
  ├─ Open in new tab button
  └─ Stop button
  ↓
Live Preview in iframe
```

## Future Improvements

1. **Faster Previews**
   - Cache dependencies in Sprites images
   - Pre-build common frameworks
   - Parallel setup steps

2. **Better File Integration**
   - Use file explorer tree instead of GitHub API
   - Support local file uploads
   - Skip GitHub entirely for local projects

3. **Enhanced UX**
   - Show real-time provisioning logs
   - Allow user to cancel during provisioning
   - Estimate time to ready
   - Saved preview URLs for quick restore

4. **Advanced Features**
   - Environment variable injection
   - Custom build scripts
   - Multiple preview sessions
   - Preview sharing / collaboration
   - Performance monitoring

## Code References

- **Main orchestrator**: `components/EnhancedPreview.jsx` lines 137-158
- **Auto-start effect**: `components/EnhancedPreview.jsx` lines 140-158
- **Preview engine**: `components/AutoPreview.jsx`
- **API endpoint**: `app/api/auto-preview/route.js`
- **Background worker**: `lib/auto-preview-manager.js`
- **Demo user setup**: `app/api/auth/test-user/route.js`
