# Enhanced Preview - Quick Start (2 Minutes)

## What Changed?
The Preview component now **automatically fetches your GitHub repository configuration** and provides smart guidance for previewing your app.

## 3 Steps to Preview Your App

### Step 1: Ensure Your Repository is Selected
```
CodeBuilder → Click "Select Repository" 
→ Choose your GitHub repo 
→ Select your working branch
```

### Step 2: Open Preview Tab
```
Click the "Preview" tab
→ Component loads your repository configuration
→ See your repository details and integration status
```

### Step 3: Choose Your Preview Method

#### 🚀 Fastest: Auto-Detect Dev Server
```
1. Run: npm run dev
2. Click: "Auto-Detect" button
3. Wait: Component finds your server (usually <2 seconds)
4. Done: Your app previews live
```

#### 🖥️ Manual: Enter Dev Server URL
```
1. Run: npm run dev
2. Copy your URL: http://localhost:3000
3. Paste in "Preview URL" field
4. Click: "Connect"
5. Done: Your app previews live
```

#### 🌐 Deploy: Share Live Preview
(Only if Fly.io is configured)
```
1. Click: "Start Deployment"
2. Wait: Deployment completes (2-5 minutes)
3. Get: Public URL (e.g., myapp.fly.dev)
4. Share: URL with team members
```

## Auto-Detection Magic ✨

The component checks these ports automatically:
- **3000** ← Most common
- 3001, 5173, 4173, 8000, 8080, 8888

Just click "Auto-Detect" and it finds your server!

## What It Shows

### Repository Information
```
Repository: owner/name
Branch: main
GitHub Connected: ✓
Fly.io Configured: ✓
```

### After Preview Connects
- 🔄 **Navigation bar** - Type paths to navigate
- 🔄 **Refresh button** - Reload current page
- 🔗 **Open in new tab** - Full-screen view
- ⚙️ **Settings button** - Change configuration

## Troubleshooting

### "Could not detect dev server"
→ Make sure `npm run dev` is running
→ Try manual URL entry instead
→ Check that server is on port 3000, 3001, etc.

### "Localhost: Your browser must be able to access..."
→ Verify dev server is running: `npm run dev`
→ Test in browser: Open `http://localhost:3000` directly
→ If it works in browser, try preview again

### Repository not showing
→ Click "Select Repository" to choose one
→ Make sure GitHub is connected in Settings
→ Try refreshing the page

## Integration Status

| Service | Status | What It Does |
|---------|--------|--------------|
| **GitHub** | ✓ Connected | Repository selection, file operations |
| **Fly.io** | ✓ Configured | Cloud deployment and sharing |
| **Supabase** | Optional | Database and auth (if used) |

## Files Changed

✅ `components/EnhancedPreview.jsx` - NEW component
✅ `components/CodeBuilder.jsx` - Updated to use EnhancedPreview
✅ `ENHANCED_PREVIEW_GUIDE.md` - Full documentation

## Next Steps

1. ✅ Open CodeBuilder
2. ✅ Click Preview tab
3. ✅ Click "Auto-Detect" or enter dev server URL
4. ✅ Start previewing your app!

## Common Commands

```bash
# Start your dev server
npm run dev

# Run this if you see "Could not detect dev server"
npm run dev -- --port 3000

# Deploy to Fly.io (if configured)
# Use the "Start Deployment" button in preview
```

## Key Features

| Feature | When to Use | How |
|---------|------------|-----|
| **Auto-Detect** | You have dev server running | Click button, wait ~5 seconds |
| **Manual URL** | Auto-detect didn't work | Paste URL, click Connect |
| **Deploy to Fly.io** | Share live preview with others | Click "Start Deployment" |
| **Repo Info** | Reference which repo you're working with | Shows in blue bar at top |
| **Navigation** | Visit different pages in your app | Type in address bar |

## Pro Tips 💡

1. **Start dev server first** - Always run `npm run dev` before previewing
2. **Use Auto-Detect** - Faster than manually entering URL
3. **Save preview URL** - After connecting, URL is remembered for next time
4. **Check integration status** - See what's connected in the status panel
5. **Use Fly.io for sharing** - Public URL is better than localhost for demos

## Architecture (For Developers)

```
CodeBuilder (imports EnhancedPreview)
    ↓
EnhancedPreview (fetches config)
    ↓
integrations-context (repository, tokens)
    ↓
/api/integrations/load-all (retrieves saved config)
    ↓
Preview iframe (displays your app)
```

## Full Documentation

For complete details, see:
→ `ENHANCED_PREVIEW_GUIDE.md` - 400+ lines of detailed docs

For any errors:
→ `AUTH_ERROR_SOLUTION.md` - Debugging authentication issues

## Summary

**What:** Smart preview component with auto-detection
**Why:** Faster previewing without manual setup
**How:** Open Preview tab → Select method → Done!

**Time to preview:** < 30 seconds
**Setup required:** Just click "Auto-Detect"

Get started now! 🚀
