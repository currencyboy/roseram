# Enhanced Preview Component - Complete Guide

## Overview

The **Enhanced Preview Component** automatically fetches your repository configuration and provides intelligent guidance for previewing your application. It replaces the basic preview setup with a smart system that:

✅ **Fetches repository configuration** automatically from your GitHub selection
✅ **Shows integration status** (GitHub, Fly.io, etc.)
✅ **Provides step-by-step actions** for different preview methods
✅ **Auto-detects dev server** running on common ports
✅ **Manages deployments** through Fly.io integration

## Features

### 1. Automatic Repository Detection
When you open the preview tab, the component automatically:
- Loads your selected GitHub repository (owner/name/branch)
- Displays the repository configuration
- Shows integration status for all connected services

### 2. Two Preview Methods

#### Method 1: Connect Local Dev Server (Fastest)
- Click "Auto-Detect" to automatically find your running dev server
- Or manually enter your dev server URL (http://localhost:3000)
- Live preview updates in real-time as you code

**Best for:**
- Development and testing
- Quick iterations
- Local environment testing

#### Method 2: Deploy to Fly.io (Production Preview)
- Click "Start Deployment" to deploy your app to Fly.io
- Get a live URL that you can share
- Automatic deployment and status tracking

**Best for:**
- Sharing previews with others
- Production-like environment testing
- Demo and presentation URLs

### 3. Integration Status Display
Shows real-time status of your connections:
- ✓ **GitHub Connected** - Your repository is linked
- ✓ **Fly.io Configured** - Ready for cloud deployments
- ✗ Not Connected - Available for setup in Settings

### 4. Smart Navigation
Once preview is running:
- **Address bar** - Navigate to different paths in your app
- **Refresh button** - Reload the current page
- **Open in new tab** - View in full browser window
- **Change configuration** - Switch between dev server and deployment

## How to Use

### Step 1: Set Up Your Repository (If Not Done)
1. Click on the **Code** tab
2. Click **Select Repository** 
3. Choose your GitHub repository
4. Select your working branch
5. Repository configuration is now saved

### Step 2: Open Preview Tab
1. Click on the **Preview** tab
2. The component loads your repository configuration
3. You'll see your repository details and integration status

### Step 3: Choose a Preview Method

#### Option A: Auto-Detect Dev Server (Recommended)
```
1. Start your local dev server:
   npm run dev
   
2. Click "Auto-Detect" button
   
3. The component checks common ports (3000, 3001, 5173, etc.)
   
4. When found, it connects automatically
   
5. Your app loads in the preview iframe
```

#### Option B: Manual Dev Server Connection
```
1. Start your local dev server:
   npm run dev
   
2. Copy the URL from your terminal (e.g., http://localhost:3000)
   
3. Paste it in the "Preview URL" field
   
4. Click "Connect"
   
5. Your app loads in the preview iframe
```

#### Option C: Deploy to Fly.io (If Configured)
```
1. Ensure Fly.io is configured in Settings
   
2. Click "Start Deployment"
   
3. The component initiates deployment to Fly.io
   
4. You'll get a live URL (e.g., myapp-preview.fly.dev)
   
5. Share the URL with others for live testing
```

### Step 4: Navigate Your App
- **Type paths** in the address bar to navigate pages
- **Press Enter** to load the path
- **Refresh button** to reload the current page
- **Open in new tab** for full-screen viewing

## Configuration Files

The Enhanced Preview fetches configuration from:

### 1. **GitHub Repository Selection**
- **Stored in**: `integrations-context` (via localStorage/database)
- **Used for**: Displaying repo info, detecting language/framework
- **Auto-loaded**: When EnhancedIntegrationModal is used

```javascript
{
  owner: "your-username",
  name: "your-repo",
  branch: "main",
  url: "https://github.com/your-username/your-repo"
}
```

### 2. **Preview Configuration**
- **Stored in**: `user_env_vars` table (database) or localStorage
- **Key**: `preview_url`
- **Used for**: Remembering your dev server URL

```javascript
{
  provider: "preview",
  metadata: {
    url: "http://localhost:3000"
  }
}
```

### 3. **Integration Tokens**
- **GitHub Token**: Required for repository operations
- **Fly.io Token**: Required for deployment operations
- **Loaded from**: Environment variables or database

## Development Server Detection

The component automatically detects dev servers on these ports:
- **3000** - Next.js, Create React App, Remix (default)
- **3001** - Alternative common port
- **5173** - Vite dev server
- **4173** - Vite preview server
- **8000** - Django, FastAPI
- **8080** - Various frameworks
- **8888** - Custom servers

### How It Works
```javascript
// Auto-detection algorithm
1. User clicks "Auto-Detect"
2. Component sends HEAD requests to each common port
3. First successful response = dev server found
4. URL automatically populated and saved
5. Preview loads immediately
```

## Troubleshooting

### "Could not detect dev server"
**Problem:** Auto-detect couldn't find your running server

**Solutions:**
1. ✓ Make sure your dev server is running: `npm run dev`
2. ✓ Check the port matches (usually 3000 or 3001)
3. ✓ Try manually entering the URL
4. ✓ Check firewall settings aren't blocking localhost

### "Localhost URLs: Your browser must be able to access the server"
**Problem:** Browser can't access your dev server

**Solutions:**
1. ✓ Verify dev server is running: `npm run dev`
2. ✓ Test manually: Open http://localhost:3000 in browser
3. ✓ Check your dev server output for any errors
4. ✓ If using remote server: Use the actual URL, not localhost

### "Failed to deploy to Fly.io"
**Problem:** Deployment failed or timed out

**Solutions:**
1. ✓ Check that Fly.io is configured in Settings
2. ✓ Verify Fly.io token is valid
3. ✓ Check that your repository has a Procfile or Dockerfile
4. ✓ Check Fly.io dashboard for error details

### Repository not showing
**Problem:** Repository configuration not loaded

**Solutions:**
1. ✓ Make sure you've selected a repository (CodeBuilder -> Select Repository)
2. ✓ Check that you're authenticated (GitHub token present)
3. ✓ Try refreshing the page
4. ✓ Check browser console for errors

## Code Changes Made

### Files Modified
1. **components/EnhancedPreview.jsx** (NEW)
   - Main preview component with auto-detection
   - Fetches repository config
   - Provides step-by-step guidance

2. **components/CodeBuilder.jsx** (UPDATED)
   - Replaced SimplePreview import with EnhancedPreview
   - Added onInitiateDeployment handler
   - Added onOpenIntegrations callback

3. **package.json** (UPDATED)
   - No new dependencies added
   - EnhancedPreview uses existing libraries

### Key Implementation Details

#### Fetching Repository Configuration
```javascript
// From enhanced-preview-setup.js
const response = await fetch('/api/integrations/load-all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});

const data = await response.json();
// data.github.repository = { owner, name, url, branch }
// data.github.token = GitHub access token
// data.flyio.token = Fly.io token (if configured)
```

#### Auto-Detecting Dev Server
```javascript
// Checks each common port
const detectDevServer = async () => {
  for (const port of [3000, 3001, 5173, ...]) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        mode: 'no-cors',
      });
      // Server found, use this URL
      return `http://localhost:${port}`;
    } catch (err) {
      // Try next port
    }
  }
};
```

#### Saving Preview Configuration
```javascript
// Saves selected dev server URL for future sessions
await fetch('/api/integrations/save-env-vars', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'preview',
    metadata: { url: selectedUrl },
  }),
});
```

## Integration with Other Components

### EnhancedIntegrationModal
- User selects GitHub repository
- Configuration saved to `integrations-context`
- EnhancedPreview automatically loads it

### CodeBuilder
- Uses EnhancedPreview in preview tab
- Passes projectId and callbacks
- Handles deployment initiation

### IntegrationStatusBar
- Shows integration status
- Links to Settings to configure tokens
- Works alongside EnhancedPreview

## API Endpoints Used

### Load All Integrations
```
POST /api/integrations/load-all
Response: {
  github: { token, repository, branch },
  flyio: { token },
  preview: { url }
}
```

### Save Environment Variables
```
POST /api/integrations/save-env-vars
Body: { provider, metadata }
Response: { success, message }
```

## Best Practices

### 1. Always Start Dev Server First
```bash
npm run dev
# Wait for server to start before clicking Auto-Detect
```

### 2. Keep Repository Selection Updated
- If you change repositories in GitHub, update the selection
- Click "Select Repository" again to refresh

### 3. Test Auto-Detect First
- Saves time vs. manual URL entry
- Automatically handles port detection

### 4. Use Deployment for Sharing
- Share Fly.io preview URL with team members
- Better than localhost for external viewers

### 5. Check Integration Status
- Review status before previewing
- GitHub should be connected for repo features
- Fly.io should be connected for deployments

## Advanced Usage

### Custom Dev Server Port
If your dev server runs on a non-standard port:
```
1. Start your server on custom port: npm run dev -- --port 9000
2. Click "Auto-Detect" (may not find it)
3. Manually enter: http://localhost:9000
4. Click "Connect"
```

### Remote Development Server
```
1. Deploy your dev server to remote (e.g., ngrok, SSH tunnel)
2. Get the public URL (e.g., https://abc123.ngrok.io)
3. Enter in Preview URL field
4. Click "Connect"
```

### Multiple Branches
```
1. Each branch can have its own dev server
2. Switch branches in CodeBuilder
3. Update Preview URL if server URL changes
4. Click "Change" in preview to update
```

## Performance Considerations

### Auto-Detection Speed
- ~5 seconds for full port scan if server not found
- <1 second if server found quickly
- Configurable port list in future versions

### Preview Loading
- Loads as fast as your dev server serves pages
- CSS/JS/images loaded from actual server
- Iframe sandbox prevents security issues

### Deployment Time
- Initial deployment to Fly.io: 2-5 minutes
- Subsequent deployments: 1-2 minutes
- Status updates shown in real-time

## Future Enhancements

Possible improvements for future versions:
- [ ] Custom port configuration
- [ ] SSH tunnel support for remote servers
- [ ] Deployment progress tracking UI
- [ ] Multiple environment previews
- [ ] Preview recording/sharing
- [ ] Performance metrics in preview
- [ ] Live reload toggle
- [ ] Mobile device preview modes

## Getting Help

### Documentation
- See: `ENHANCED_PREVIEW_GUIDE.md` (this file)
- See: `AUTH_ERROR_SOLUTION.md` for auth issues
- See: `DEPLOYMENT_GUIDE.md` for deployment help

### Check Console Logs
Press **F12** → **Console** tab
Look for: `[EnhancedPreview]` logs

### Debugging
- Check browser DevTools Network tab
- Monitor dev server output
- Review repository configuration
- Verify integration tokens

## Summary

The Enhanced Preview Component makes it easy to:
1. ✓ See your app changes in real-time
2. ✓ Automatically detect your dev server
3. ✓ Deploy to Fly.io for sharing
4. ✓ Manage multiple preview methods
5. ✓ Track integration status

Get started by opening the **Preview** tab and choosing your preview method!
