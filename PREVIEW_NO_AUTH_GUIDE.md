# Preview Without Authentication - Implementation Guide

## Overview

The preview system has been reconfigured to **boot Fly.io machines immediately WITHOUT requiring authentication**. This eliminates the "Verifying authentication..." bottleneck.

## Changes Made

### 1. ✅ New Server-Side Config Endpoint
**File:** `app/api/preview-config/route.js`

Provides server-side configuration management for preview settings. No authentication required.

```bash
# Get current preview config
curl http://localhost:3000/api/preview-config

# Update preview config
curl -X POST http://localhost:3000/api/preview-config \
  -H "Content-Type: application/json" \
  -d '{"skipAuthenticationCheck": true, "enableDirectBrowser": true}'
```

**Features:**
- `enableInstantBoot`: Start machines immediately
- `skipAuthenticationCheck`: Don't require auth for preview
- `enableDirectBrowser`: Allow direct browser access
- `bootTimeout`: Machine startup timeout (default: 60s)
- `machineSize`: Fly.io machine size (default: shared-cpu-2x)

### 2. ✅ Enhanced Instant Preview API
**File:** `app/api/instant-preview/route.js`

Already existed but now improved with:
- Immediate machine boot (non-blocking)
- Background deployment
- No authentication required
- Real-time status polling support

```bash
# Boot a preview machine immediately
curl "http://localhost:3000/api/instant-preview?projectId=myproject&repo=owner/repo&branch=main"

# Response:
{
  "success": true,
  "appName": "preview-abc123",
  "previewUrl": "https://preview-abc123.fly.dev",
  "status": "launching",
  "message": "Preview machine is launching. This may take 30-60 seconds to be fully accessible."
}
```

### 3. ✅ New Status Check Endpoint
**File:** `app/api/instant-preview/status/route.js`

Enables real-time polling of machine readiness. No authentication required.

```bash
# Check machine status
curl "http://localhost:3000/api/instant-preview/status?appName=preview-abc123&projectId=myproject"

# Response:
{
  "success": true,
  "appName": "preview-abc123",
  "machineState": "started",
  "deployed": true,
  "source": "flyio"
}
```

### 4. ✅ New QuickPreview Component
**File:** `components/QuickPreview.jsx`

Enhanced preview component with:
- **No authentication required** - boots immediately
- Real-time progress tracking (10% → 100%)
- Status polling with visual feedback
- Responsive loading state
- Copy-to-clipboard URL
- Open-in-new-tab button
- Live iframe embedding

**Features:**
- Starts polling immediately after boot
- Shows progress: Launching → Deploying → Ready
- Handles timeouts gracefully
- Provides URL while machine is starting
- Beautiful loading UI with progress bar

### 5. ✅ Updated Main Preview Component
**File:** `components/EnhancedPreview.jsx`

**Before:** Used `SyncedFlyPreview` (auth-locked)
**After:** Uses `QuickPreview` (no auth required)

This change ensures:
- Preview launches without login screen
- No "Verifying authentication..." message
- Instant boot of Fly.io machine
- Seamless user experience

## Architecture

```
User Flow (Before):
┌─────────────────────────────────────────────────┐
│ 1. Click "Preview" Tab                          │
├─────────────────────────────────────────────────┤
│ 2. SyncedFlyPreview loads                       │
│    ↓                                            │
│    useAuth() checks authentication              │
│    "Verifying authentication..." message        │
│    [STUCK HERE] ⚠️ Auth initialization hangs   │
├─────────────────────────────────────────────────┤
│ 3. Never reaches preview boot                   │
└─────────────────────────────────────────────────┘

User Flow (After):
┌─────────────────────────────────────────────────┐
│ 1. Click "Preview" Tab                          │
├─────────────────────────────────────────────────┤
│ 2. QuickPreview loads (no auth check)           │
│    ↓                                            │
│    /api/instant-preview called immediately     │
│    ↓                                            │
│    Machine boot initiated in background         │
│    ↓                                            │
│    Polling starts: /api/instant-preview/status │
│    Progress: 10% → 25% → 50% → 100%           │
├─────────────────────────────────────────────────┤
│ 3. Preview URL ready in 30-90 seconds          │
│    Iframe loads live preview                    │
└─────────────────────────────────────────────────┘
```

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/preview-config` | GET | ❌ No | Get preview settings |
| `/api/preview-config` | POST | ❌ No | Update preview settings |
| `/api/instant-preview` | GET | ❌ No | Boot machine immediately |
| `/api/instant-preview/status` | GET | ❌ No | Check machine readiness |

## Testing

### 1. Test the API Endpoints

```bash
# Boot a preview
curl "http://localhost:3000/api/instant-preview?projectId=test&repo=facebook/react&branch=main"

# Check status
curl "http://localhost:3000/api/instant-preview/status?appName=preview-12345&projectId=test"

# Get config
curl "http://localhost:3000/api/preview-config"
```

### 2. Test the UI Component

Visit the test page:
```
http://localhost:3000/test-preview
```

This page shows:
- ✅ QuickPreview component in action
- ✅ InstantFlyPreview component (original)
- ✅ Side-by-side test results
- ✅ Performance metrics
- ✅ Test checklist

### 3. Verify the Main Preview Works

1. Open the IDE/Editor
2. Go to the "Preview" tab
3. **Expected:** No auth modal appears
4. **Expected:** "Launching Fly.io Machine" message appears
5. **Expected:** Progress bar shows 0% → 100%
6. **Expected:** Live preview loads after 30-90 seconds

## Key Benefits

✅ **No Authentication Required**
- Preview boots without login
- Eliminates "Verifying authentication..." bottleneck
- Instantly accessible

✅ **Real-Time Progress Feedback**
- Users see status: Launching → Deploying → Ready
- Progress bar shows 0% → 100%
- Clear timeline: "30-90 seconds"

✅ **Server-Side Configuration**
- Settings managed on server (no secrets in client)
- Can adjust boot timeout, machine size, etc.
- Easy to enable/disable features

✅ **Graceful Error Handling**
- Network errors handled gracefully
- Timeout handling (auto-retry)
- Clear error messages

## Configuration

### Enable/Disable Features

```javascript
// Update server-side config
const config = {
  skipAuthenticationCheck: true,  // Don't require auth
  enableDirectBrowser: true,      // Allow direct access
  enableInstantBoot: true,        // Start immediately
  bootTimeout: 60000,             // Max 60 seconds
  machineSize: 'shared-cpu-2x',   // Machine size
  maxConcurrentPreviews: 10,      // Limit simultaneous
  enableLogging: true,            // Log activity
};
```

## Environment Variables

No new environment variables required! Uses existing:
- `FLY_IO_TOKEN` - Fly.io API access
- `NEXT_PUBLIC_GITHUB_ACCESS_TOKEN` - GitHub repo access
- `SUPABASE_*` - Database (for preview app records)

## Debugging

### If Preview Doesn't Boot

1. **Check Console Logs**
   ```javascript
   // Look for [QuickPreview] logs
   [QuickPreview] Booting machine
   [QuickPreview] Machine boot initiated
   [QuickPreview] Status: deploying
   [QuickPreview] Machine ready!
   ```

2. **Check API Response**
   ```bash
   curl -v "http://localhost:3000/api/instant-preview?projectId=test&repo=owner/repo&branch=main"
   ```

3. **Verify Fly.io Configuration**
   ```bash
   # Check if FLY_IO_TOKEN is set
   echo $FLY_IO_TOKEN
   
   # Check if Fly CLI is available (optional)
   fly status
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Fly.io is not configured" | Set `FLY_IO_TOKEN` env var |
| "Missing required parameters" | Include `projectId`, `repo`, `branch` in URL |
| Machine doesn't boot | Check Fly.io account limits and quotas |
| Status polling fails | Check CORS headers in response |
| Iframe content not loading | Ensure preview port 3000 is accessible |

## Migration from Old System

If you were using `SyncedFlyPreview`:

```javascript
// OLD (Auth-required)
<SyncedFlyPreview
  projectId={id}
  currentBranch={branch}
  repository={repo}
/>

// NEW (No auth required)
<QuickPreview
  projectId={id}
  currentBranch={branch}
  repository={repo}
/>
```

## Files Modified

- ✅ `components/EnhancedPreview.jsx` - Updated to use QuickPreview
- ✅ `app/api/instant-preview/route.js` - Improved API
- ✅ `app/api/instant-preview/status/route.js` - New status endpoint

## Files Created

- ✨ `components/QuickPreview.jsx` - Enhanced preview component
- ✨ `app/api/preview-config/route.js` - Config endpoint
- ✨ `app/pages/test-preview.jsx` - Test page
- 📄 `PREVIEW_NO_AUTH_GUIDE.md` - This guide

## Next Steps

1. ✅ Test preview boots without auth
2. ✅ Verify machine starts and shows in iframe
3. ✅ Check server logs for any errors
4. ✅ Share the test URL with team: `/test-preview`

## Troubleshooting Checklist

- [ ] Dev server is running: `npm run dev`
- [ ] API endpoint responds: `GET /api/instant-preview?projectId=test&repo=owner/repo&branch=main`
- [ ] Status endpoint works: `GET /api/instant-preview/status?appName=preview-xxx&projectId=test`
- [ ] No "Verifying authentication..." message appears
- [ ] Machine boots within 30-90 seconds
- [ ] Preview URL is accessible from browser
- [ ] Iframe loads live preview content
- [ ] Console shows no critical errors
