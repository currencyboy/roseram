# Fly.io Deployment Debugging & Setup Guide

## Current Status

The preview system has been upgraded to use **real Fly.io deployments** instead of mock instances. Each preview now creates an actual Fly.io VM that can execute your code.

## Architecture

### Deployment Flow

```
User requests preview
    ↓
GET /api/fly-preview?projectId=xxx
    ↓
Create database record in fly_preview_apps
    ↓
triggerDeploymentBackground() (non-blocking)
    ↓
deployToFlyIO() creates Fly.io app and triggers deployment
    ↓
Poll machine status every 5 seconds
    ↓
Machine starts → Status: "running"
    ↓
User can access https://{appName}.fly.dev
```

### New Deployment Module

**`lib/flyio-deployment.js`** - Real Fly.io API client:
- Creates Fly.io apps via GraphQL API
- Sets environment variables and secrets
- Allocates IPv4 addresses
- Monitors deployment status
- Destroys apps on cleanup

**Key Functions:**
- `deployToFlyIO(appName, gitRepo, branch, envVars)` - Deploy app
- `getDeploymentStatus(appName)` - Check machine status
- `destroyDeployment(appName)` - Destroy app
- `isFlyIOConfigured()` - Check if token exists

## Prerequisites

### 1. Fly.io Account & Organization

You need:
- Fly.io account at https://fly.io
- Personal organization or team organization
- Organization ID (usually "personal" for personal accounts)

### 2. API Token

Generate token:
1. Go to https://fly.io/user/personal/tokens
2. Click "Create Deployment Token"
3. Copy the token value
4. Set environment variable:
   ```bash
   NEXT_FLY_IO_TOKEN=<your-token>
   ```
   or
   ```bash
   FLY_IO_TOKEN=<your-token>
   ```

### 3. GitHub Token

Required for Fly.io to access your repository:
```bash
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=<github-token>
```

## Troubleshooting

### Issue: "Fly.io is not configured"

**Symptoms:** Error message about missing Fly.io configuration

**Cause:** Environment variable not set

**Solution:**
```bash
# Set the token
export NEXT_FLY_IO_TOKEN='<your-token>'

# Or in .env file
echo "NEXT_FLY_IO_TOKEN=<your-token>" >> .env.local
```

Then restart the dev server.

### Issue: Preview URL returns 404/Timeout

**Symptoms:** 
- Preview loads at `https://{appName}.fly.dev`
- Shows 404 or Connection timeout
- App never responds

**Causes:**
1. Machine hasn't started yet (takes 10-30 seconds)
2. Build failed (dependency installation failed)
3. App crashed after start
4. Port not properly exposed

**Solutions:**

**Check 1: Verify machine is running**
```bash
curl https://api.fly.io/graphql \
  -H "Authorization: Bearer $NEXT_FLY_IO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetApp($name: String!) { appByName(name: $name) { machines(first: 1) { nodes { state } } } }",
    "variables": { "name": "roseram-abc123" }
  }'
```

Expected response should show `state: "started"` or `state: "running"`

**Check 2: View deployment logs**
```bash
# List recent deployments
curl https://api.fly.io/graphql \
  -H "Authorization: Bearer $NEXT_FLY_IO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetApp($name: String!) { appByName(name: $name) { deployments(first: 5) { nodes { status } } } }",
    "variables": { "name": "roseram-abc123" }
  }'
```

**Check 3: Monitor database status**
```sql
-- Check preview app status in database
SELECT 
  id,
  fly_app_name,
  status,
  error_message,
  created_at,
  updated_at
FROM fly_preview_apps
ORDER BY created_at DESC
LIMIT 10;
```

**Check 4: Review build process**
The build requires:
1. `Dockerfile` exists ✓
2. `package.json` has build script ✓
3. `npm run build` succeeds
4. `npm run start` works

If build fails, check:
- Node.js version compatibility
- Missing dependencies
- TypeScript compilation errors
- Build environment variables

### Issue: "Deployment stuck in 'deployed' state"

**Symptoms:**
- Status shows "deployed" but machine never reaches "running"
- Preview URL unreachable for several minutes
- App doesn't appear in Fly.io dashboard

**Cause:** Machine starting is delayed or failed

**Solution:**
1. Check Fly.io dashboard: https://fly.io/dashboard
2. Look for your app (search: "roseram-")
3. Check Machines section - see machine state
4. Check Logs tab for error messages
5. If machine failed, destroy and retry

### Issue: "Permission denied" or "Unauthorized"

**Symptoms:**
- Error about API token invalid
- "Authorization failed" in logs
- Cannot create/list apps

**Solutions:**

**Check 1: Token format**
```bash
# Token should start with 'FlyV1'
echo $NEXT_FLY_IO_TOKEN | head -c 20
# Should print: FlyV1 fm2_...
```

**Check 2: Token permissions**
- Go to https://fly.io/user/personal/tokens
- Verify token scope includes "Deployments" and "Machines"
- Token might have expired - regenerate

**Check 3: Rate limiting**
- If many tokens attempted, wait 10 minutes
- Check if API is up: https://status.fly.io

### Issue: "App already exists"

**Symptoms:**
- Trying to create preview but app name already in use
- Conflict error from Fly.io

**Cause:** Previous preview app wasn't cleaned up

**Solutions:**

**Option 1: Manual cleanup via Fly CLI**
```bash
fly apps destroy roseram-abc123
```

**Option 2: Via API**
```bash
curl -X DELETE https://api.fly.io/apps/roseram-abc123 \
  -H "Authorization: Bearer $NEXT_FLY_IO_TOKEN"
```

**Option 3: In database**
```sql
UPDATE fly_preview_apps
SET status = 'destroyed'
WHERE fly_app_name = 'roseram-abc123';
```

### Issue: App name too long or invalid

**Symptoms:**
- Error about app name format
- "Invalid app name" error

**Cause:** Generated app name exceeds 32 characters or contains invalid chars

**Why it happens:**
```javascript
// App name format: roseram-{hash}-{branch}
// Max 32 chars total
appName = `${generateHash(userId, projectId)}-${branch.slice(0, 8)}`
```

**Solutions:**

1. Use shorter branch name
2. Repository with very long branch names might fail
3. Rename branch: `git branch -m oldname shortname`

## Monitoring & Metrics

### Check all preview apps

```sql
SELECT 
  id,
  project_id,
  fly_app_name,
  status,
  error_message,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM fly_preview_apps
WHERE status != 'destroyed'
ORDER BY created_at DESC;
```

### Check failed deployments

```sql
SELECT 
  id,
  fly_app_name,
  error_message,
  created_at
FROM fly_preview_apps
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 20;
```

### Cleanup stale deployments

```sql
-- Delete deployments older than 7 days
DELETE FROM fly_preview_apps
WHERE status IN ('stopped', 'destroyed')
AND created_at < NOW() - INTERVAL '7 days';
```

## Performance Tips

### 1. Reduce polling frequency

The poller checks machine state every 5 seconds. For many apps:
```javascript
// In triggerDeploymentBackground()
}, 10000); // Change from 5000 to 10000 (10 seconds)
```

### 2. Set machine minimum specs

In `templates/fly.toml.template`:
```toml
[[vm]]
  memory = "512mb"  # Reduce from 1gb for simple apps
  cpu_kind = "shared"
  cpus = 1
```

### 3. Auto-stop machines

Machines auto-stop after 15 minutes of no activity:
```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
```

### 4. Batch status updates

Current implementation updates DB per app. For many apps, batch updates:
```javascript
// Update multiple app statuses in one query
await supabaseServer
  .from('fly_preview_apps')
  .update({ status: 'running' })
  .in('id', appIds);
```

## Testing Deployment

### Manual test

```javascript
// In browser console or Node REPL
const { deployToFlyIO } = await import('./lib/flyio-deployment.js');

await deployToFlyIO(
  'roseram-test-123',
  'https://github.com/belonio2793/currencyph',
  'main',
  { PROJECT_ID: 'test' }
);
```

### Check logs

```bash
# Show real-time logs from dev server
npm run dev 2>&1 | grep -i "fly\|deploy\|machine"
```

## Common Success Indicators

### ✅ App created successfully
- Database record shows `status: 'deployed'`
- Fly.io dashboard shows app
- Machine appears in Fly.io UI

### ✅ Machine starting
- `status: 'deployed'` → polling begins
- Logs show "Machine polling" messages
- Fly.io dashboard shows machine state changing

### ✅ Ready to preview
- `status: 'running'` in database
- `https://{appName}.fly.dev` responds
- Health check passes (if configured)

## Advanced Debugging

### Enable verbose logging

```javascript
// In lib/flyio-deployment.js
// Add before requests:
console.log('Fly.io Request:', { query, variables });
console.log('Response:', data);
```

### Trace GraphQL queries

```bash
# Check request format
curl https://api.fly.io/graphql \
  -H "Authorization: Bearer $NEXT_FLY_IO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { viewer { email } }"
  }' | jq
```

### Inspect database records

```sql
-- Get full app record
SELECT * FROM fly_preview_apps
WHERE fly_app_name = 'roseram-abc123'\G

-- Check env variables stored
SELECT env_variables FROM fly_preview_apps
WHERE fly_app_name = 'roseram-abc123'\G
```

## Next Steps

1. **Verify token is set**: Check environment variables
2. **Test endpoint**: Call `/api/fly-preview?projectId=test`
3. **Check database**: Verify record is created
4. **Monitor Fly.io**: Watch dashboard during deployment
5. **Check logs**: Look for error messages in dev server output

## Related Files

- `app/api/fly-preview/route.js` - Main preview endpoint
- `lib/flyio-deployment.js` - Fly.io client implementation
- `lib/errors.js` - Error types
- `templates/fly.toml.template` - VM configuration template
- `FLYIO_INTEGRATION_SETUP.md` - Original setup guide

## Support

For Fly.io-specific issues:
- Docs: https://fly.io/docs/
- Status: https://status.fly.io/
- Community: https://community.fly.io/

For app-specific issues:
- Check Dockerfile compatibility
- Verify build process works locally
- Review GitHub Actions logs
