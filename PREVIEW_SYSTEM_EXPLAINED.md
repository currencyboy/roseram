# Preview System: How It Works

## Architecture Overview

```
Your App (SimpleAutoPreview)
    ↓
/api/auto-preview (POST)
    ↓
AutoPreviewManager
    ↓
Sprites.dev API ←→ Fly.io Infrastructure
    ↓
    Creates Container (Sprite)
    ↓
    Clones Repository from GitHub
    ↓
    Installs Dependencies (npm/pnpm/yarn)
    ↓
    Runs Dev Server (npm run dev)
    ↓
    Detects Port (3000, 5173, etc.)
    ↓
    Creates Preview URL: https://p-xxxxx.fly.dev
    ↓
    Returns to Frontend
    ↓
    Your App displays <iframe src="https://p-xxxxx.fly.dev" />
```

## Key Components

### 1. **SimpleAutoPreview.jsx** (Frontend)
- Sends request to `/api/auto-preview`
- Polls `/api/auto-preview?projectId=...` for status
- Shows loading state with diagnostics
- Displays preview in iframe when ready
- Shows error with diagnostics if it fails

### 2. **app/api/auto-preview/route.js** (Backend API)
- Creates preview record in database
- Starts background provisioning task
- Returns immediately (doesn't wait for preview to start)

### 3. **AutoPreviewManager** (lib/auto-preview-manager.js)
- Orchestrates the preview creation
- Detects package manager (pnpm/yarn/npm)
- Uses Sprites service to create containers

### 4. **SpritesService** (lib/sprites-service.js)
- Communicates with Sprites.dev API
- Creates container
- Clones repository
- Installs dependencies
- Starts dev server
- Detects port from dev server output

### 5. **Sprites.dev & Fly.io**
- Sprites.dev = Container platform built on Fly.io
- Creates ephemeral containers for previews
- Automatically assigns domain: `p-{random-string}.fly.dev`
- No manual Fly.io setup needed - it's automatic

## Timeline: What Happens When You Start a Preview

| Time | What's Happening | Status |
|------|-----------------|--------|
| 0s | POST /api/auto-preview | Creating preview record |
| 0s | Frontend starts polling | Waiting for preview |
| 1-5s | Sprite created | Creating container |
| 5-15s | Repository cloning | Downloading code from GitHub |
| 15-60s | npm/pnpm/yarn install | Installing dependencies |
| 30-120s | Dev server starting | Running `npm run dev` or custom script |
| 60-120s | Port detection | Waiting for server output showing port |
| **Ready** | Preview URL detected | iframe loads preview |

**Why it takes time:**
- Downloading large repositories
- Installing many dependencies (especially node_modules)
- Compiling assets/bundling
- First-time builds are slowest

## Troubleshooting: Common Issues

### 1. **"Dev server did not open a port within 120s"**
**What it means:** Dev server started but didn't output port information

**Causes:**
- Server output doesn't match port detection patterns
- Custom dev script that doesn't log port
- Dev server failed silently

**Solutions:**
- Check if repository has valid `package.json`
- Verify dev script runs: `npm run dev` or `yarn dev`
- Repository might have broken dependencies
- Try smaller repository with simpler setup first

### 2. **"Preview record not found"**
**What it means:** Database couldn't find the preview record

**Causes:**
- Database schema not set up
- RLS policies blocking access
- Supabase not configured

**Solutions:**
- Run: `POST /api/setup/auto-preview-schema`
- Check Supabase credentials
- Verify `SUPABASE_SERVICE_ROLE` is set

### 3. **"Repository not found"**
**What it means:** Can't access the GitHub repository

**Causes:**
- Repository doesn't exist
- Branch name wrong
- GitHub token doesn't have access
- Private repository without proper token

**Solutions:**
- Verify owner and repo names
- Check branch exists
- Ensure GitHub token has `repo` scope
- Private repos need user's own token

### 4. **Long waiting time (2+ minutes)**
**What it means:** Container is still provisioning

**This is normal for:**
- Large repositories (>100MB)
- Projects with many dependencies
- First preview of that repository

**What you can do:**
- Wait - it will eventually complete or timeout
- Check diagnostics for errors
- Try a simpler repository first

## How Preview URL Works

When preview is ready, you get a URL like:
```
https://p-abc123def456-67890.fly.dev
```

This URL:
- ✅ Is public (anyone can access)
- ✅ Lives on Fly.io infrastructure
- ✅ Routes to your dev server running in the Sprite
- ❌ Is temporary (deleted when preview is destroyed)
- ❌ Should not be used in production

## Do I Need Fly.io?

**Short answer: No**

**Why:**
- Sprites.dev handles everything
- It uses Fly.io infrastructure behind the scenes
- You only need: Sprites Token (environment variable)
- No manual Fly.io project setup required

## What You Need

```env
SPRITES_TOKEN="your-token-here"              # For creating containers
GITHUB_ACCESS_TOKEN="your-github-token"     # For accessing repos
SUPABASE_PROJECT_URL="your-supabase-url"    # For database
SUPABASE_SERVICE_ROLE="your-service-role"   # For API access
NEXT_PUBLIC_SUPABASE_ANON="your-anon-key"   # For frontend
```

## The Diagnostics Panel

The diagnostics panel shows:

### Status Checks
- ✓ Authentication: Are you logged in?
- ✓ Parameters: Is repository info correct?
- ✓ GitHub: Can we access the repository?
- ⏳ Preview Status: What stage is provisioning at?

### Activity Log
- What each step is doing
- When it's taking time
- Where errors occur

## Best Practices

1. **Test with simple projects first**
   - Use a small repository
   - Make sure it has a dev server
   - Test locally first

2. **Check repository requirements**
   - Must have `package.json`
   - Must have dev script (`npm run dev`, `yarn dev`, etc.)
   - Must have valid dependencies

3. **Monitor the first preview**
   - Watch diagnostics panel
   - Check browser console for errors
   - Note how long provisioning takes

4. **Debug failed previews**
   - Read the error message carefully
   - Check diagnostics for specific step that failed
   - Try the same repository locally first

## Architecture Decision: Why Sprites + Fly.io?

| Feature | Sprites.dev | Manual Fly.io |
|---------|-------------|---------------|
| Container management | ✅ Automatic | ❌ Manual |
| DNS routing | ✅ Automatic | ❌ Manual |
| Ephemeral storage | ✅ Built-in | ❌ Requires setup |
| Port detection | ✅ Automatic | ❌ Manual |
| Cleanup | ✅ Automatic | ❌ Manual |

**Winner:** Sprites.dev abstracts everything away!

## Advanced: Customization

If you want to customize preview behavior:

**Timeout:**
- Edit `lib/auto-preview-manager.js` (currently 2 minutes)
- Increase if you have slow projects
- Decrease to fail faster

**Package Manager Detection:**
- Edit `checkForLockFiles()` in `lib/auto-preview-manager.js`
- Add more lock file patterns

**Port Detection:**
- Edit port patterns in `lib/sprites-service.js`
- Add regex patterns for your frameworks

**Region:**
- Edit default region in `SimpleAutoPreview.jsx`
- Change from 'ord' (Chicago) to 'sea' (Seattle), 'syd' (Sydney), etc.

## Summary

The preview system is fully automated:
1. You provide: Repository owner, name, branch
2. System does: Everything else (create container, clone, install, run, detect port)
3. You get: Live preview URL in ~2 minutes
4. No manual Fly.io setup needed - Sprites handles it all!
