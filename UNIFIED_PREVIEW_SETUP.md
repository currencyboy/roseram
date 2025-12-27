# Unified Fly.io Preview System

## Overview

The IDE now uses a unified Fly.io preview system to launch repository previews. Instead of creating individual Fly.io apps per repository, the system:

1. **Detects** your repository's package.json
2. **Identifies** the appropriate start script (dev, start, etc.)
3. **Spawns** an ephemeral preview instance on Fly.io
4. **Runs** your application with the detected script
5. **Shows helpful guidance** if configuration is missing

## How It Works

### Prerequisites

Your repository must have:
- ✅ **package.json** in the root directory
- ✅ A **"dev"** or **"start"** script defined in package.json

### Example package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "start": "next start",
    "build": "next build"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0"
  }
}
```

## Using the Preview

### Step 1: Connect GitHub
1. Sign in to the IDE
2. Click "Connect Integrations" 
3. Authorize your GitHub account with a Personal Access Token (PAT)
4. Select a repository

### Step 2: Create Working Branch
Once a repository is selected, the system automatically:
1. Creates a working branch for you
2. Loads all repository files
3. Enables the Preview tab

### Step 3: Launch Preview
1. Click the **Preview** tab in the IDE
2. The system will:
   - Check for package.json
   - Detect your start script
   - Spawn a preview instance
3. Your app launches in the embedded preview panel

## Error Messages & Solutions

### "package.json not found in repository"

**Problem:** Your repository doesn't have a package.json in the root directory.

**Solution:**
```bash
npm init -y
npm install
```

Then commit and push to GitHub.

### "No start script found in package.json"

**Problem:** Your package.json doesn't have a "dev" or "start" script.

**Solution:** Add a script to your package.json:

```json
{
  "scripts": {
    "dev": "node server.js"
  }
}
```

Replace `node server.js` with your actual start command.

### Common Framework Start Scripts

**Next.js:**
```json
{
  "scripts": {
    "dev": "next dev"
  }
}
```

**React (Vite):**
```json
{
  "scripts": {
    "dev": "vite"
  }
}
```

**Express:**
```json
{
  "scripts": {
    "dev": "node server.js"
  }
}
```

**Svelte:**
```json
{
  "scripts": {
    "dev": "vite"
  }
}
```

## Supported Runtimes

The preview system supports any Node.js application that can run with:

- **npm ci** (clean install for reproducibility)
- **npm run dev** or **npm run start**
- Port **3000** for the application (configurable)

## Architecture

### Preview Flow

```
1. User selects repository
   ↓
2. IDE sends: { owner, repo, branch, githubToken }
   ↓
3. /api/preview-instance detects package.json
   ↓
4. Extracts start script and dependencies
   ↓
5. Generates Fly Machine configuration
   ↓
6. Returns preview URL and status
   ↓
7. UnifiedPreviewPanel renders iframe with live app
```

### Instance Lifecycle

- **Ephemeral**: Instances spin up on-demand and shut down after inactivity
- **Isolated**: Each preview gets a unique instance ID
- **Auto-cleanup**: Instances automatically clean up after session ends

## Advanced Configuration

### Custom Port

By default, the system expects your app to run on port **3000**. To use a different port, update your start script:

```json
{
  "scripts": {
    "dev": "PORT=8080 next dev"
  }
}
```

### Environment Variables

Set environment variables in your GitHub repository secrets, and they'll be available during preview:

```bash
# In GitHub repo: Settings > Secrets and variables > Actions
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Private Dependencies

If your repository uses private npm packages, ensure your GitHub token has access to those repositories.

## Troubleshooting

### Preview takes too long to load

**Reasons:**
- Large node_modules installation
- Slow network connection
- Application startup delay

**Solution:** Wait 30-60 seconds for the instance to fully boot.

### "Failed to load preview"

**Reasons:**
- Application crashed on startup
- Port already in use
- Missing dependencies

**Check:** Look at your start script for errors. Ensure all dependencies are in package.json.

### CORS errors in preview

**Solution:** Add CORS headers in your application or use a CORS proxy:

```javascript
// Next.js API route example
response.headers.set('Access-Control-Allow-Origin', '*');
```

## Limitations

- Preview instances are **ephemeral** and don't persist across sessions
- Applications must be **stateless** or use external databases
- File uploads are **not supported** in preview
- Maximum **60-minute** preview session

## Next Steps

1. ✅ Ensure your repository has package.json with a start script
2. ✅ Connect your GitHub account in the IDE
3. ✅ Select a repository
4. ✅ Click "Preview" to see your app live

For support, check the Status panel in the IDE for detailed error messages and guidance.
