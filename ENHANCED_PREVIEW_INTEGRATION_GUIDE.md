# EnhancedPreview Integration with Status Tab

## Overview

The Preview tab now **automatically detects** the repository from the **Status tab** instead of requiring users to manually select it. This provides a seamless experience where users see the appropriate preview option immediately when they have a repository selected.

## How It Works

### Data Flow

```
Status Tab (CodeBuilder)
    ↓
Integrations Context (github.repository)
    ↓
EnhancedPreview fetches from context on mount
    ↓
Shows appropriate preview option
    ↓
For repos with owner/name → Shows "Automatic Preview" (recommended)
For repos without selection → Shows manual options
```

### Smart Routing Logic

```javascript
// 1. Component initialization
useEffect(() => {
  // Check integrations context first (real-time from Status tab)
  if (github?.repository) {
    // Extract repository owner/name
    setRepoConfig({...})
  }
  // Fallback to API if not in context
}, [github])

// 2. Rendering logic
if (previewUrl === 'auto-preview-starting') {
  // Show AutoPreview component (one-click setup)
  return <AutoPreview owner={...} repo={...} />
}

if (showInstructions) {
  // Show manual options
  if (repoConfig?.owner && repoConfig?.name) {
    // Show "Automatic Preview" button (recommended)
  }
  // Also show manual options
  return <InstructionsView />
}

if (savedPreviewUrl) {
  // Show running preview
  return <IframePreview url={...} />
}
```

## Key Changes

### 1. Repository Detection (Enhanced)

**Before:**
```javascript
// Only loaded from API
const response = await fetch('/api/integrations/load-all', ...)
setRepoConfig(data.github?.repository)
```

**After:**
```javascript
// Priority: integrations context → API
if (github?.repository) {
  // Real-time from Status tab
  setRepoConfig(github.repository)
} else {
  // Fallback to API
  const response = await fetch('/api/integrations/load-all', ...)
}
```

### 2. Auto-Preview Button (New)

When a repository is detected from the Status tab, a new prominent "Recommended" section appears:

```
┌─────────────────────────────────────────┐
│ ⚡ One-Click Automatic Preview          │ ← RECOMMENDED
│                                          │
│ We detected your repository:             │
│ username/my-repo                         │
│                                          │
│ [Start Automatic Preview] ← One click!   │
└─────────────────────────────────────────┘
```

### 3. Component Integration

**Location:** `components/EnhancedPreview.jsx`

**Imports:** Now includes `AutoPreview` component

```javascript
import { AutoPreview } from './AutoPreview';
```

**New State Trigger:**

```javascript
// When user clicks "Start Automatic Preview"
setPreviewUrl('auto-preview-starting');

// On next render, AutoPreview appears
if (previewUrl === 'auto-preview-starting') {
  return <AutoPreview {...props} />
}
```

## Integration Points

### Status Tab Integration

The Preview tab automatically reads from the Status tab's data:

**Files involved:**
- `components/CodeBuilder.jsx` - Provides `currentBranch` and `repository` data
- `lib/integrations-context.jsx` - Provides `github.repository` state
- `components/EnhancedPreview.jsx` - Consumes the data

**Data available from Status tab:**
```javascript
{
  currentBranch: {
    name: 'main',
    owner: 'username',
    repo: 'repository-name',
    url: 'https://github.com/username/repository-name'
  },
  repository: {
    name: 'Repository Name',
    description: '...'
  }
}
```

### AutoPreview Component

When user clicks "Start Automatic Preview", the system:

1. Detects package manager (npm/pnpm/yarn/bun)
2. Creates package.json if missing (with framework detection)
3. Spins up Sprite container
4. Installs dependencies
5. Starts dev server
6. Returns live preview URL

**No user commands needed!**

## User Experience

### Scenario 1: User with Repository Selected

```
1. User is in CodeBuilder
2. Visits Status tab → sees their repository
3. Clicks Preview tab
4. EnhancedPreview auto-detects repository from Status tab
5. Shows "One-Click Automatic Preview" button (recommended)
6. User clicks button
7. AutoPreview spins up → live preview ready
8. Preview iframe appears with live URL
```

### Scenario 2: User without Repository Selected

```
1. User is in CodeBuilder
2. No repository selected yet
3. Clicks Preview tab
4. EnhancedPreview shows instructions
5. User can:
   a. Manually connect localhost
   b. Deploy to Fly.io
```

### Scenario 3: User has Saved Preview URL

```
1. Preview URL already saved from previous session
2. EnhancedPreview auto-loads it
3. Shows live preview immediately
```

## API Endpoints Used

### `/api/integrations/load-all` (Fallback)
- Used when repository not in context
- Returns saved tokens and preview config

### `/api/auto-preview`
- Triggered when user clicks "Start Automatic Preview"
- Manages preview lifecycle (create, status, delete)
- Uses Sprite.sh for ephemeral containers

## Configuration Requirements

### For Automatic Preview to Work

1. **GitHub Token:** User must be authenticated with GitHub
2. **Repository Selected:** User must have selected a repo in Status tab
3. **Sprites Token:** Must be configured in environment
   ```
   SPRITES_TOKEN=your-sprites-token
   ```

### Optional for Deployments

1. **Fly.io Token:** For persistent Fly.io deployments
   ```
   NEXT_FLY_IO_TOKEN=your-token
   ```

## UI Changes

### EnhancedPreview Instructions View

**Before:**
- Only showed manual options
- Required users to know their package manager

**After:**
- Shows prominent "RECOMMENDED" section for automatic preview
- Only displays automatic option if repository detected
- Manual options available as fallback

**Numbering:**
- With repo: Option 1=Automatic, 2=Manual, 3=Fly.io
- Without repo: Option 1=Manual, 2=Fly.io

## Performance Improvements

1. **Instant Repository Loading**
   - No need to wait for API call
   - Uses real-time context data
   - Fallback to API if needed

2. **One-Click Activation**
   - Single button click to start preview
   - No form filling required
   - Auto-detects everything

3. **Non-Blocking**
   - Preview setup happens in background
   - User sees status immediately
   - Real-time progress updates

## Code Flow Diagram

```
CodeBuilder renders EnhancedPreview
        ↓
EnhancedPreview mounts
        ↓
Check integrations context (github.repository)
        ↓
If repo found:
  ├→ Set repoConfig with owner/name
  ├→ Show instructions with AUTO-PREVIEW button
  ├→ User clicks button
  ├→ Set previewUrl = 'auto-preview-starting'
  └→ AutoPreview component renders
        ↓
AutoPreview takes over:
  ├→ Detect package manager
  ├→ Create package.json if needed
  ├→ Create Sprite container
  ├→ Install dependencies
  ├→ Start dev server
  └→ Call onPreviewReady callback
        ↓
EnhancedPreview receives preview_url
        ↓
Show iframe with live preview
```

## Troubleshooting

### "No repository detected"
- **Solution:** Go to Status tab and select a repository first
- **Check:** Ensure `github.repository` is set in integrations context

### "Automatic Preview button doesn't appear"
- **Solution:** Repository data may not have loaded yet
- **Check:** Reload the page, verify Status tab shows repository

### "Preview fails to start"
- **Solution:** Check if Sprites token is configured
- **Check:** Run `echo $SPRITES_TOKEN` to verify environment

### "Package manager not detected correctly"
- **Solution:** Ensure lockfile exists in repository (package-lock.json, pnpm-lock.yaml, etc.)
- **Check:** Create manual package.json or add correct lockfile

## Testing

### Manual Testing Checklist

- [ ] Open CodeBuilder
- [ ] Go to Status tab and select a repository
- [ ] Switch to Preview tab
- [ ] Verify "One-Click Automatic Preview" section appears
- [ ] Verify repository name shows in button text
- [ ] Click button and verify AutoPreview component loads
- [ ] Wait for preview to start and verify live URL appears
- [ ] Verify preview iframe displays correctly
- [ ] Test fallback: clear repository selection, reload preview tab
- [ ] Verify manual options appear when no repo selected

### Integration Testing

- [ ] Verify context data syncs between Status and Preview tabs
- [ ] Verify API fallback works if context unavailable
- [ ] Verify localStorage/global config persists selection
- [ ] Test across different repositories and branches
- [ ] Test with different package managers (npm, pnpm, yarn)

## Future Enhancements

1. **Preview History**
   - Save multiple preview sessions
   - Quick switching between recent previews

2. **Custom Port Selection**
   - Allow users to override port detection
   - Support multiple dev servers

3. **Preview URL Sharing**
   - Generate shareable links
   - Track access analytics

4. **Build Optimization**
   - Cache dependencies between previews
   - Faster subsequent starts

5. **Advanced Package Manager Detection**
   - Monorepo support
   - Workspace-specific installations

## Summary

The enhanced Preview tab now provides a **frictionless experience** for users:

1. **Automatic**: Detects repository from Status tab automatically
2. **Smart**: Shows appropriate option based on selection
3. **Simple**: One-click to start preview
4. **Seamless**: No user commands or configuration needed

Users with a repository selected in the Status tab now get a streamlined path to a live preview, while those without selection still have manual options available.
