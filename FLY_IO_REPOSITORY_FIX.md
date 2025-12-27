# Fly.io Preview - Repository URL Fix

## Problem Found
The preview deployment was deploying the **wrong repository** because:

1. **Schema mismatch** - API was querying for `repository_url` but database had `repository_name`
2. **Missing branch detection** - Wasn't reusing existing deployments for the same branch
3. **Incorrect app naming** - App names didn't reflect the actual branch being deployed
4. **Workflow didn't clone correct repo** - GitHub Actions was checking out the wrong repository

**Example of the bug:**
- User opened project: `roseram-edit-176541960297-6uutd9`
- System deployed: `belonio2793-currencyph` (wrong!)

---

## Fixes Applied

### 1. Fixed `app/api/fly-preview/route.js`

**Changes:**
- ✅ Now queries for both `repository_url` AND `github_url` (handles both old and new schemas)
- ✅ Properly fetches `working_branch` from projects table
- ✅ **Detects existing deployments** for the same branch and reuses them (prevents duplicates)
- ✅ Generates app names that include the branch: `roseram-abc123-roseram`
- ✅ Stores the **correct repository URL** in `fly_preview_apps`
- ✅ Sets status to `pending` (was incorrectly `queued`)

**Key code:**
```javascript
const repositoryUrl = project.repository_url || project.github_url;
const workingBranch = project.working_branch || project.github_branch || 'main';

// Check if already deployed for this branch - REUSE IT
const { data: existingPreviewForBranch } = await supabaseServer
  .from('fly_preview_apps')
  .select('*')
  .eq('project_id', projectId)
  .eq('github_branch', workingBranch)
  .eq('user_id', user.id)
  .eq('status', 'running')
  .single();

if (existingPreviewForBranch) {
  return NextResponse.json({
    success: true,
    app: { ... },
    reused: true,
  });
}
```

### 2. Fixed `app/api/deploy-preview/route.js`

**Changes:**
- ✅ Passes the **full repository URL** (`app.github_repo_url`) to GitHub Actions
- ✅ Improved logging to show what inputs are being sent

**Key code:**
```javascript
const payload = {
  owner,
  repo,
  workflow_id: 'deploy-preview.yml',
  inputs: {
    appName: app.fly_app_name,
    repoUrl: app.github_repo_url, // ← Full URL, not just owner/repo
    branch: app.github_branch,
  },
};

await octokit.rest.actions.createWorkflowDispatch(payload);
```

### 3. Fixed `.github/workflows/deploy-preview.yml`

**Changes:**
- ✅ **Clones the correct repository** using the full URL passed from deploy-preview
- ✅ All subsequent steps run from the cloned directory (`/tmp/preview-repo`)
- ✅ Runs `flyctl deploy` from the correct repository directory

**Key code:**
```yaml
- name: Clone target repository
  run: |
    REPO_URL="${{ github.event.inputs.repoUrl }}"
    REPO_URL="${REPO_URL%.git}"
    git clone --depth 1 --branch "${{ github.event.inputs.branch }}" "$REPO_URL" /tmp/preview-repo
    cd /tmp/preview-repo

- name: Install dependencies
  run: |
    cd /tmp/preview-repo
    npm ci --omit=dev

- name: Deploy to Fly.io
  run: |
    cd /tmp/preview-repo
    flyctl deploy --app ${{ github.event.inputs.appName }} --remote-only --no-cache
```

---

## Deployment Flow (Fixed)

```
User clicks "Start Server"
    ↓
GET /api/fly-preview?projectId=roseram-edit-...
    ↓
API queries public.projects for:
  - repository_url (e.g., https://github.com/user/repo.git)
  - working_branch (e.g., roseram-edit-176541960297-6uutd9)
    ↓
API checks if deployment exists for this branch/project
    ↓
If exists → RETURN EXISTING (reuse machine)
If new → CREATE new record
    ↓
API calls /api/deploy-preview with appId
    ↓
deploy-preview endpoint:
  - Gets the fly_preview_apps record
  - Extracts github_repo_url (FULL URL, not just name)
  - Triggers GitHub Actions with:
    * appName: roseram-abc123-roseram
    * repoUrl: https://github.com/belonio2793/currencyph.git (CORRECT!)
    * branch: roseram-edit-176541960297-6uutd9
    ↓
GitHub Actions Workflow:
  - Clones: git clone --depth 1 --branch [BRANCH] [REPO_URL]
  - Installs: npm ci
  - Builds: npm run build
  - Deploys: flyctl deploy --app [APP_NAME]
    ↓
Fly.io receives correct code from correct repository
    ↓
Preview URL becomes available
```

---

## What Still Needs Testing

1. **Verify the projects table** has the correct `repository_url` values:
   ```sql
   SELECT id, name, repository_url, working_branch 
   FROM public.projects 
   WHERE name LIKE 'roseram-edit%'
   LIMIT 5;
   ```

2. **Test end-to-end deployment:**
   - Open a project with a valid GitHub repository
   - Click "Start Server" in preview
   - Check that:
     - ✓ Record created in `fly_preview_apps` with correct `github_repo_url`
     - ✓ GitHub Actions workflow triggered
     - ✓ Workflow clones the CORRECT repository
     - ✓ Deployment succeeds
     - ✓ Preview loads with the correct code

3. **Test reuse logic:**
   - Start server for project A
   - Wait for deployment to complete (status = running)
   - Click "Start Server" again for same project
   - Should see: `"reused": true` in response
   - Should NOT trigger a new deployment

4. **Run validation script:**
   ```bash
   node scripts/test-preview-deployment.js
   ```

---

## Possible Remaining Issues

### If deployment still fails:

1. **Wrong repo still cloning?**
   - Check GitHub Actions logs
   - Verify `repoUrl` input being received
   - Example: `echo "Repo: ${{ github.event.inputs.repoUrl }}"`

2. **Deployment times out?**
   - Check that repository has:
     - ✓ Valid `package.json`
     - ✓ `npm run dev` or `npm start` script
     - ✓ Listening on port 3000
   - Check GitHub Actions logs for build errors

3. **404 on preview URL?**
   - Check Fly.io app status: `flyctl status --app [APP_NAME]`
   - Check logs: `flyctl logs --app [APP_NAME]`
   - Verify app is actually running

### If branch detection fails:

- Verify `working_branch` is set in `public.projects`
- Check that the branch exists in GitHub
- Ensure branch name doesn't have special characters

---

## Files Modified

| File | Change |
|------|--------|
| `app/api/fly-preview/route.js` | ✅ Fixed repository URL & branch handling, added reuse logic |
| `app/api/deploy-preview/route.js` | ✅ Pass full repo URL to workflow |
| `.github/workflows/deploy-preview.yml` | ✅ Clone correct repo, run from cloned directory |
| `scripts/test-preview-deployment.js` | ✅ NEW: Validation script |
| `FLY_IO_REPOSITORY_FIX.md` | ✅ NEW: This document |

---

## Success Criteria

Your fix is working correctly when:

✅ `fly_preview_apps.github_repo_url` contains full GitHub URL  
✅ `fly_preview_apps.github_branch` contains the actual branch name  
✅ GitHub Actions receives correct `repoUrl` and `branch` inputs  
✅ GitHub clones from that URL successfully  
✅ Deployment deploys code from correct repository  
✅ Preview loads with correct application  
✅ Reuse logic prevents duplicate deployments  

---

## Next: Test It

1. **Run the validation script:**
   ```bash
   node scripts/test-preview-deployment.js
   ```

2. **Check your database:**
   ```sql
   SELECT github_repo_url, github_branch, preview_url, status 
   FROM fly_preview_apps 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Test a real preview:**
   - Create/select a project
   - Click "Start Server"
   - Monitor GitHub Actions logs
   - Verify correct repo is cloned

---

## Reference: What Changed in Detail

### Before Fix:
```javascript
// WRONG: Only had repository_url, would fail if only repository_name existed
const { data: project } = await supabaseServer
  .from('projects')
  .select('id, repository_url, working_branch, name')
  .eq('id', projectId)
  .single();

// WRONG: No reuse logic - always created new deployments
// WRONG: App name didn't include branch
const appName = generatePreviewAppName(user.id, projectId);

// WRONG: Might store wrong URL or miss branch
github_repo_url: project.repository_url,
github_branch: branch,
```

### After Fix:
```javascript
// RIGHT: Handles both old and new schemas
const repositoryUrl = project.repository_url || project.github_url;
const workingBranch = project.working_branch || project.github_branch || 'main';

// RIGHT: Checks for existing deployments first
const { data: existingPreviewForBranch } = await supabaseServer
  .from('fly_preview_apps')
  .select('*')
  .eq('project_id', projectId)
  .eq('github_branch', workingBranch)
  .eq('status', 'running')
  .single();

if (existingPreviewForBranch) {
  return NextResponse.json({ app: {...}, reused: true });
}

// RIGHT: Include branch in app name
const appName = `${generatePreviewAppName(user.id, projectId)}-${workingBranch.slice(0, 8)}`;

// RIGHT: Store the correct values
github_repo_url: repositoryUrl,
github_branch: workingBranch,
```

---

## Questions?

Refer to:
- `FLY_IO_QUICK_START.md` - Quick start guide
- `FLY_IO_DEPLOYMENT_COMPLETE.md` - Complete documentation
- `FLY_IO_DIAGNOSTIC_CHECKLIST.md` - Debugging guide
