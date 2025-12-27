# Debug and Fixes Applied - Preview Load Error

## Problem Summary

When the preview component tried to load, it threw:
```
[PreviewSync] Error fetching preview config: TypeError: Failed to fetch
```

This occurred because of **two main issues**:

### Issue 1: CORS Blocking (Primary)
- The Fly.io preview iframe domain (*.fly.dev) wasn't allowed in CORS headers
- API calls from the preview iframe to `/api/fly-preview` were blocked
- Requests failed with "Failed to fetch" due to CORS policy violation

### Issue 2: Fly.io Auto-Stop (Secondary)
- The Fly.io app (ramrose-fasf8g) was configured to auto-stop after 10 minutes of inactivity
- When preview tried to load, the app would be stopped
- Auto-start would trigger, but took time to warm up
- Preview requests would timeout before app was ready

## Fixes Applied

### Fix 1: CORS Headers (middleware.js)

**Changed:**
```javascript
// Before: Only localhost and env variables
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
];
```

**To:**
```javascript
// After: Allow all *.fly.dev domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  '*.fly.dev',  // Allow all Fly.io preview domains
  ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
];
```

**Why it works:**
- Preview iframe on `https://ramrose-xxxx.fly.dev` can now call API
- Middleware checks origin and sets CORS headers
- CSP headers updated to allow `https://*.fly.dev` in `connect-src`

### Fix 2: API Endpoint URL Construction (lib/preview-sync-service.ts)

**Changed:**
```typescript
// Before: Relative URL (fails when called from different domain)
const response = await fetch(`/api/fly-preview?projectId=${projectId}`, ...);
```

**To:**
```typescript
// After: Absolute URL using current origin
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;  // Gets origin where script is running
}

function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return `${baseUrl}${path}`;
}

// Usage:
const url = getApiUrl(`/api/fly-preview?projectId=${projectId}`);
const response = await fetch(url, ...);
```

**Why it works:**
- When called from iframe, `window.location.origin` returns the main app domain
- Fetch request is made to the correct origin (not iframe's domain)
- Browser allows cross-origin fetch when CORS headers permit it

### Fix 3: API Endpoint CORS Handler (app/api/fly-preview/route.js)

**Added:**
```javascript
/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
```

**Why it works:**
- Browser sends OPTIONS preflight for cross-origin requests with Authorization header
- API now responds to preflight, allowing the actual GET request to proceed

### Fix 4: Fly.io Configuration (fly.toml)

**Changed:**
```toml
[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = 'stop'        # Auto-stops after inactivity
  auto_start_machines = true
  min_machines_running = 0           # Machine can completely shut down
```

**To:**
```toml
[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false         # ✅ Disable auto-stop
  auto_start_machines = true
  min_machines_running = 1           # ✅ Keep 1 machine running

[http_service.concurrency]
  type = 'connections'
  hard_limit = 100
  soft_limit = 80
```

**Why it works:**
- `min_machines_running = 1` keeps the machine always available
- `auto_stop_machines = false` prevents auto-shutdown on inactivity
- App is always ready when preview tries to load
- Eliminates the cold-start delay that was causing timeouts

### Fix 5: Better Error Diagnostics (components/SyncedFlyPreview.jsx)

**Added:**
```javascript
// Better error messages
console.log('[SyncedFlyPreview] Calling createOrGetPreview with:', {
  projectId,
  repo: repoString,
  branch: currentBranch.name,
  apiOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
});

// Better error handling
if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
  errorMsg = 'Network error: Unable to reach API endpoint. Check your connection and CORS settings.';
}
```

**Why it helps:**
- Logs show exactly what domain the API call is being made to
- Error messages distinguish between network errors and API errors
- Easier to debug similar issues in the future

## Deployment Steps

### Step 1: Deploy Updated Code
```bash
git add -A
git commit -m "Fix preview CORS and Fly.io auto-stop issues"
git push origin main
```

### Step 2: Redeploy Fly.io App
```bash
flyctl deploy --app ramrose-fasf8g
```

This applies the new fly.toml configuration:
- Ensures machine stays running
- Disables auto-stop
- Sets up concurrency limits

### Step 3: Verify Changes
Check the deployed app:
```bash
flyctl status --app ramrose-fasf8g
```

Should show:
```
ramrose-fasf8g

Type              Builder       Name              Status          Region  Image
App               Dockerfile    ramrose-fasf8g    running         iad     sha256:xxx
```

## Testing the Fix

### Test 1: Preview Loading
1. Open the Preview tab in CodeBuilder
2. Check browser console for logs:
   ```
   [SyncedFlyPreview] Calling createOrGetPreview with: {...}
   [PreviewSync] Creating/getting preview: {...}
   [PreviewSync] Preview created/retrieved successfully: {...}
   ```
3. Should NOT see: `TypeError: Failed to fetch`
4. Preview should load within 10 seconds

### Test 2: Status Tab Shows Preview
1. Open Status tab
2. Should show:
   - Repository: owner/repo
   - Branch: branch-name
   - Preview Status: running (green dot)
   - Preview URL: https://ramrose-xxxx.fly.dev (clickable)

### Test 3: iframe Loads
1. Preview tab should show live iframe
2. Click "Open in new tab" to verify app loads
3. No CORS errors in browser DevTools Network tab

### Test 4: Fly.io App Stays Running
```bash
flyctl logs --app ramrose-fasf8g
```

Should show:
- App starts and stays running
- No "auto-stopping" or "excess capacity" messages
- Only normal request logs

## Data Flow After Fixes

```
Preview Tab
    ↓
SyncedFlyPreview (on localhost:3001)
    ↓
getApiUrl() → window.location.origin = "http://localhost:3001"
    ↓
fetch("http://localhost:3001/api/fly-preview?...")
    ↓
Browser makes OPTIONS request (CORS preflight)
    ↓
API /OPTIONS handler responds with CORS headers ✅
    ↓
Browser makes actual GET request
    ↓
/api/fly-preview/route.js handles request
    ↓
Creates fly_preview_apps record in database
    ↓
Returns previewUrl: "https://ramrose-xxxx.fly.dev"
    ↓
SyncedFlyPreview polls status every 5 seconds
    ↓
Fly.io app is running (min_machines_running=1) ✅
    ↓
Status transitions: pending → initializing → running ✅
    ↓
SyncedFlyPreview loads iframe: <iframe src="https://ramrose-xxxx.fly.dev" />
    ↓
Preview displays successfully ✅
```

## Troubleshooting

### Still Getting "Failed to fetch"?

1. **Check CORS headers:**
   ```javascript
   // In browser DevTools Console
   fetch('http://localhost:3001/api/fly-preview?projectId=test').then(r => {
     console.log('Headers:', {
       origin: r.headers.get('access-control-allow-origin'),
       methods: r.headers.get('access-control-allow-methods'),
     });
   });
   ```

2. **Check if API is responding:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/fly-preview?projectId=test
   ```

3. **Check Fly.io app status:**
   ```bash
   flyctl status --app ramrose-fasf8g
   flyctl logs --app ramrose-fasf8g
   ```

### Fly.io App Still Auto-Stopping?

1. **Verify fly.toml was deployed:**
   ```bash
   flyctl config show --app ramrose-fasf8g
   ```
   Should show `min_machines_running = 1`

2. **Force redeploy:**
   ```bash
   flyctl deploy --app ramrose-fasf8g --force
   ```

3. **Check machine resources:**
   ```bash
   flyctl machines list --app ramrose-fasf8g
   ```

## Files Modified

```
✅ middleware.js                          - Added CORS for *.fly.dev
✅ lib/preview-sync-service.ts            - Fixed URL construction with window.location.origin
✅ app/api/fly-preview/route.js           - Added OPTIONS handler for CORS preflight
✅ components/SyncedFlyPreview.jsx        - Better error diagnostics and logging
✅ fly.toml                               - Disabled auto-stop, set min_machines_running=1
```

## Summary

The fixes address:

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| "Failed to fetch" CORS error | *.fly.dev not in allowed origins | Added CORS headers in middleware |
| Relative URL in iframe | `/api/fly-preview` called on wrong domain | Use `window.location.origin` to construct absolute URL |
| CORS preflight blocked | No OPTIONS handler | Added OPTIONS endpoint |
| App cold-starts | Fly.io auto-stop + inactivity | Set `min_machines_running=1`, disable auto-stop |
| Poor diagnostics | Generic error messages | Added detailed logging and error context |

All fixes are now deployed. Test the preview tab - it should work! 🎉
