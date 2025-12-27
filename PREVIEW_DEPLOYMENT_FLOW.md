# Preview Deployment Flow - Complete Guide

## Overview

The preview deployment system now **automatically detects** what packages and commands are needed for your app, then **provisions and deploys** it to Fly.io with zero manual configuration.

## Architecture

```
User selects repo in EnhancedIntegrationModal
    ↓
CodeBuilder loads files and displays preview tab
    ↓
User clicks "Launch Preview" button
    ↓
GET /api/fly-preview?projectId={projectId}
    ↓
┌─────────────────────────────────────────────────┐
│ API Handler: app/api/fly-preview/route.js       │
│                                                  │
│ 1. Gets project details from Supabase          │
│ 2. Creates app record in fly_preview_apps      │
│ 3. Triggers background deployment              │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Background Job: triggerDeploymentBackground()   │
│                                                  │
│ Calls POST /api/deploy-preview                  │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ API Handler: app/api/deploy-preview/route.js    │
│                                                  │
│ Dispatches GitHub Actions workflow              │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ GitHub Actions: .github/workflows/deploy-preview.yml
│                                                  │
│ 1. Detects package.json existence              │
│ 2. Auto-detects package manager:               │
│    - pnpm-lock.yaml → pnpm                     │
│    - yarn.lock → yarn                          │
│    - package-lock.json → npm                   │
│    - (default: npm)                            │
│ 3. Reads package.json scripts                  │
│    - Looks for "build" script                  │
│    - Looks for "dev" or "start" script         │
│ 4. Installs dependencies                       │
│ 5. Builds app (if build script exists)         │
│ 6. Deploys to Fly.io                           │
│ 7. Waits for app to be ready                   │
└─────────────────────────────────────────────────┘
    ↓
UnifiedPreviewPanel polls /api/fly-preview for status
    ↓
Status updates: "pending" → "initializing" → "running"
    ↓
Preview URL loads in iframe with live app ✅
```

## Auto-Detection in Detail

### Package Manager Detection

The workflow checks for lock files in order:

```bash
# 1. Check for pnpm
if [ -f "pnpm-lock.yaml" ]; then
  install_cmd="pnpm install --frozen-lockfile"
fi

# 2. Check for yarn
elif [ -f "yarn.lock" ]; then
  install_cmd="yarn install --frozen-lockfile"
fi

# 3. Default to npm
else
  install_cmd="npm ci --only=production"
fi
```

### Build Script Detection

```bash
# Check if package.json has a "build" script
if grep -q '"build"' package.json; then
  has_build_script=true
  # Later: run "npm run build" (or yarn/pnpm equivalent)
fi
```

### Start Script Detection

```bash
# Prefer "dev" script (common in Next.js, Vite, etc.)
if grep -q '"dev"' package.json; then
  start_script="dev"
fi

# Fall back to "start"
elif grep -q '"start"' package.json; then
  start_script="start"
fi

# Default to "start"
else
  start_script="start"
fi
```

## How It Works - Step by Step

### Step 1: User Selects Repository
```javascript
// User selects repo in EnhancedIntegrationModal
// CodeBuilder receives:
// - currentBranch: { owner, repo, name }
// - repository: { owner, name }
// - github.token: GitHub access token
// - projectId: unique project ID
```

### Step 2: Preview Tab Initializes
```javascript
// CodeBuilder passes all info to UnifiedPreviewPanel
<UnifiedPreviewPanel
  projectId={projectId}
  owner={currentBranch.owner}
  repo={repository.name}
  branch={currentBranch.name}
  githubToken={github.token}
/>
```

### Step 3: User Clicks "Launch Preview"
```javascript
// UnifiedPreviewPanel.jsx
const initializePreview = async () => {
  const response = await fetch(
    `/api/fly-preview?projectId=${projectId}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );
  // Returns: { app: { id, appName, previewUrl, status } }
}
```

### Step 4: API Provisions the App
```javascript
// app/api/fly-preview/route.js GET handler

// 1. Get project details
const project = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

// 2. Create preview app record in database
const newApp = await supabase
  .from('fly_preview_apps')
  .insert({
    project_id: projectId,
    user_id: user.id,
    fly_app_name: appName,
    github_repo_url: repositoryUrl,
    github_branch: workingBranch,
    status: 'pending',
    preview_url: previewUrl,
    env_variables: { /* env vars */ },
  });

// 3. Trigger deployment in background
triggerDeploymentBackground(projectId, appName, ...);
```

### Step 5: Background Job Triggers Workflow
```javascript
// In triggerDeploymentBackground()
await octokit.rest.actions.createWorkflowDispatch({
  owner,
  repo,
  workflow_id: 'deploy-preview.yml',
  ref: branch,
  inputs: {
    appName: app.fly_app_name,
    repoUrl: app.github_repo_url,
    branch: app.github_branch,
  },
});
```

### Step 6: GitHub Actions Deploys
```yaml
# .github/workflows/deploy-preview.yml

# 1. Check out code
- uses: actions/checkout@v4

# 2. Set up Node.js
- uses: actions/setup-node@v4

# 3. Detect package manager
- name: Detect package manager
  id: detect
  run: |
    if [ -f "pnpm-lock.yaml" ]; then
      echo "package_manager=pnpm" >> $GITHUB_OUTPUT
    elif [ -f "yarn.lock" ]; then
      echo "package_manager=yarn" >> $GITHUB_OUTPUT
    else
      echo "package_manager=npm" >> $GITHUB_OUTPUT
    fi

# 4. Install dependencies
- run: ${{ steps.detect.outputs.install_cmd }}

# 5. Build (if script exists)
- run: npm run build  # (or yarn/pnpm)

# 6. Deploy to Fly.io
- run: flyctl deploy --app ${{ steps.app_name.outputs.app_name }}
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Step 7: UnifiedPreviewPanel Polls Status
```javascript
// Polls every 5 seconds for up to 10 minutes
const pollDeploymentStatus = async (appId) => {
  const response = await fetch(`/api/fly-preview`, {
    method: 'POST',
    body: JSON.stringify({ appId, action: 'status' }),
  });
  
  const { app } = await response.json();
  // Status: 'pending' → 'initializing' → 'running'
  
  if (app.status === 'running') {
    // Load preview URL in iframe
    setPreviewUrl(app.previewUrl);
  }
};
```

### Step 8: Preview Renders
```javascript
// When status === 'running'
<iframe
  src={previewUrl}
  sandbox="allow-same-origin allow-scripts allow-forms"
/>
```

## Supported Project Types

### Node.js / Next.js / React
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```
✅ **Supported** - Auto-detected and deployed

### Vite
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```
✅ **Supported** - Uses "dev" script

### Express / Node.js Server
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```
✅ **Supported** - Falls back to "start" script

### Monorepos (with workspaces)
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build"
  }
}
```
✅ **Supported** - Package manager handles workspaces

## Troubleshooting

### Error: "No start script found in package.json"
**Solution**: Add a start script to your package.json
```json
{
  "scripts": {
    "dev": "your-command-here",
    "start": "your-production-command"
  }
}
```

### Error: "Deployment timeout"
**Possible causes**:
1. App takes too long to start (> 2 minutes)
2. App crashes after starting
3. App isn't listening on port 3000

**Solution**:
- Ensure app listens on port 3000 (or PORT env var)
- Add proper error handling
- Check logs: `flyctl logs --app {app-name}`

### Preview URL returns 404
**Cause**: App deployed but not serving correctly

**Solution**:
```javascript
// Make sure your app listens on the right port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Package manager not detected
**Cause**: Missing lock file for non-npm packages

**Solution**:
- For pnpm: Ensure `pnpm-lock.yaml` is committed
- For yarn: Ensure `yarn.lock` is committed
- Will default to `npm ci` if no lock file found

## Environment Variables

The deployment sets these automatically:
```
NODE_ENV=production
PACKAGE_MANAGER=npm|yarn|pnpm
GITHUB_REPO=owner/repo
BRANCH=branch-name
```

You can add custom env vars in the GitHub Actions workflow or fly.toml.

## Security Notes

1. **GitHub Token**: Never logged or exposed
2. **FLY_API_TOKEN**: Must be set in GitHub repo secrets
3. **Preview Apps**: Auto-destroyed after inactivity
4. **Isolation**: Each preview runs in its own Fly.io VM

## File References

- **Preview Component**: `components/UnifiedPreviewPanel.jsx`
- **Preview API**: `app/api/fly-preview/route.js`
- **Deploy Trigger**: `app/api/deploy-preview/route.js`
- **Package Detection**: `app/api/preview-instance/route.js`
- **GitHub Actions**: `.github/workflows/deploy-preview.yml`
- **Database Table**: `supabase.fly_preview_apps`
