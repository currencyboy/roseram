# Fly.io Diagnostic Checklist

Use this checklist to diagnose and fix issues with your Fly.io preview deployment system.

---

## Quick Diagnostics Command

Run this to automatically check your setup:

```bash
node scripts/check-fly-setup.js
```

This will verify:
- ✓ Environment variables
- ✓ Database migration file
- ✓ API endpoints
- ✓ GitHub Actions workflow
- ✓ All required files

---

## Step-by-Step Debugging

### Step 1: Environment Variables

**Check if variables are set:**

```bash
# In your terminal
echo $FLY_IO_TOKEN
echo $NEXT_PUBLIC_GITHUB_ACCESS_TOKEN
echo $NEXT_PUBLIC_SUPABASE_URL
```

**Expected:** Should show values (not empty)

**If empty:**
- Check `.env` file exists
- Verify Settings → Environment variables in your IDE
- Make sure values are pasted correctly (no spaces)

---

### Step 2: Database Setup

**Check if table exists:**

1. Go to Supabase dashboard
2. SQL Editor → New Query
3. Run:
   ```sql
   SELECT COUNT(*) as record_count FROM fly_preview_apps;
   ```

**Expected:** Returns 0 (empty table, no error)

**If table not found error:**
- Go to SQL Editor → New Query
- Copy entire SQL from `supabase/migrations/add_fly_preview_apps.sql`
- Run it
- Should see "success"

**If it says "already exists":**
- Run this to verify structure:
   ```sql
   \d fly_preview_apps
   ```
- Should show columns: id, project_id, user_id, fly_app_name, etc.

---

### Step 3: Authentication

**Test user session:**

1. In your browser, go to your app
2. Open Dev Tools (F12)
3. Go to Application → Local Storage
4. Look for a key like `auth-user` or `sb-` prefix
5. Check if it has a value

**Expected:** Should show a JSON object with user info

**If empty:**
- Sign out completely
- Sign back in
- Refresh the page
- Try again

**If still empty:**
- Check browser is accepting cookies
- Try incognito/private window
- Clear browser cache

---

### Step 4: API Endpoints

**Test the fly-preview endpoint:**

1. Open Dev Tools (F12) → Network tab
2. Click "Start Server" in preview
3. Look for request to `/api/fly-preview`

**Expected response (if successful):**
```json
{
  "success": true,
  "app": {
    "id": "uuid-here",
    "projectId": "project-uuid",
    "appName": "roseram-abc123",
    "previewUrl": "https://roseram-abc123.fly.dev",
    "status": "pending"
  }
}
```

**Expected response (if auth fails):**
```json
{
  "error": "Authentication failed",
  "guidance": "Please ensure you are signed in."
}
```

**If you see a different error:**
- Check the error message
- Look for detailed information
- Search for that error in the Troubleshooting section below

---

### Step 5: GitHub Actions

**Check if workflow file exists:**

1. Go to your GitHub repo
2. Find `.github/workflows/deploy-preview.yml`
3. Should exist and be readable

**Check if workflow triggers:**

1. Go to repo → Actions tab
2. Look for "Deploy Preview to Fly.io" workflow
3. Check recent runs

**If no runs:**
- Make sure file is committed and pushed
- Workflow might not have triggered yet
- Check that GitHub secret is set

**If runs exist but failed:**
- Click on the failed run
- Look at logs
- Check these common errors:

---

### Step 6: Fly.io Account

**Verify Fly.io is working:**

Run in terminal:
```bash
flyctl auth whoami
```

**Expected:** Shows your Fly.io username

**If error "not logged in":**
```bash
# Login to Fly.io
flyctl auth login
# Or use token
flyctl auth token
```

**Check app creation:**

```bash
# List all apps
flyctl apps list
```

**Expected:** Should show apps (might be empty if new)

**Check app status:**

```bash
# Get status of specific app
flyctl status --app roseram-abc123
```

---

### Step 7: Supabase RLS Policies

**Check if RLS is blocking access:**

1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Run (as authenticated user):
   ```sql
   SELECT * FROM fly_preview_apps 
   WHERE user_id = auth.uid() 
   LIMIT 1;
   ```

**Expected:** Returns empty (or your records if any)

**If "permission denied" error:**
- RLS policies might be too strict
- Check this:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'fly_preview_apps';
   ```
- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE

---

## Common Issues & Fixes

### Issue: "Authentication failed" Error

**Scenario:** See error when clicking "Start Server"

**Check list:**
- [ ] User is signed in (not just page viewed)
- [ ] Session token is being sent in request headers
- [ ] Token is valid and not expired
- [ ] Supabase auth is configured

**Fix:**
```javascript
// In browser console, check session:
console.log(sessionStorage); // or localStorage
// Should show auth data

// Or in a React component:
const { session } = useAuth();
console.log('Session:', session);
```

**Solution:**
1. Sign out completely
2. Refresh page
3. Sign back in
4. Try again

---

### Issue: "No package.json" Error

**Scenario:** Error says "package.json not found"

**Causes:**
- Repository URL is wrong
- Repository is private (token doesn't have access)
- Package.json is not in root directory

**Fixes:**
1. **Verify repository URL:**
   - Go to your GitHub repo
   - Copy HTTPS URL (should be `https://github.com/user/repo.git`)
   - Check it's correct in your project settings

2. **Check repository access:**
   - Make sure repository is public OR
   - GitHub token has `repo` scope
   - Token has access to private repos if needed

3. **Check package.json location:**
   - Must be in root of repository
   - Not in subdirectory

---

### Issue: GitHub Workflow Not Triggering

**Scenario:** Click "Start Server", but GitHub Actions doesn't trigger

**Check list:**
- [ ] `.github/workflows/deploy-preview.yml` exists and is committed
- [ ] File is readable (not blocked by .gitignore)
- [ ] GitHub token has `actions:write` scope
- [ ] `FLY_API_TOKEN` secret is set in GitHub

**Verify secret is set:**
1. Go to repo → Settings → Secrets and variables → Actions
2. Look for `FLY_API_TOKEN`
3. Should be there and have a value

**Verify token scope:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click on the token used
3. Check it has `actions:write` scope

**Fix:**
1. Add the secret if missing
2. Update token scope if needed
3. Trigger a test deployment again

---

### Issue: Deployment Stuck on "Initializing"

**Scenario:** Status never changes from "initializing" to "running"

**Check list:**
- [ ] GitHub Actions job is running (check Actions tab)
- [ ] Job hasn't timed out (default 30 minutes)
- [ ] Repository has valid `package.json` with dev script
- [ ] Fly.io account has capacity to create apps

**Check GitHub Actions logs:**
1. Go to repo → Actions
2. Find "Deploy Preview to Fly.io" run
3. Click on it
4. Expand job logs
5. Look for errors

**Common job failures:**
- `npm install` failed → check package.json syntax
- `npm run dev` failed → check dev script in package.json
- `flyctl deploy` failed → check Fly.io logs

**Fix:**
1. **Check package.json is valid:**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build"
     }
   }
   ```

2. **Test deploy manually:**
   ```bash
   git clone your-repo
   cd your-repo
   npm install
   npm run dev
   # Should start without errors
   ```

3. **Check Fly.io logs:**
   ```bash
   flyctl logs --app roseram-abc123
   ```

---

### Issue: Preview URL Returns 404

**Scenario:** Status is "running" but clicking URL shows 404

**Causes:**
- App deployed but not listening on correct port
- App crashed after deployment
- Proxy config is wrong

**Check if app is running:**
```bash
# SSH into app
flyctl ssh console --app roseram-abc123

# Or check logs
flyctl logs --app roseram-abc123
```

**Common fixes:**
1. **Port must be 3000:**
   ```javascript
   // In your app code
   app.listen(3000) // ← Must be 3000
   app.listen(process.env.PORT || 3000) // ← Or use PORT env var
   ```

2. **Environment variables:**
   - Fly.io automatically sets `PORT=3000`
   - Check app uses it correctly

3. **Check app logs:**
   ```bash
   flyctl logs --app roseram-abc123 --follow
   ```

---

### Issue: Database Migration Fails

**Scenario:** Can't apply SQL migration in Supabase

**Check list:**
- [ ] Logged in as Supabase admin
- [ ] Using correct project
- [ ] SQL syntax is valid
- [ ] No conflicting tables/policies

**If "already exists" error:**
- Table already created
- Run this to check:
   ```sql
   SELECT * FROM fly_preview_apps LIMIT 1;
   ```
- If it works, migration already applied

**If "permission denied":**
- Might not be logged in as admin
- Or wrong role
- Try running as authenticated user

---

## Logs to Check

### Browser Console Logs
```javascript
// Open F12 → Console
// Look for any errors when clicking "Start Server"
// Should see successful API calls to /api/fly-preview
```

### GitHub Actions Logs
```
1. Go to repo → Actions
2. Find "Deploy Preview to Fly.io" workflow
3. Click the failed run
4. Look at job logs
5. Search for "error" or "failed"
```

### Fly.io Logs
```bash
# Terminal
flyctl logs --app roseram-abc123 --follow

# Or in dashboard: roseram-abc123 → Monitoring → Logs
```

### Supabase Logs
```
1. Dashboard → Logs (bottom left)
2. Filter by errors
3. Look for RLS policy issues or connection errors
```

---

## Quick Fix Checklist

Print this and check items as you debug:

```
[ ] Environment variables are set (FLY_IO_TOKEN, GITHUB_TOKEN, etc.)
[ ] Signed in to the application
[ ] Database migration applied in Supabase
[ ] GitHub secret (FLY_API_TOKEN) is set
[ ] Repository has package.json with dev script
[ ] .github/workflows/deploy-preview.yml exists and is committed
[ ] Fly.io account exists and can create apps
[ ] GitHub token has correct scopes (repo, actions)
[ ] RLS policies exist on fly_preview_apps table
[ ] Checked GitHub Actions logs for errors
[ ] Checked Fly.io logs for runtime errors
```

---

## Getting More Help

### If above doesn't work:

1. **Run diagnostic:**
   ```bash
   node scripts/check-fly-setup.js
   ```

2. **Review documentation:**
   - Quick start: `FLY_IO_QUICK_START.md`
   - Complete guide: `FLY_IO_DEPLOYMENT_COMPLETE.md`

3. **Check external resources:**
   - Fly.io docs: https://fly.io/docs/
   - GitHub Actions: https://docs.github.com/en/actions
   - Supabase: https://supabase.com/docs/

4. **Gather information:**
   - Error messages (exact text)
   - Steps to reproduce
   - What you've already tried
   - Relevant logs

---

## Verify Success

Your setup is working correctly when:

✅ User clicks "Start Server"  
✅ Status shows "pending"  
✅ Status changes to "initializing"  
✅ GitHub Actions job starts (visible in Actions tab)  
✅ Fly.io app is created (visible in flyctl apps list)  
✅ Status changes to "running"  
✅ Preview URL loads in iframe  
✅ You can interact with the deployed app

If all these happen, you're done! 🎉

---

## Reference: Expected File Structure

```
your-project/
├── .github/
│   └── workflows/
│       └── deploy-preview.yml (✓ Should exist)
├── app/
│   └── api/
│       ├── fly-preview/
│       │   └── route.js (✓ Should exist)
│       ├── deploy-preview/
│       │   └── route.js (✓ Should exist)
│       └── preview-instance/
│           └── route.js (✓ Should exist)
├── supabase/
│   └── migrations/
│       └── add_fly_preview_apps.sql (✓ Should exist)
├── lib/
│   └── fly-deployment.js (✓ Should exist)
├── components/
│   └── FlyPreview.jsx (✓ Should exist)
└── scripts/
    └── check-fly-setup.js (✓ Should exist)
```

All files should be present and committed to git.
