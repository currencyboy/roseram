# Preview Error Diagnostics Guide

## Quick Reference: Error Messages & Solutions

### ❌ "No branch selected or created yet"

**What it means:** You haven't selected or created a working branch yet.

**Quick fix:**
1. Go to the **Status** tab
2. Look for "Create Working Branch" button
3. Click it and wait for completion
4. Return to Preview tab

**Console clue:**
```
[QuickPreview] Configuration error: No branch selected or created yet
currentBranch is null/undefined
```

---

### ❌ "Branch information is incomplete"

**What it means:** The branch object is missing `owner`, `repo`, or `name` field.

**This usually means:**
- You're using an old cached branch from localStorage
- Repository context wasn't properly initialized
- There's a state synchronization issue

**Quick fix:**
1. Clear browser localStorage: Open DevTools → Application → Storage → Clear All
2. Refresh the page
3. Go to Status tab and create a fresh branch
4. Return to Preview tab

**Console clue:**
```
[QuickPreview] Invalid branch data: {name: "branch-name"}
// Missing owner or repo field
```

---

### ❌ "Repository information not available"

**What it means:** The `repository` context wasn't populated.

**This usually means:**
- Repository wasn't properly loaded from GitHub
- Context provider isn't working
- Session/auth issue

**Quick fix:**
1. Go to Status tab
2. Click "Connect GitHub" if not connected
3. Select a repository
4. Wait for page to load
5. Return to Preview tab

**Console clue:**
```
[QuickPreview] Configuration error: Repository information not available
repository is null/undefined
```

---

### ❌ "Network error: Is the server running?"

**What it means:** The API request failed at the network level.

**This usually means:**
- Dev server crashed or stopped
- Network connectivity issue
- Firewall/proxy blocking request

**Quick fix:**
1. Check dev server: `npm run dev` should show "ready on http://localhost:3000"
2. Check network in DevTools → Network tab
3. Make sure you're on the right URL (localhost:3000)
4. Try refreshing the page

**Console clue:**
```
[QuickPreview] Boot error: {
  error: "Network error: ...",
  stack: "fetch error at ...",
  projectId: "...",
  currentBranch: {...}
}
```

---

### ❌ "API returned 400: Bad Request"

**What it means:** Your request had invalid parameters.

**This usually means:**
- `projectId`, `repo`, or `branch` parameter is malformed
- Special characters in branch name
- Missing query parameter

**Quick fix:**
1. Check browser console for the exact request URL
2. Verify branch name doesn't have special characters
3. Try a simple branch name (alphanumeric + dashes/underscores)
4. If still failing, clear localStorage and try again

**Console clue:**
```
[QuickPreview] Fetching from URL: /api/instant-preview?projectId=...&repo=owner/repo&branch=...
// Check if parameters look right
```

---

### ❌ "API returned 500: Internal Server Error"

**What it means:** The server encountered an error processing your request.

**This usually means:**
- GitHub API failed
- Supabase connection issue
- Fly.io API issue
- Missing environment variable

**Quick fix:**
1. Check server logs: `npm run dev` output should show the error
2. Look for mentions of "Supabase", "GitHub", or "Fly.io"
3. Verify environment variables are set
4. Try again after a few seconds (might be temporary)

**Console clue:**
```
[QuickPreview] Boot error: API returned 500: Internal Server Error
// Check server logs for details
```

---

### ❌ "Invalid JSON response from API"

**What it means:** The server returned data that wasn't valid JSON.

**This usually means:**
- Server crashed and returned an error page (HTML instead of JSON)
- Middleware is interfering with response
- Character encoding issue

**Quick fix:**
1. Open DevTools → Network tab
2. Click on the `/api/instant-preview` request
3. Look at the "Response" tab
4. If it's HTML instead of JSON, server is crashing
5. Check server logs in terminal

**Console clue:**
```
[QuickPreview] Boot error: Invalid JSON response from API: Unexpected token '<'
// The '<' suggests HTML response instead of JSON
```

---

### ❌ "No preview URL returned from API"

**What it means:** The API responded successfully but didn't include `previewUrl` or `appName`.

**This usually means:**
- API logic is broken
- Response format changed
- Database record wasn't created

**Quick fix:**
1. Check server logs for warnings about preview app creation
2. Verify Supabase connection is working
3. Check database for `fly_preview_apps` table
4. Try again - might be a one-time glitch

**Console clue:**
```
[QuickPreview] Machine boot initiated: Invalid API response: {
  success: true,
  status: "launching",
  // Missing appName and previewUrl
}
```

---

### ❌ "Failed to check preview status after 5 attempts"

**What it means:** The status polling failed multiple times.

**This usually means:**
- Server is down
- Status endpoint is broken
- Network is unstable
- Fly.io API unreachable

**Quick fix:**
1. Click "Try Again" button
2. If it fails again, check server logs
3. Verify Fly.io token is set in environment
4. Check server connectivity

**Console clue:**
```
[QuickPreview] Poll error: timeout (or network error)
// Repeated 5 times, then:
[QuickPreview] Failed to check preview status after 5 attempts
```

---

## Debugging Workflow

### Step 1: Check Browser Console
```javascript
// Open DevTools (F12) → Console tab
// Look for [QuickPreview] or [EnhancedPreview] messages
// Copy the full error message
```

### Step 2: Check Network Tab
```
Open DevTools → Network tab
Look for /api/instant-preview request
Check Status: should be 200 for success
Check Response: should be JSON
Check Request URL: verify parameters look right
```

### Step 3: Check Server Logs
```bash
# Terminal where npm run dev is running
# Look for error messages
# Common ones: GitHub error, Supabase error, Fly.io error
# Copy the full error message
```

### Step 4: Identify the Error Type
- **Configuration error** (branch/repo missing) → Setup issue
- **Network error** → Server/connectivity issue
- **API error (400, 500)** → Request/server issue
- **Polling error** → Status endpoint issue

### Step 5: Apply the Fix
See "Quick Reference" above for your specific error type

---

## Common Error Patterns

### Pattern: "...already running"
```
[QuickPreview] Machine boot initiated: appName: "preview-xxx"
[EnhancedPreview] Preview error: Preview is already running
```
**Fix:** This is actually OK! Your preview is reusing an existing machine. You can just wait for it to load.

---

### Pattern: "Fly.io not configured"
```
[QuickPreview] Boot error: Fly.io is not configured. Please set FLY_IO_TOKEN.
```
**Fix:** Add `FLY_IO_TOKEN` to your `.env.local` or environment variables. See your admin for the token.

---

### Pattern: "GitHub token not available"
```
[QuickPreview] Boot error: ... Could not detect project type, using default ...
```
**Fix:** Make sure GitHub token is set. Not critical (uses default), but should be configured for best results.

---

### Pattern: "Timeout after X attempts"
```
[QuickPreview] Poll timeout after 120 attempts, assuming machine is ready
```
**Fix:** This is expected behavior. Machine takes time to boot. It should eventually load.

---

## Environment Variable Checklist

If you keep seeing server errors, check these are set:

```bash
# Required for preview to work
NEXT_FLY_IO_TOKEN=FlyV1 xxx...
FLY_IO_TOKEN=FlyV1 xxx...

# Required for repo detection  
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=github_pat_xxx
GITHUB_ACCESS_TOKEN=github_pat_xxx

# Required for database
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=eyJ...
```

---

## Quick Diagnostic Command

Paste this in browser console to check your setup:

```javascript
// Check if browser can reach the API
fetch('/api/instant-preview?projectId=test&repo=test/test&branch=test')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    if (data.error) console.error('API Error:', data.error);
    if (data.success) console.log('API is working!');
  })
  .catch(err => console.error('Network Error:', err.message));

// Check current branch/repo state
const branch = localStorage.getItem('roseram_branch_sync');
console.log('Saved branch data:', JSON.parse(branch || '{}'));
```

---

## Getting Help

If you've tried all fixes and still see errors:

1. **Collect information:**
   - Full error message from console
   - Server logs output
   - Environment variables being used
   - Steps to reproduce

2. **Check if it's a known issue:**
   - See "Common Error Patterns" above
   - Check recent commits for related changes

3. **Debug the specific endpoint:**
   - For fetch errors: Check API endpoint code
   - For polling errors: Check status endpoint code
   - For config errors: Check BranchSyncContext

4. **Ask for help:**
   - Share the console error message
   - Share the server logs
   - Share steps to reproduce
   - Include the diagnostic command output

---

## File Locations for Debugging

| Error Type | Check File |
|-----------|-----------|
| Fetch/Boot errors | `components/QuickPreview.jsx` line 40-150 |
| Configuration errors | `components/EnhancedPreview.jsx` line 40-60 |
| API/Status errors | `app/api/instant-preview/route.js` |
| Polling errors | `app/api/instant-preview/status/route.js` |
| Branch/Context issues | `lib/branch-sync-context.jsx` |

---

**Remember:** The error message is your friend! It should tell you exactly what went wrong. Read it carefully before asking for help. 📖
