# Automated Preview Feature - Complete Workflow

## Overview
The automated preview feature allows users to spin up a live preview of their GitHub repositories with one click. The system:
1. Detects the package manager (npm/yarn/pnpm)
2. Creates package.json if needed
3. Spins up a Sprites container
4. Runs the dev server
5. Exposes a live preview URL

## Architecture

### Components

#### 1. **EnhancedPreview Component** (`components/EnhancedPreview.jsx`)
- Loads repository configuration from GitHub integration
- Provides UI for users to choose preview method
- Triggers AutoPreview when "Start Automatic Preview" is clicked
- Saves preview URLs for future access

#### 2. **AutoPreview Component** (`components/AutoPreview.jsx`)
- Handles the preview startup workflow
- Manages authentication (demo mode available)
- Shows real-time progress
- Polls for preview status
- Displays running preview in iframe
- Controls: start, stop, refresh

#### 3. **API Endpoints**

##### `/api/auto-preview` (Main endpoint)
- **POST**: Create and start preview
  - Validates user authentication
  - Gets GitHub token from user integration or uses fallback
  - Creates preview record in database
  - Starts background provisioning task
  
- **GET**: Check preview status
  - Returns current preview state
  - Updates polling component
  
- **DELETE**: Stop preview
  - Destroys Sprites container
  - Cleans up database record

##### `/api/auth/test-user` (Development only)
- **POST**: Creates demo test user for development
- Returns test credentials for login
- Only available in development mode

### Background Provisioning Flow

When POST `/api/auto-preview` is called:

1. **User Auth Check**: Validates user session
2. **GitHub API Init**: Gets user's GitHub token from integrations or env fallback
3. **Database Record**: Creates `auto_preview_instances` record with status `initializing`
4. **Background Task**: Spawns async provisioning task via `AutoPreviewManager`

### AutoPreviewManager Flow

The background provisioning task performs:

```
1. Package Manager Detection
   ├─ Check for lock files (yarn.lock, pnpm-lock.yaml, package-lock.json)
   └─ Determine package manager type

2. Package.json Handling
   ├─ Check if package.json exists
   └─ If missing, detect framework and generate one

3. Dev Script Detection
   ├─ Read package.json scripts
   ├─ Look for 'dev' or 'start' scripts
   └─ Prepare installation commands

4. Sprites Container Creation
   ├─ Create container with specified resources (RAM, CPU, region)
   ├─ Clone GitHub repository
   ├─ Install dependencies
   └─ Start dev server

5. Status Update
   ├─ Database update with preview_url
   └─ Component polling sees running status
```

## Authentication Flow

### For Authenticated Users
1. User has Supabase session via `useAuth()` hook
2. Session includes `access_token`
3. API endpoints validate token and extract user ID
4. User integrations are loaded from database

### GitHub Token Resolution (Priority)
1. First check: User's stored GitHub integration (`user_integrations` table)
2. Second check: Environment variable `GITHUB_ACCESS_TOKEN`
3. Fallback allows development without per-user GitHub setup

### For Development (Demo Mode)
1. User clicks "Start Preview" without authentication
2. Component shows demo prompt
3. User can click "Use Demo Account (Dev Only)"
4. POST `/api/auth/test-user` creates test user
5. User signed in automatically with test credentials
6. Preview starts normally

## Database Schema

### `auto_preview_instances`
```sql
- id: UUID
- project_id: string
- user_id: UUID
- owner: string (GitHub owner)
- repo: string (GitHub repo name)
- branch: string (default: 'main')
- status: enum ('initializing', 'detecting_environment', 'running', 'error', 'stopped')
- preview_url: string (public URL to preview)
- package_manager: string ('npm', 'yarn', 'pnpm')
- script_name: string ('dev' or 'start')
- sprite_name: string (unique identifier for Sprites container)
- port: number (port exposed by dev server)
- error_message: string (if status = 'error')
- created_at: timestamp
- updated_at: timestamp
```

## Environment Variables Required

### For GitHub Integration
- `GITHUB_ACCESS_TOKEN` - Fallback token if user hasn't configured their own

### For Sprites (Container Management)
- `SPRITES_TOKEN` - Authentication for Sprites service

### For Supabase
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON` - Anon key
- `SUPABASE_SERVICE_ROLE` - Service role key (server-side)

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "GitHub token not configured" | No user GitHub integration | Check /api/auto-preview/route.js fallback, ensure GITHUB_ACCESS_TOKEN set |
| "Cannot read properties of null (session)" | User not authenticated | Use demo account or login first |
| "Failed to create preview" | Sprites service down | Check SPRITES_TOKEN, verify Sprites API health |
| "Package.json generation failed" | Invalid project structure | Ensure GitHub repo is accessible |
| "Dev server failed to start" | Project dependencies fail | Check package.json, ensure valid dev script |

## Testing Checklist

### Manual Testing Steps

1. **Setup**
   - [ ] Verify GITHUB_ACCESS_TOKEN is set
   - [ ] Verify SPRITES_TOKEN is set
   - [ ] Verify Supabase is configured
   - [ ] Check dev server is running: `npm run dev`

2. **Demo Mode**
   - [ ] Click "Start Automatic Preview"
   - [ ] Verify "Sign In Required" prompt appears
   - [ ] Click "Use Demo Account (Dev Only)"
   - [ ] Verify test user is created
   - [ ] Verify auto sign-in succeeds
   - [ ] Verify preview starts

3. **Full Authentication**
   - [ ] Sign in with real account
   - [ ] Configure GitHub integration
   - [ ] Select repository
   - [ ] Start automatic preview
   - [ ] Verify preview URL appears
   - [ ] Verify iframe loads preview

4. **Preview Features**
   - [ ] Stop preview
   - [ ] Verify container is destroyed
   - [ ] Verify status updates
   - [ ] Refresh preview
   - [ ] Navigate to different paths
   - [ ] Open preview in new tab

## Files Modified/Created

### New Files
- `app/api/auth/test-user/route.js` - Demo user creation endpoint

### Modified Files
- `components/AutoPreview.jsx` - Added demo mode, better session handling
- `app/api/auto-preview/route.js` - Added GitHub token fallback

### Key Dependencies
- `lib/auto-preview-manager.js` - Core preview provisioning logic
- `lib/sprites-service.js` - Sprites container management
- `lib/package-manager-detector.js` - Package manager detection
- `lib/package-json-generator.js` - Framework detection and package.json generation

## Monitoring & Debugging

### Enable Debug Logs
The system uses a logging system with prefixes like:
- `[AutoPreview]` - Main API route
- `[AutoPreviewManager]` - Background provisioning task
- `[EnhancedPreview]` - Frontend component
- `[Sprites]` - Container management

Check server logs and browser console for detailed diagnostic information.

### API Response Examples

#### POST /api/auto-preview - Success
```json
{
  "success": true,
  "preview": {
    "id": "uuid",
    "project_id": "project-123",
    "status": "initializing",
    "preview_url": null,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "message": "Preview provisioning started"
}
```

#### GET /api/auto-preview - Running
```json
{
  "success": true,
  "preview": {
    "status": "running",
    "preview_url": "https://abc-123.sprite.sh",
    "package_manager": "npm",
    "port": 3000,
    "sprite_name": "preview-project-123-1234567890"
  }
}
```

## Future Improvements

1. **Multiple Preview Sessions** - Allow users to run multiple previews
2. **Preview History** - Save and resume previous previews
3. **Custom Port Configuration** - Allow specifying dev server port
4. **Environment Variables** - Pass custom env vars to preview
5. **Build Preview** - Support production builds, not just dev
6. **Preview Sharing** - Generate shareable preview links
7. **Analytics** - Track preview usage and performance
