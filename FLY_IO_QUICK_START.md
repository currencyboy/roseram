# Fly.io Preview - Quick Start Checklist ⚡

## What's Been Fixed ✅

1. **Authentication** - User session validation now works correctly
2. **Database Schema** - `fly_preview_apps` table ready in Supabase
3. **API Endpoints** - `/api/fly-preview` and `/api/deploy-preview` configured
4. **GitHub Actions** - Workflow template ready at `.github/workflows/deploy-preview.yml`
5. **Error Messages** - Better troubleshooting guidance throughout

---

## Get Started in 5 Minutes

### Step 1: Apply Database Migration (2 min)

Go to your Supabase dashboard:

1. **SQL Editor** → **New Query**
2. Copy the SQL from: `supabase/migrations/add_fly_preview_apps.sql`
3. **Run** (should see "Query successful")

**Verify it worked:**
```sql
SELECT * FROM fly_preview_apps LIMIT 1;
-- Should return empty table (no errors)
```

### Step 2: Add GitHub Secret (1 min)

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name:** `FLY_API_TOKEN`
   - **Value:** (paste your Fly.io token from environment variables)

### Step 3: Test Preview Deployment (2 min)

1. Create a test project with a GitHub repository
2. Go to **Coding Environment** → **Preview**
3. Click **"Start Server"**
4. You should see:
   - Loading states with app name
   - Then "Deploying to Fly.io..."
   - Finally a live preview URL

**Expected Flow:**
```
Start Server
  ↓ (1 sec)
"Creating preview app..." (status: pending)
  ↓ (2 sec)
"Deploying to Fly.io..." (status: initializing)
  ↓ (30-120 sec)
Live preview appears (status: running)
```

---

## Environment Variables (Already Set)

Verify these are in your `.env` or environment:

```
✓ FLY_IO_TOKEN=FlyV1 fm2_...
✓ NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=github_pat_...
✓ NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
✓ NEXT_PUBLIC_SUPABASE_ANON=eyJhbGc...
✓ SUPABASE_SERVICE_ROLE=eyJhbGc...
```

If any are missing, add them in the Settings/Environment tab.

---

## What Happens Behind the Scenes

```
1. User clicks "Start Server"
   ↓
2. App creates record in fly_preview_apps (status: pending)
   ↓
3. Component triggers /api/deploy-preview endpoint
   ↓
4. Endpoint updates status to "initializing"
   ↓
5. Endpoint triggers GitHub Actions workflow
   ↓
6. GitHub Actions:
   - Clones your repository
   - Runs: npm install && npm run build && npm run dev
   - Deploys to Fly.io
   ↓
7. Component polls fly_preview_apps every 5 seconds
   ↓
8. When status changes to "running", preview loads
```

---

## Troubleshooting

### Error: "Authentication failed"
**Cause:** User not signed in  
**Fix:** Sign in first, then try again

### Error: "No start script found"
**Cause:** package.json missing "dev" or "start" script  
**Fix:** Add to package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "start": "node server.js"
  }
}
```

### Error: "Workflow file not found"
**Cause:** `.github/workflows/deploy-preview.yml` doesn't exist  
**Fix:** The file has been created - commit and push it to GitHub

### Error: "Permission denied" (GitHub)
**Cause:** GitHub token doesn't have workflow permissions  
**Fix:** 
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Make sure token has `actions:write` scope
3. Or use a new token with more permissions

### Deployment times out (after 10 minutes)
**Cause:** Fly.io deployment taking too long  
**Fix:** 
1. Check Fly.io dashboard for actual deployment status
2. Look at GitHub Actions logs (repo → Actions tab)
3. Increase timeout in FlyPreview component if needed

### Preview shows 404
**Cause:** App deployed but not responding  
**Fix:**
1. Verify app is actually running: `flyctl apps list`
2. Check logs: `flyctl logs --app roseram-abc123`
3. Make sure dev server listens on port 3000

---

## Database Schema

The `fly_preview_apps` table tracks:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Unique identifier |
| project_id | UUID | Links to project |
| user_id | UUID | Links to user (auth) |
| fly_app_name | TEXT | App name on Fly.io (roseram-abc123) |
| github_repo_url | TEXT | Repository URL |
| github_branch | TEXT | Branch to deploy |
| preview_url | TEXT | Live preview URL (https://roseram-abc123.fly.dev) |
| status | TEXT | pending → initializing → running |
| error_message | TEXT | Error details if status=error |
| created_at | TIMESTAMP | When record created |
| updated_at | TIMESTAMP | When last updated |

**Security:** Row-Level Security (RLS) enabled - users only see their own apps.

---

## Performance Expectations

| Metric | Expected |
|--------|----------|
| App creation | < 1 second |
| GitHub Actions trigger | < 2 seconds |
| Deployment time | 30-120 seconds |
| Total time to live | 1-2 minutes |
| Polling interval | 5 seconds |
| Max polling time | 10 minutes |

---

## Test Checklist

- [ ] Database migration applied successfully
- [ ] GitHub secret (FLY_API_TOKEN) added
- [ ] Environment variables verified
- [ ] Created a test project with GitHub repo
- [ ] Clicked "Start Server" and saw loading states
- [ ] Preview URL was generated (roseram-xxxxx.fly.dev)
- [ ] Deployment started (GitHub Actions triggered)
- [ ] Deployment completed (checked Fly.io dashboard)
- [ ] Live preview loaded in iframe

---

## Next Steps

### If Everything Works ✅
Great! Your Fly.io preview system is live. Now:
1. Test with more projects
2. Monitor Fly.io dashboard for costs
3. Adjust resource limits if needed

### If Something's Broken 🚨
1. **Check logs:**
   - Browser console (F12)
   - GitHub Actions (repo → Actions → deploy-preview)
   - Supabase logs
   - Fly.io logs: `flyctl logs --app roseram-xxxxx`

2. **Common fixes:**
   - Refresh page
   - Sign out and back in
   - Clear browser cache
   - Check environment variables

3. **Get help:**
   - Review `FLY_IO_DEPLOYMENT_COMPLETE.md` for details
   - Check Fly.io docs: https://fly.io/docs/
   - GitHub Actions docs: https://docs.github.com/en/actions

---

## Cost Estimate

Once deployed:
- ~$3-5/month per active preview app
- ~$0.50/month per stopped app
- Bandwidth + compute charges on top
- Can be reduced with reserved capacity

Total for 10 projects: ~$30-50/month

---

## File Locations

Everything has been created for you:

```
✓ supabase/migrations/add_fly_preview_apps.sql  - Database schema
✓ .github/workflows/deploy-preview.yml          - GitHub Actions
✓ app/api/deploy-preview/route.js               - Deployment trigger
✓ lib/fly-deployment.js                         - Fly.io API helpers
✓ components/FlyPreview.jsx                     - Updated component
✓ FLY_IO_DEPLOYMENT_COMPLETE.md                 - Full documentation
```

---

## Support Resources

- **Fly.io Documentation:** https://fly.io/docs/
- **GitHub Actions Guide:** https://docs.github.com/en/actions
- **Supabase RLS:** https://supabase.com/docs/guides/auth
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## Questions?

Refer to the detailed guide: `FLY_IO_DEPLOYMENT_COMPLETE.md`

Common issues and solutions are documented in the **Troubleshooting** section above.
