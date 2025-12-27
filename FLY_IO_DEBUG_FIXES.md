# Fly.io Preview Debug Fixes

## Problem
Machines were running on Fly.io but showed no logs or proper output from the dev server. The issue was multi-layered:

### Root Causes Identified and Fixed

1. **Hardcoded Port (3001)** ❌ → ✅
   - **Issue**: Machine services were hardcoded to use port 3001, but the actual dev servers use port 3000 (Node) or other ports
   - **Fix**: Updated `lib/flyio-deployment.js` to use `contract.port` instead of hardcoded 3001
   - **Location**: Line 375 in `lib/flyio-deployment.js`

2. **Missing Contract Passing** ❌ → ✅
   - **Issue**: The `deployToFlyIO` function wasn't being passed the runtime contract needed to start the dev server
   - **Fix**: Updated `app/api/fly-preview/route.js` to detect project type and pass contract to deployment
   - **Result**: Boot script now has all the information needed (npm/python/ruby commands, port, env vars)

3. **Incomplete Boot Script** ❌ → ✅
   - **Issue**: Boot script output wasn't being properly captured; dev server might crash silently
   - **Fixes in `lib/fly-preview-deployer.js`**:
     - Added proper HOST=0.0.0.0 binding for dev server
     - Added environment variable logging for debugging
     - Improved output buffering with `2>&1` redirection
     - Added error handling: if dev server fails, keep container alive so we can inspect logs

4. **Missing Diagnostics** ❌ → ✅
   - **Issue**: No way to check if setup was working without deploying a full app
   - **Fix**: Created two new diagnostic endpoints:
     - `/api/fly-preview-logs?appId=xxx` - Fetch actual machine logs from Fly.io
     - `/api/fly-preview-test?type=all` - Test all system components

## Changes Made

### 1. Core Deployment Logic
**File**: `lib/flyio-deployment.js`
- Fixed machine service port configuration to use `contract.port`
- Added restart policy for failed machines
- Added resource allocation (1GB RAM, shared CPU)

### 2. Boot Script Generation
**File**: `lib/fly-preview-deployer.js`
- Added HOST=0.0.0.0 to ensure dev server binds to all interfaces
- Added environment variable logging for debugging
- Improved output handling with proper stderr/stdout redirection
- Added error handling: container stays alive if dev server crashes

### 3. Preview App Initialization
**File**: `app/api/fly-preview/route.js`
- Added project type detection before deployment
- Added contract loading/generation from repository
- Now passes contract to `deployToFlyIO` function
- Proper error handling and logging

### 4. New Diagnostic Endpoints
**File**: `app/api/fly-preview-logs/route.js`
- Fetch actual machine logs from Fly.io Machines API
- Usage: `GET /api/fly-preview-logs?appId=<app-id>`

**File**: `app/api/fly-preview-test/route.js`
- System diagnostics endpoint
- Tests: Fly.io config, Supabase config, preview apps, latest app status
- Usage: `GET /api/fly-preview-test?type=all`

### 5. Authentication Fix
**File**: `components/SyncedFlyPreview.jsx` & `components/AuthProvider.jsx`
- Fixed auth loading race condition
- Ensures session is loaded before accessing preview
- Better error messages for authentication issues

## What Should Happen Now

✅ **When you deploy a preview:**
1. GitHub repo is cloned correctly
2. Dependencies install with proper error handling
3. Dev server starts on the configured port (3000 for Node, 8000 for Python, etc.)
4. All output is captured and visible in Fly.io logs
5. Service properly maps internal port to HTTP endpoints
6. You can view real-time logs from machines

## Testing the Fixes

### Test 1: Check System Status
```bash
# Open your app and navigate to:
# GET /api/fly-preview-test

# This will show:
# - ✅ Fly.io API token configured
# - ✅ Supabase database connected
# - ✅ Preview apps in database
# - ✅ Latest app deployment status
```

### Test 2: Get Machine Logs
```bash
# After creating a preview:
# GET /api/fly-preview-logs?appId=<app-id-from-status-tab>

# This will return:
# - Boot script output (echo statements)
# - Dependency installation logs
# - Dev server startup output
# - Any errors that occurred
```

### Test 3: Manual Deploy Test
1. Go to Status tab
2. Click "Deploy to Fly.io"
3. Select a simple Node.js repository
4. Watch the deployment (should show logs now)
5. Use `/api/fly-preview-logs` endpoint to verify logs are captured

## Environment Variables to Verify

Make sure these are set:
```bash
NEXT_FLY_IO_TOKEN=<your-fly-io-api-token>  # Required
FLY_IO_TOKEN=<your-fly-io-api-token>       # Backup
```

Check the status with `/api/fly-preview-test`

## Next Steps

1. **Verify Fixes**: Run a test deployment and check logs
2. **Monitor Machines**: Check Fly.io dashboard to see if boot script is running
3. **Debug if needed**: Use `/api/fly-preview-logs` to see exact error messages
4. **Optimize**: Adjust boot script timeout if needed (currently 5-30 seconds)

## Troubleshooting

### Still no logs?
1. Check `/api/fly-preview-test` output
2. Verify Fly.io token is valid
3. Check machine state in Fly.io dashboard
4. Look for "dev server exited" message in logs

### Dev server not binding to port?
- Check boot script logs for "Port:" line
- Verify contract.port matches dev server configuration
- Look for "Starting development server on 0.0.0.0:PORT"

### Repository clone failing?
- Check GitHub token is valid
- Verify repository is public or token has access
- Check branch name is correct
