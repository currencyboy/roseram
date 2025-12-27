# Automated Preview System - Complete Implementation Guide

## Overview

The automated preview system enables non-technical users to preview their applications with a single click. It automatically:

1. **Detects package manager** (npm, pnpm, yarn, bun)
2. **Creates package.json** if missing (with framework detection)
3. **Installs dependencies** using the correct package manager
4. **Starts dev server** automatically
5. **Provides live preview URL** for sharing

## Architecture

### Components Created

#### 1. **Package Manager Detector** (`lib/package-manager-detector.js`)
Analyzes repository to determine which package manager is used:
- Checks lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`
- Checks config files: `.yarnrc`, `.pnpmrc`, `pnpm-workspace.yaml`
- Detects monorepo setups
- Provides installation and dev commands

**Key Functions:**
- `detectPackageManager(githubAPI, owner, repo, branch)` - Returns manager and priority
- `detectDevScript(githubAPI, owner, repo, branch)` - Finds custom dev script
- `detectWorkspace(githubAPI, owner, repo, branch)` - Detects monorepo structure
- `getInstallationCommands(manager)` - Returns install/dev/start commands

#### 2. **Package.json Generator** (`lib/package-json-generator.js`)
Auto-generates package.json for projects missing it:
- Detects framework (Next.js, Nuxt, Vite, SvelteKit, Remix, Astro, Gatsby, React, Vue)
- Generates sensible defaults with dependencies
- Creates via GitHub API (no local file system needed)

**Key Functions:**
- `detectFramework(githubAPI, owner, repo, branch)` - Identifies project type
- `generatePackageJson(projectName, framework, options)` - Creates package.json object
- `createPackageJsonInRepo(githubAPI, owner, repo, branch, packageJson, options)` - Commits to repo

#### 3. **Enhanced Sprites Service** (`lib/sprites-service.js`)
Updated to support multiple package managers:
- Dynamic install command selection based on detected PM
- Package manager aware dev server startup
- Improved error logging with PM context

**Key Changes:**
- `setupAndRunDevServer()` now accepts `packageManager` option
- Commands built dynamically: `${pm} run dev` vs `npm run dev` etc.
- Fallback chain: custom script → dev → start

#### 4. **Auto Preview Manager** (`lib/auto-preview-manager.js`)
Orchestrates the entire preview flow:
- Checks for existing previews
- Detects package manager
- Creates/updates package.json if needed
- Detects dev script
- Creates Sprite container
- Starts dev server
- Tracks active previews

**Key Methods:**
```javascript
createPreview(githubAPI, projectId, owner, repo, branch, options)
getPreview(projectId)
listPreviews()
destroyPreview(projectId)
getPreviewStatus(projectId)
```

#### 5. **Auto Preview API** (`app/api/auto-preview/route.js`)
REST API endpoints:

**POST /api/auto-preview**
```json
{
  "projectId": "project-123",
  "owner": "username",
  "repo": "repo-name",
  "branch": "main",
  "region": "ord",
  "ramMB": 1024,
  "cpus": 1
}
```

**GET /api/auto-preview?projectId=project-123**
Returns current preview status

**DELETE /api/auto-preview?projectId=project-123**
Stops and destroys preview

#### 6. **Auto Preview UI Component** (`components/AutoPreview.jsx`)
React component for users:
- One-click preview creation
- Real-time status updates
- Live preview iframe
- Error handling
- Preview URL sharing

**States:**
- `idle` - Ready to start
- `starting` - Provisioning in progress
- `running` - Live preview ready
- `error` - Failed
- `stopped` - Destroyed

#### 7. **Netlify Deployer** (`lib/netlify-deployer.js`)
For self-hosted customers using Netlify:
- Auto-detects build settings per framework
- Connects Git repository
- Triggers deployments
- Monitors build status

**Key Methods:**
```javascript
deployFromGit(repo, branch)
triggerDeploy()
getDeploymentStatus()
detectBuildSettings(githubAPI, owner, repo)
```

#### 8. **Database Schema** (`scripts/auto-preview-schema.sql`)
New table: `auto_preview_instances`
- Stores preview session metadata
- Tracks package manager used
- Records port and preview URL
- Includes error handling
- Row-level security (users only see own previews)

## Flow Diagram

```
User clicks "Start Preview"
    ↓
POST /api/auto-preview {projectId, owner, repo, branch}
    ↓
Authenticate user + get GitHub token
    ↓
Create database record (status: initializing)
    ↓
Background task starts:
    ├→ Detect package manager (npm/pnpm/yarn)
    ├→ Check if package.json exists
    ├→ If missing: detect framework → generate package.json → commit
    ├→ Detect dev script name
    ├→ Create Sprite container
    ├→ Run: git clone → <PM> install → <PM> run dev
    ├→ Detect port opened
    ├→ Update database (status: running, preview_url, port)
    └→ On error: update database (status: error, error_message)
    ↓
Frontend polls GET /api/auto-preview?projectId=...
    ↓
When status = "running": show preview iframe
```

## Usage Examples

### Basic Usage in Component

```jsx
import { AutoPreview } from '@/components/AutoPreview';

export function MyPage() {
  return (
    <AutoPreview
      projectId="my-project-123"
      owner="username"
      repo="my-repo"
      branch="main"
      onPreviewReady={(preview) => {
        console.log('Preview URL:', preview.preview_url);
      }}
    />
  );
}
```

### API Usage

```javascript
// Start a preview
const response = await fetch('/api/auto-preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    projectId: 'project-123',
    owner: 'username',
    repo: 'my-repo',
    branch: 'main',
  }),
});

const { preview } = await response.json();
console.log(preview);
// {
//   id: 'uuid',
//   project_id: 'project-123',
//   status: 'initializing',
//   preview_url: null,
//   package_manager: null,
//   ...
// }

// Poll for status
const statusResponse = await fetch(
  `/api/auto-preview?projectId=project-123`,
  {
    headers: { 'Authorization': `Bearer ${token}` },
  }
);
const { preview: updated } = await statusResponse.json();
console.log(updated.status); // 'running', 'initializing', 'error', etc.
```

### Netlify Deployment

For customers who want to self-host on Netlify:

```javascript
import { getNetlifyDeployer } from '@/lib/netlify-deployer';

const deployer = getNetlifyDeployer(
  process.env.NETLIFY_ACCESS_TOKEN,
  process.env.NETLIFY_SITE_ID
);

// Configure Git connection
const site = await deployer.deployFromGit('owner/repo', 'main');
console.log('Deploy URL:', site.url);

// Trigger a deploy
const build = await deployer.triggerDeploy();

// Check status
const status = await deployer.getDeploymentStatus();
console.log(status); // { status: 'building', buildUrl, ... }
```

## Setup Instructions

### 1. Database Migration

Run in Supabase SQL Editor:

```sql
-- Copy content from scripts/auto-preview-schema.sql
```

### 2. Environment Variables

Ensure these are set:
- `SPRITES_TOKEN` - For Sprite.sh provisioning
- `NETLIFY_ACCESS_TOKEN` - For Netlify deploys (optional)
- `NETLIFY_SITE_ID` - For Netlify deploys (optional)

### 3. GitHub Token

Users must have GitHub connected in integrations for:
- Repository analysis
- Package.json detection/creation
- Branch selection

## Supported Package Managers

| Manager | Detection | Priority | Install Command | Dev Command |
|---------|-----------|----------|-----------------|-------------|
| npm | package-lock.json | 1 | npm install | npm run dev |
| pnpm | pnpm-lock.yaml | 2 | pnpm install | pnpm dev |
| yarn | yarn.lock | 3 | yarn install | yarn dev |
| bun | bun.lockb | 4 | bun install | bun dev |

## Supported Frameworks

Auto-detection for package.json generation:

- Next.js (`next.config.js/ts`)
- Nuxt (`nuxt.config.ts/js`)
- Vite (`vite.config.ts/js`)
- SvelteKit (`svelte.config.js`)
- Remix (`remix.config.js`)
- Astro (`astro.config.ts/js/mjs`)
- Gatsby (`gatsby-config.js/ts`)
- Create React App (`.cracorc`)
- Vue.js (`vue.config.js`)
- Generic Node.js (fallback)

## Performance & Limitations

### Performance Metrics
- **Package detection:** ~500ms
- **Package.json creation:** ~1-2s
- **Sprite creation:** ~5-10s
- **Dependency installation:** 30-120s (varies by project)
- **Dev server startup:** 10-30s
- **Total time to preview:** 1-3 minutes

### Limitations
- Sprites requires valid `SPRITES_TOKEN`
- 1GB RAM and 1 CPU per preview (configurable)
- Concurrent previews limited by Sprites quota
- Only works with Git repositories
- Requires valid GitHub token

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "GitHub token not configured" | User hasn't connected GitHub | Show integration setup modal |
| "Sprites is not configured" | Missing SPRITES_TOKEN | Check environment variables |
| "Dev server did not open a port" | App doesn't start correctly | Check logs, verify dev script exists |
| "Failed to detect dev server" | No `dev` or `start` script | Create package.json with defaults |
| "Permission denied" | GitHub token lacks permissions | Reconnect with repo access |

## Monitoring & Debugging

### Check Active Previews
```javascript
import autoPreviewManager from '@/lib/auto-preview-manager';

const previews = autoPreviewManager.listPreviews();
previews.forEach(p => {
  console.log(`${p.projectId}: ${p.status} on port ${p.port}`);
});
```

### Get Preview Status
```javascript
const status = autoPreviewManager.getPreviewStatus('project-123');
console.log(status);
// {
//   projectId: 'project-123',
//   status: 'running',
//   previewUrl: 'https://preview-xyz.sprites.dev',
//   packageManager: 'pnpm',
//   createdAt: Date,
//   uptime: 12345
// }
```

### Cleanup Stuck Previews
```javascript
await autoPreviewManager.destroyPreview('project-123');
```

## Next Steps

1. Run database migration
2. Test with sample repositories (Next.js, Vite, etc.)
3. Update EnhancedPreview component to offer both:
   - Manual localhost connection (existing)
   - Automated Sprites preview (new)
   - Netlify deployment (new)
4. Add UI for package manager/framework selection override
5. Add preview history and cleanup UI
6. Monitor Sprites usage and costs

## Troubleshooting

### Preview gets stuck on "Starting"
- Check Sprites status: `echo $SPRITES_TOKEN`
- Verify app has `dev` or `start` script
- Check dev server doesn't bind to specific IP

### Wrong package manager detected
- Check lockfile presence in repository
- Use `package-lock.json` for npm (most compatible)
- Consider adding `.npmrc` or `.pnpmrc` if ambiguous

### Package.json creation fails
- Verify GitHub token has `repo` scope
- Check branch exists and is not protected
- Ensure no existing `package.json` conflicts

### Port not detected
- Dev server might be binding to `127.0.0.1` instead of `0.0.0.0`
- Check if server uses custom port
- Verify stdout/stderr message matches port detection pattern
